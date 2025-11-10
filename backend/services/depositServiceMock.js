/**
 * Mock version of Deposit Service for testing
 * Same logic but with mocked database
 */

const { ethers } = require('ethers');
const CCTPService = require('./cctpService');
const LiFiService = require('./lifiService');

// Mock database
const mockDb = {
  deposits: [],
  addresses: [],
  balances: [],
  
  query: async function(sql, params) {
    console.log('Mock DB:', sql.split('\n')[0].trim() + '...');
    
    if (sql.includes('SELECT * FROM deposit_addresses')) {
      return { rows: this.addresses.filter(a => 
        a.user_id === params[0] && a.chain_id === params[1]
      )};
    }
    
    if (sql.includes('INSERT INTO deposit_addresses')) {
      const address = {
        id: this.addresses.length + 1,
        user_id: params[0],
        chain_id: params[1],
        address: params[2],
        created_at: new Date()
      };
      this.addresses.push(address);
      return { rows: [address] };
    }
    
    if (sql.includes('INSERT INTO deposits')) {
      const deposit = {
        id: this.deposits.length + 1,
        user_id: params[0],
        chain_id: params[1],
        deposit_address: params[2],
        tx_hash: params[3],
        amount: params[4],
        token: params[5],
        status: 'pending',
        created_at: new Date()
      };
      this.deposits.push(deposit);
      return { rows: [deposit] };
    }
    
    if (sql.includes('UPDATE deposits')) {
      const deposit = this.deposits.find(d => d.id === params[1]);
      if (deposit) deposit.status = params[0];
      return { rows: [] };
    }
    
    if (sql.includes('INSERT INTO user_balances')) {
      const balance = {
        user_id: params[0],
        chain_id: params[1],
        token: params[2],
        balance: params[3]
      };
      this.balances.push(balance);
      return { rows: [balance] };
    }
    
    return { rows: [] };
  }
};

class DepositServiceMock {
  constructor() {
    this.cctp = new CCTPService();
    this.lifi = new LiFiService();
    this.depositWatchers = new Map();
    this.db = mockDb; // Use mock instead of real db
  }

  async initialize() {
    console.log('🚀 Initializing Deposit Service...');
    await this.cctp.initialize();
    await this.lifi.initialize();
    console.log('✅ Deposit Service ready');
  }

  async generateDepositAddress(userId, chainId) {
    try {
      const existing = await this.db.query(
        'SELECT * FROM deposit_addresses WHERE user_id = $1 AND chain_id = $2',
        [userId, chainId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      const depositAddress = this.generateDeterministicAddress(userId, chainId);

      const result = await this.db.query(
        `INSERT INTO deposit_addresses (user_id, chain_id, address, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [userId, chainId, depositAddress]
      );

      this.startMonitoring(depositAddress, chainId, userId);
      return result.rows[0];

    } catch (error) {
      console.error('Error generating deposit address:', error);
      throw error;
    }
  }

  async getBestRoute(params) {
    const { fromChain, toChain, token, amount } = params;

    try {
      const quotes = await Promise.allSettled([
        this.getCCTPQuote(params),
        this.getLiFiQuote(params)
      ]);

      const validQuotes = quotes
        .filter(q => q.status === 'fulfilled' && q.value.success)
        .map(q => q.value);

      if (validQuotes.length === 0) {
        throw new Error('No valid routes found');
      }

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

  async getCCTPQuote(params) {
    const { fromChain, toChain, token, amount } = params;

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

  async getLiFiQuote(params) {
    const { fromChain, toChain, token, amount, fromAddress, toAddress } = params;

    const quote = await this.lifi.getQuote({
      fromChain,
      toChain,
      fromToken: token,
      toToken: token,
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

  startMonitoring(address, chainId, userId) {
    console.log(`👁️ Monitoring deposits for ${address} on chain ${chainId}`);
    
    this.depositWatchers.set(`${chainId}-${address}`, {
      userId,
      chainId,
      address,
      startedAt: new Date()
    });
  }

  async processDeposit(params) {
    const { userId, chainId, address, txHash, amount, token } = params;

    try {
      const deposit = await this.db.query(
        `INSERT INTO deposits 
         (user_id, chain_id, deposit_address, tx_hash, amount, token, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING *`,
        [userId, chainId, address, txHash, amount, token]
      );

      const userSettings = await this.getUserSettings(userId);
      
      if (userSettings.auto_bridge) {
        const route = await this.getBestRoute({
          fromChain: chainId,
          toChain: userSettings.preferred_chain,
          token,
          amount
        });

        await this.initiateBridge({
          depositId: deposit.rows[0].id,
          route
        });
      } else {
        await this.creditBalance(userId, chainId, token, amount);
      }

      await this.db.query(
        'UPDATE deposits SET status = $1 WHERE id = $2',
        ['completed', deposit.rows[0].id]
      );

      return deposit.rows[0];

    } catch (error) {
      console.error('Error processing deposit:', error);
      throw error;
    }
  }

  async getUserSettings(userId) {
    return {
      auto_bridge: false,
      preferred_chain: 137
    };
  }

  async creditBalance(userId, chainId, token, amount) {
    await this.db.query(
      `INSERT INTO user_balances (user_id, chain_id, token, balance)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chain_id, token)
       DO UPDATE SET balance = user_balances.balance + $4`,
      [userId, chainId, token, amount]
    );
  }

  generateDeterministicAddress(userId, chainId) {
    const hash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [userId, chainId]
      )
    );
    return ethers.utils.getAddress('0x' + hash.slice(-40));
  }

  async getDepositHistory(userId, limit = 10) {
    return this.db.deposits.filter(d => d.user_id === userId).slice(-limit);
  }

  async getAggregatedBalance(userId) {
    return this.db.balances.filter(b => b.user_id === userId);
  }
}

module.exports = DepositServiceMock;