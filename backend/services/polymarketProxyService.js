const axios = require('axios');
const ethers = require('ethers');
const db = require('../config/database');
const logger = require('../utils/logger');
const { Connection, PublicKey } = require('@solana/web3.js');

class PolymarketProxyService {
  constructor() {
    // Polymarket CLOB endpoints
    this.clobApiUrl = 'https://clob.polymarket.com';
    this.clobWsUrl = 'wss://ws-subscriptions-clob.polymarket.com/ws/';
    
    // Polygon RPC for transaction monitoring
    this.polygonRpc = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.provider = new ethers.JsonRpcProvider(this.polygonRpc);
    
    // Solana connection for APES balance checking
    this.solanaConnection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    // APES token mint address
    this.apesTokenMint = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
    
    // Fee tiers based on APES holdings
    this.feeTiers = [
      { minApes: 100000, feeRate: 0.002 },  // 0.2% for 100k+ APES
      { minApes: 50000, feeRate: 0.003 },   // 0.3% for 50k+ APES
      { minApes: 10000, feeRate: 0.005 },   // 0.5% for 10k+ APES
      { minApes: 1000, feeRate: 0.0075 },   // 0.75% for 1k+ APES
      { minApes: 0, feeRate: 0.01 }         // 1% for < 1k APES
    ];
    
    // Initialize API client
    this.apiClient = axios.create({
      baseURL: this.clobApiUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // CLOB service for real orders (when available)
    this.clobService = null;
    this.useCLOB = process.env.USE_POLYMARKET_CLOB === 'true';
  }

  /**
   * Initialize the service
   */
  async initialize() {
    logger.info('🔷 Initializing Polymarket Proxy Service');
    
    // Initialize CLOB service if enabled
    if (this.useCLOB && process.env.POLYMARKET_API_KEY) {
      try {
        const clobService = require('./polymarketClobService');
        await clobService.initialize(
          process.env.POLYMARKET_API_KEY,
          process.env.POLYMARKET_API_SECRET,
          process.env.POLYMARKET_PASSPHRASE,
          process.env.POLYGON_ADDRESS
        );
        this.clobService = clobService;
        logger.info('✅ CLOB service initialized');
      } catch (error) {
        logger.error('Failed to initialize CLOB service:', error);
        this.useCLOB = false;
      }
    }
    
    // Test Polymarket connection
    try {
      const response = await this.apiClient.get('/');
      logger.info('✅ Polymarket CLOB connection established');
    } catch (error) {
      logger.error('Failed to connect to Polymarket CLOB:', error.message);
    }
    
    // Load proxy wallets from database
    await this.loadProxyWallets();
    
    logger.info('✅ Polymarket Proxy Service initialized');
  }

  /**
   * Get user's APES token balance
   */
  async getApesBalance(solanaWallet) {
    try {
      const walletPubkey = new PublicKey(solanaWallet);
      
      // Get token accounts for this wallet
      const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: this.apesTokenMint }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      // Get balance from first token account
      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      logger.error('Error fetching APES balance:', error);
      return 0;
    }
  }

  /**
   * Calculate fee rate based on APES holdings
   */
  calculateFeeRate(apesBalance) {
    for (const tier of this.feeTiers) {
      if (apesBalance >= tier.minApes) {
        return tier.feeRate;
      }
    }
    return this.feeTiers[this.feeTiers.length - 1].feeRate;
  }

  /**
   * Get market details from Polymarket
   */
  async getMarket(marketId) {
    try {
      const response = await this.apiClient.get(`/markets/${marketId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching market:', error);
      throw new Error('Failed to fetch market details');
    }
  }

  /**
   * Get order book for a market
   */
  async getOrderBook(tokenId) {
    try {
      const response = await this.apiClient.get(`/book`, {
        params: { token_id: tokenId }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching order book:', error);
      throw new Error('Failed to fetch order book');
    }
  }

  /**
   * Place order on behalf of user
   */
  async placeOrder(userId, orderParams) {
    try {
      const user = await this.getUser(userId);
      const apesBalance = await this.getApesBalance(user.solana_wallet);
      const feeRate = this.calculateFeeRate(apesBalance);
      
      // Calculate platform fee
      const orderSize = parseFloat(orderParams.size);
      const platformFee = orderSize * feeRate;
      const netOrderSize = orderSize - platformFee;
      
      // Get proxy wallet for this user
      const proxyWallet = await this.getProxyWallet(userId);
      
      // If CLOB service is available, use it
      if (this.clobService) {
        try {
          // Create signer from proxy wallet
          const signer = new ethers.Wallet(proxyWallet.privateKey, this.provider);
          
          // Create order using CLOB service
          const signedOrder = await this.clobService.createOrder(signer, {
            tokenId: orderParams.tokenId,
            side: orderParams.side,
            price: orderParams.price,
            size: netOrderSize.toString(),
            orderType: orderParams.orderType || 0, // GTC by default
            expiration: orderParams.expiration
          });
          
          // Submit order to CLOB
          const response = await this.clobService.submitOrder(signedOrder);
          
          // Record order in database
          await this.recordOrder({
            user_id: userId,
            polymarket_order_id: response.order_id,
            market_id: orderParams.marketId,
            token_id: orderParams.tokenId,
            side: orderParams.side,
            size: orderSize,
            price: orderParams.price,
            platform_fee: platformFee,
            fee_rate: feeRate,
            apes_balance: apesBalance,
            status: 'PENDING',
            created_at: new Date()
          });
          
          // Subscribe to order updates
          this.clobService.orderCallbacks.set(response.order_id, async (update) => {
            await this.handleOrderUpdate(response.order_id, update);
          });
          
          // Record platform fee
          await this.recordPlatformFee(userId, platformFee, 'polymarket_order');
          
          return {
            success: true,
            orderId: response.order_id,
            fee: platformFee,
            feeRate: feeRate,
            savings: (0.01 - feeRate) * orderSize,
            netSize: netOrderSize
          };
        } catch (clobError) {
          logger.error('CLOB service error, falling back to direct API:', clobError);
          // Fall through to direct API call
        }
      }
      
      // Fallback to direct API (or mock for now)
      const order = {
        funder: proxyWallet.address,
        tokenID: orderParams.tokenId,
        price: orderParams.price,
        size: netOrderSize,
        side: orderParams.side,
        taker: orderParams.taker || proxyWallet.address,
        nonce: Date.now(),
        expiration: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        orderType: 'GTC' // Good Till Cancelled
      };
      
      // Sign order with proxy wallet
      const signedOrder = await this.signOrder(order, proxyWallet);
      
      // Submit to Polymarket CLOB
      const response = await this.apiClient.post('/order', signedOrder);
      
      // Record order in database
      await this.recordOrder({
        user_id: userId,
        polymarket_order_id: response.data.orderID,
        market_id: orderParams.marketId,
        token_id: orderParams.tokenId,
        side: orderParams.side,
        size: orderSize,
        price: orderParams.price,
        platform_fee: platformFee,
        fee_rate: feeRate,
        apes_balance: apesBalance,
        status: 'PENDING',
        created_at: new Date()
      });
      
      // Record platform fee
      await this.recordPlatformFee(userId, platformFee, 'polymarket_order');
      
      return {
        success: true,
        orderId: response.data.orderID,
        fee: platformFee,
        feeRate: feeRate,
        savings: (0.01 - feeRate) * orderSize,
        netSize: netOrderSize
      };
    } catch (error) {
      logger.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Sign order using EIP712
   */
  async signOrder(order, proxyWallet) {
    // Polymarket uses EIP712 for order signing
    const domain = {
      name: 'Polymarket',
      version: '1',
      chainId: 137, // Polygon
      verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' // CLOB contract
    };
    
    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'taker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'makerAmount', type: 'uint256' },
        { name: 'takerAmount', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'feeRateBps', type: 'uint256' },
        { name: 'side', type: 'uint8' },
        { name: 'signatureType', type: 'uint8' }
      ]
    };
    
    const wallet = new ethers.Wallet(proxyWallet.privateKey);
    const signature = await wallet.signTypedData(domain, types, order);
    
    return {
      ...order,
      signature
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(userId, orderId) {
    try {
      const order = await this.getOrder(userId, orderId);
      
      if (order.status !== 'PENDING') {
        throw new Error('Cannot cancel order in current status');
      }
      
      // If CLOB service is available, use it
      if (this.clobService) {
        try {
          await this.clobService.cancelOrder(order.polymarket_order_id);
        } catch (clobError) {
          logger.error('CLOB cancel error, falling back to direct API:', clobError);
          // Fall through to direct API call
        }
      } else {
        // Cancel on Polymarket direct API
        await this.apiClient.delete(`/order/${order.polymarket_order_id}`);
      }
      
      // Update database
      await db.query(
        'UPDATE polymarket_orders SET status = $1, updated_at = $2 WHERE id = $3',
        ['CANCELLED', new Date(), orderId]
      );
      
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, status = null) {
    try {
      let query = 'SELECT * FROM polymarket_orders WHERE user_id = $1';
      const params = [userId];
      
      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw error;
    }
  }

  /**
   * Get user's positions
   */
  async getUserPositions(userId) {
    try {
      const query = `
        SELECT 
          po.market_id,
          po.token_id,
          SUM(CASE WHEN po.side = 'BUY' THEN po.size ELSE -po.size END) as position_size,
          AVG(po.price) as avg_price,
          SUM(po.platform_fee) as total_fees,
          COUNT(*) as trade_count,
          MAX(po.created_at) as last_trade
        FROM polymarket_orders po
        WHERE po.user_id = $1 
          AND po.status = 'FILLED'
        GROUP BY po.market_id, po.token_id
        HAVING SUM(CASE WHEN po.side = 'BUY' THEN po.size ELSE -po.size END) > 0
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user positions:', error);
      throw error;
    }
  }

  /**
   * Load proxy wallets from database
   */
  async loadProxyWallets() {
    try {
      // Create table if not exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS proxy_wallets (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) UNIQUE,
          address VARCHAR(42) NOT NULL,
          encrypted_private_key TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used TIMESTAMP
        )
      `);
      
      logger.info('Proxy wallets table ready');
    } catch (error) {
      logger.error('Error loading proxy wallets:', error);
    }
  }

  /**
   * Get or create proxy wallet for user
   */
  async getProxyWallet(userId) {
    try {
      // Check if user already has a proxy wallet
      const existing = await db.query(
        'SELECT * FROM proxy_wallets WHERE user_id = $1',
        [userId]
      );
      
      if (existing.rows.length > 0) {
        // Decrypt private key
        const wallet = existing.rows[0];
        wallet.privateKey = this.decryptPrivateKey(wallet.encrypted_private_key);
        return wallet;
      }
      
      // Create new proxy wallet
      const newWallet = ethers.Wallet.createRandom();
      const encryptedKey = this.encryptPrivateKey(newWallet.privateKey);
      
      await db.query(
        `INSERT INTO proxy_wallets (user_id, address, encrypted_private_key) 
         VALUES ($1, $2, $3)`,
        [userId, newWallet.address, encryptedKey]
      );
      
      return {
        address: newWallet.address,
        privateKey: newWallet.privateKey
      };
    } catch (error) {
      logger.error('Error getting proxy wallet:', error);
      throw error;
    }
  }

  /**
   * Encrypt private key for storage
   */
  encryptPrivateKey(privateKey) {
    const { getEncryptionService } = require('../utils/encryption');
    const encryptionService = getEncryptionService();
    return encryptionService.encrypt(privateKey);
  }

  /**
   * Decrypt private key
   */
  decryptPrivateKey(encryptedData) {
    const { getEncryptionService } = require('../utils/encryption');
    const encryptionService = getEncryptionService();
    return encryptionService.decrypt(encryptedData);
  }

  /**
   * Record order in database
   */
  async recordOrder(orderData) {
    try {
      await db.query(`
        INSERT INTO polymarket_orders (
          user_id, polymarket_order_id, market_id, token_id,
          side, size, price, platform_fee, fee_rate, 
          apes_balance, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        orderData.user_id,
        orderData.polymarket_order_id,
        orderData.market_id,
        orderData.token_id,
        orderData.side,
        orderData.size,
        orderData.price,
        orderData.platform_fee,
        orderData.fee_rate,
        orderData.apes_balance,
        orderData.status,
        orderData.created_at
      ]);
    } catch (error) {
      logger.error('Error recording order:', error);
    }
  }

  /**
   * Record platform fee
   */
  async recordPlatformFee(userId, feeAmount, feeType) {
    try {
      await db.query(`
        INSERT INTO platform_fees (
          user_id, amount, fee_type, created_at
        ) VALUES ($1, $2, $3, $4)
      `, [userId, feeAmount, feeType, new Date()]);
      
      // Update fee distribution pools
      await this.distributeFees(feeAmount);
    } catch (error) {
      logger.error('Error recording platform fee:', error);
    }
  }

  /**
   * Distribute collected fees
   */
  async distributeFees(feeAmount) {
    // Fee distribution:
    // 40% - APES buyback and burn
    // 30% - Development fund
    // 20% - Liquidity providers
    // 10% - Referral rewards
    
    const distributions = {
      buyback: feeAmount * 0.4,
      development: feeAmount * 0.3,
      liquidity: feeAmount * 0.2,
      referral: feeAmount * 0.1
    };
    
    // Record distributions
    for (const [type, amount] of Object.entries(distributions)) {
      await db.query(`
        INSERT INTO fee_distributions (type, amount, status, created_at)
        VALUES ($1, $2, 'pending', $3)
      `, [type, amount, new Date()]);
    }
  }

  /**
   * Get user from database
   */
  async getUser(userId) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }

  /**
   * Get order details
   */
  async getOrder(userId, orderId) {
    const result = await db.query(
      'SELECT * FROM polymarket_orders WHERE user_id = $1 AND id = $2',
      [userId, orderId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    return result.rows[0];
  }

  /**
   * Handle order updates from CLOB
   */
  async handleOrderUpdate(orderId, update) {
    try {
      logger.info(`Order update for ${orderId}:`, update);
      
      // Update database with new status
      await db.query(
        `UPDATE polymarket_orders 
         SET status = $1, updated_at = $2, filled_amount = $3, remaining_amount = $4
         WHERE polymarket_order_id = $5`,
        [
          update.status,
          new Date(),
          update.filled_amount || 0,
          update.remaining_amount || 0,
          orderId
        ]
      );
      
      // If order is filled, distribute fees
      if (update.status === 'FILLED') {
        const order = await db.query(
          'SELECT platform_fee FROM polymarket_orders WHERE polymarket_order_id = $1',
          [orderId]
        );
        
        if (order.rows.length > 0) {
          await this.distributeFees(order.rows[0].platform_fee);
        }
      }
    } catch (error) {
      logger.error('Error handling order update:', error);
    }
  }

  /**
   * Subscribe to market updates
   */
  async subscribeToMarket(marketId, callback) {
    if (!this.clobService) {
      logger.warn('CLOB service not available for market subscription');
      return () => {}; // Return no-op unsubscribe function
    }
    
    return this.clobService.subscribeToMarket(marketId, callback);
  }

  /**
   * Get real-time order book
   */
  async getRealTimeOrderBook(tokenId) {
    if (this.clobService) {
      try {
        return await this.clobService.getOrderbook(tokenId);
      } catch (error) {
        logger.error('Error fetching real-time order book:', error);
      }
    }
    
    // Fallback to regular order book
    return await this.getOrderBook(tokenId);
  }

  /**
   * Calculate statistics
   */
  async getStats() {
    try {
      const stats = {};
      
      // Total volume
      const volumeResult = await db.query(
        'SELECT SUM(size) as total_volume FROM polymarket_orders WHERE status = $1',
        ['FILLED']
      );
      stats.totalVolume = parseFloat(volumeResult.rows[0].total_volume || 0);
      
      // Total fees collected
      const feesResult = await db.query(
        'SELECT SUM(platform_fee) as total_fees FROM polymarket_orders'
      );
      stats.totalFees = parseFloat(feesResult.rows[0].total_fees || 0);
      
      // Active users
      const usersResult = await db.query(
        'SELECT COUNT(DISTINCT user_id) as active_users FROM polymarket_orders WHERE created_at > NOW() - INTERVAL \'30 days\''
      );
      stats.activeUsers = parseInt(usersResult.rows[0].active_users);
      
      // Average APES holdings of users
      const apesResult = await db.query(
        'SELECT AVG(apes_balance) as avg_apes FROM polymarket_orders WHERE created_at > NOW() - INTERVAL \'7 days\''
      );
      stats.avgApesHoldings = parseFloat(apesResult.rows[0].avg_apes || 0);
      
      // CLOB connection status
      stats.clobConnected = this.clobService ? this.clobService.ws?.readyState === 1 : false;
      stats.clobAuthenticated = this.clobService ? this.clobService.isAuthenticated : false;
      
      return stats;
    } catch (error) {
      logger.error('Error calculating stats:', error);
      return {};
    }
  }
}

module.exports = new PolymarketProxyService();