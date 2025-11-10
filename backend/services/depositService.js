/**
 * Unified Deposit Service
 * Tracks cross-chain deposits and routes to appropriate bridges
 * Completely permissionless - no API keys required
 */

const { ethers } = require('ethers');
const CCTPService = require('./cctpService');
const LiFiService = require('./lifiService');
const db = require('../database/db');

class DepositService {
  constructor() {
    this.cctp = new CCTPService();
    this.lifi = new LiFiService();
    this.depositWatchers = new Map();
  }

  /**
   * Initialize all services
   */
  async initialize() {
    console.log('🚀 Initializing Deposit Service...');
    await this.cctp.initialize();
    await this.lifi.initialize();
    console.log('✅ Deposit Service ready');
  }

  /**
   * Generate deposit address for a user and chain
   * @param {string} userId - User ID (wallet address)
   * @param {number} chainId - Chain ID
   * @returns {Object} Deposit address info
   */
  async generateDepositAddress(userId, chainId) {
    try {
      // Validate inputs
      if (!userId || !chainId) {
        throw new Error('User ID and Chain ID are required');
      }

      // Check if deposit address already exists
      const existing = await db.query(
        'SELECT * FROM deposit_addresses WHERE user_id = $1 AND chain_id = $2',
        [userId, chainId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Generate deterministic address based on user ID and chain
      // In production, use HD wallet derivation
      const depositAddress = this.generateDeterministicAddress(userId, chainId);

      // Save to database
      const result = await db.query(
        `INSERT INTO deposit_addresses (user_id, chain_id, address, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [userId, chainId, depositAddress]
      );

      // Start monitoring this address
      this.startMonitoring(depositAddress, chainId, userId);

      return result.rows[0];

    } catch (error) {
      console.error('Error generating deposit address:', error);
      throw error;
    }
  }

  /**
   * Get best route for cross-chain transfer
   * @param {Object} params - Transfer parameters
   * @returns {Object} Best route with quote
   */
  async getBestRoute(params) {
    const { fromChain, toChain, token, amount } = params;

    try {
      // Get quotes from multiple sources
      const quotes = await Promise.allSettled([
        this.getCCTPQuote(params),
        this.getLiFiQuote(params)
      ]);

      // Filter successful quotes
      const validQuotes = quotes
        .filter(q => q.status === 'fulfilled' && q.value.success)
        .map(q => q.value);

      if (validQuotes.length === 0) {
        throw new Error('No valid routes found');
      }

      // Sort by total cost (gas + fees)
      validQuotes.sort((a, b) => {
        const costA = parseFloat(a.totalCostUSD || '999999');
        const costB = parseFloat(b.totalCostUSD || '999999');
        return costA - costB;
      });

      return validQuotes[0];

    } catch (error) {
      console.error('Error getting best route:', error);
      throw error;
    }
  }

  /**
   * Get CCTP quote if supported
   */
  async getCCTPQuote(params) {
    const { fromChain, toChain, token, amount } = params;

    // CCTP only supports USDC
    if (!token.toLowerCase().includes('usdc')) {
      return { success: false, protocol: 'cctp' };
    }

    const quote = await this.cctp.getQuote({
      fromChain,
      toChain,
      amount
    });

    if (quote.supported) {
      return {
        success: true,
        protocol: 'cctp',
        ...quote,
        totalCostUSD: quote.fees.total
      };
    }

    return { success: false, protocol: 'cctp' };
  }

  /**
   * Get LI.FI quote
   */
  async getLiFiQuote(params) {
    const { fromChain, toChain, token, amount, fromAddress, toAddress } = params;

    const quote = await this.lifi.getQuote({
      fromChain,
      toChain,
      fromToken: token,
      toToken: token, // Same token cross-chain
      fromAmount: amount,
      fromAddress: fromAddress || ethers.constants.AddressZero,
      toAddress: toAddress || fromAddress || ethers.constants.AddressZero
    });

    if (quote.success) {
      return {
        success: true,
        protocol: 'lifi',
        ...quote,
        totalCostUSD: quote.summary.gasCost.amount
      };
    }

    return { success: false, protocol: 'lifi' };
  }

  /**
   * Start monitoring a deposit address
   */
  startMonitoring(address, chainId, userId) {
    // In production, use WebSocket or event listeners
    console.log(`👁️ Monitoring deposits for ${address} on chain ${chainId}`);
    
    // Store watcher reference
    this.depositWatchers.set(`${chainId}-${address}`, {
      userId,
      chainId,
      address,
      startedAt: new Date()
    });
  }

  /**
   * Process incoming deposit
   */
  async processDeposit(params) {
    const { userId, chainId, address, txHash, amount, token } = params;

    try {
      // Record deposit in database
      const deposit = await db.query(
        `INSERT INTO deposits 
         (user_id, chain_id, deposit_address, tx_hash, amount, token, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING *`,
        [userId, chainId, address, txHash, amount, token]
      );

      // Check if auto-bridge is enabled for user
      const userSettings = await this.getUserSettings(userId);
      
      if (userSettings.auto_bridge) {
        // Get best route to destination chain
        const route = await this.getBestRoute({
          fromChain: chainId,
          toChain: userSettings.preferred_chain,
          token,
          amount
        });

        // Initiate bridge
        await this.initiateBridge({
          depositId: deposit.rows[0].id,
          route
        });
      } else {
        // Credit balance on current chain
        await this.creditBalance(userId, chainId, token, amount);
      }

      // Update deposit status
      await db.query(
        'UPDATE deposits SET status = $1 WHERE id = $2',
        ['completed', deposit.rows[0].id]
      );

      return deposit.rows[0];

    } catch (error) {
      console.error('Error processing deposit:', error);
      throw error;
    }
  }

  /**
   * Get user deposit settings
   */
  async getUserSettings(userId) {
    // Default settings
    return {
      auto_bridge: false,
      preferred_chain: 137 // Polygon
    };
  }

  /**
   * Credit user balance
   */
  async creditBalance(userId, chainId, token, amount) {
    // Update user balance in database
    await db.query(
      `INSERT INTO user_balances (user_id, chain_id, token, balance)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chain_id, token)
       DO UPDATE SET balance = user_balances.balance + $4`,
      [userId, chainId, token, amount]
    );
  }

  /**
   * Generate deterministic address (simplified for POC)
   */
  generateDeterministicAddress(userId, chainId) {
    // In production, use proper HD wallet derivation
    // Convert userId (wallet address string) to a consistent number
    const userIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(userId));
    const userIdNumber = ethers.BigNumber.from(userIdHash);
    
    const hash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [userIdNumber, chainId]
      )
    );
    return ethers.utils.getAddress('0x' + hash.slice(-40));
  }

  /**
   * Get deposit history for user
   */
  async getDepositHistory(userId, limit = 10) {
    const result = await db.query(
      `SELECT * FROM deposits 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Get aggregated balance across chains
   */
  async getAggregatedBalance(userId) {
    const result = await db.query(
      `SELECT chain_id, token, SUM(balance) as balance
       FROM user_balances
       WHERE user_id = $1
       GROUP BY chain_id, token`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = DepositService;