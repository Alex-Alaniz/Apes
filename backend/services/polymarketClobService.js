/**
 * Polymarket CLOB (Central Limit Order Book) Service
 * Handles real connection to Polymarket's order book
 */

const { ethers } = require('ethers');
const WebSocket = require('ws');
const { logError } = require('../utils/errorHandler');

// Constants
const POLYMARKET_CLOB_URL = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com';
const POLYMARKET_WS_URL = process.env.POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/v2';
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// Order types
const OrderType = {
  GTC: 0,  // Good Till Cancelled
  FOK: 1,  // Fill or Kill
  GTD: 2,  // Good Till Date
  IOC: 3   // Immediate or Cancel
};

const Side = {
  BUY: 'BUY',
  SELL: 'SELL'
};

// EIP-712 Domain for order signing
const EIP712_DOMAIN = {
  name: 'Polymarket',
  version: '1',
  chainId: POLYGON_CHAIN_ID,
  verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' // Exchange contract
};

// EIP-712 Order Type
const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'signatureType', type: 'uint8' }
  ]
};

class PolymarketCLOBService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    this.ws = null;
    this.subscriptions = new Map();
    this.orderCallbacks = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isAuthenticated = false;
    this.apiKey = null;
    this.apiSecret = null;
    this.passphrase = null;
    this.polygonAddress = null;
    this.isConnecting = false;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.connectionPromise = null;
  }

  /**
   * Initialize the service with API credentials
   */
  async initialize(apiKey, apiSecret, passphrase, polygonAddress) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase || process.env.POLYMARKET_PASSPHRASE;
    this.polygonAddress = polygonAddress || process.env.POLYGON_ADDRESS;
    
    // Validate required credentials
    if (!this.apiKey || !this.apiSecret || !this.passphrase) {
      throw new Error('Missing required Polymarket credentials (apiKey, apiSecret, passphrase)');
    }
    
    // Connect WebSocket with error handling
    try {
      await this.connectWebSocket();
      console.log('✅ Polymarket CLOB service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize CLOB service:', error);
      // Don't throw - allow service to work in degraded mode
    }
  }

  /**
   * Connect to Polymarket WebSocket
   */
  async connectWebSocket() {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      return this.connectionPromise;
    }
    
    this.isConnecting = true;
    this.connectionPromise = this._connectWebSocket();
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
    }
    
    return this.connectionPromise;
  }
  
  async _connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing connection
        if (this.ws) {
          this.ws.removeAllListeners();
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
          }
        }
        
        this.ws = new WebSocket(POLYMARKET_WS_URL);
        let connectionTimeout;
        
        this.ws.on('open', () => {
          console.log('✅ Connected to Polymarket WebSocket');
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Authenticate if we have credentials
          if (this.apiKey && this.apiSecret) {
            this.authenticate();
          }
          
          // Resubscribe to previous subscriptions
          this.resubscribe();
          
          resolve();
        });
        
        this.ws.on('message', (data) => {
          this.lastHeartbeat = Date.now();
          this.handleMessage(data);
        });
        
        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          logError(error, { service: 'PolymarketCLOB', event: 'ws_error' });
        });
        
        this.ws.on('close', (code, reason) => {
          console.log(`WebSocket closed: ${code} - ${reason}`);
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          this.isAuthenticated = false;
          
          // Only reconnect if not manually closed
          if (code !== 1000) {
            this.handleReconnect();
          }
        });
        
        this.ws.on('ping', () => {
          this.ws.pong();
        });
        
        this.ws.on('pong', () => {
          this.lastHeartbeat = Date.now();
        });
        
        // Set timeout for connection
        connectionTimeout = setTimeout(() => {
          if (this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Authenticate with the WebSocket
   */
  authenticate() {
    if (!this.apiKey || !this.apiSecret || !this.passphrase) {
      console.warn('Missing API credentials for authentication');
      return;
    }
    
    const authMessage = {
      type: 'auth',
      auth: {
        apikey: this.apiKey,
        secret: this.apiSecret,
        passphrase: this.passphrase
      }
    };
    
    this.sendMessage(authMessage);
  }

  /**
   * Generate authentication signature
   */
  generateAuthSignature() {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create auth payload following Polymarket's specification
    const authPayload = {
      apiKey: this.apiKey,
      timestamp: timestamp,
      nonce: nonce
    };
    
    // Create signature message
    const message = JSON.stringify(authPayload, Object.keys(authPayload).sort());
    
    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    
    return {
      ...authPayload,
      signature
    };
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'auth_success':
          this.isAuthenticated = true;
          console.log('✅ Authenticated with Polymarket');
          break;
          
        case 'auth_error':
          console.error('Authentication failed:', message.error);
          break;
          
        case 'market_data':
          this.handleMarketData(message);
          break;
          
        case 'order_update':
          this.handleOrderUpdate(message);
          break;
          
        case 'error':
          console.error('WebSocket error:', message.error);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle market data updates
   */
  handleMarketData(message) {
    const { market_id, data } = message;
    const callbacks = this.subscriptions.get(market_id);
    
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Handle order updates
   */
  handleOrderUpdate(message) {
    const { order_id, data } = message;
    const callback = this.orderCallbacks.get(order_id);
    
    if (callback) {
      callback(data);
      
      // Remove callback if order is filled or cancelled
      if (data.status === 'FILLED' || data.status === 'CANCELLED') {
        this.orderCallbacks.delete(order_id);
      }
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    // Exponential backoff
    setTimeout(async () => {
      try {
        await this.connectWebSocket();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, this.reconnectDelay);
    
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  /**
   * Resubscribe to previous subscriptions
   */
  resubscribe() {
    this.subscriptions.forEach((callbacks, marketId) => {
      this.sendMessage({
        type: 'subscribe',
        market_id: marketId
      });
    });
  }

  /**
   * Subscribe to market updates
   */
  subscribeToMarket(marketId, callback) {
    if (!this.subscriptions.has(marketId)) {
      this.subscriptions.set(marketId, new Set());
      
      this.sendMessage({
        type: 'subscribe',
        market_id: marketId
      });
    }
    
    this.subscriptions.get(marketId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(marketId);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          this.subscriptions.delete(marketId);
          this.sendMessage({
            type: 'unsubscribe',
            market_id: marketId
          });
        }
      }
    };
  }

  /**
   * Get market orderbook
   */
  async getOrderbook(tokenId) {
    try {
      const path = `/book`;
      const queryParams = `?token_id=${tokenId}`;
      const fullPath = path + queryParams;
      
      const response = await fetch(`${POLYMARKET_CLOB_URL}${fullPath}`, {
        method: 'GET',
        headers: this.getHeaders('GET', fullPath)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch orderbook: ${response.statusText} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      logError(error, { method: 'getOrderbook', tokenId });
      throw error;
    }
  }

  /**
   * Get market info
   */
  async getMarketInfo(marketId) {
    try {
      const response = await fetch(`${POLYMARKET_CLOB_URL}/markets/${marketId}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch market info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logError(error, { method: 'getMarketInfo', marketId });
      throw error;
    }
  }

  /**
   * Create and sign an order
   */
  async createOrder(signer, orderParams) {
    const {
      tokenId,
      side,
      price,
      size,
      orderType = OrderType.GTC,
      expiration = Math.floor(Date.now() / 1000) + 86400 // 24 hours
    } = orderParams;
    
    // Generate order parameters
    const salt = ethers.randomBytes(32);
    const nonce = Date.now();
    
    // Calculate amounts based on side
    const makerAmount = side === Side.BUY 
      ? ethers.parseUnits(size.toString(), 6) // USDC amount
      : ethers.parseUnits(size.toString(), 6); // Outcome token amount
      
    const takerAmount = side === Side.BUY
      ? ethers.parseUnits((size * price).toString(), 6) // Outcome tokens
      : ethers.parseUnits((size * price).toString(), 6); // USDC
    
    const order = {
      salt: ethers.hexlify(salt),
      maker: await signer.getAddress(),
      signer: await signer.getAddress(),
      taker: ethers.ZeroAddress,
      tokenId: tokenId,
      makerAmount: makerAmount.toString(),
      takerAmount: takerAmount.toString(),
      side: side === Side.BUY ? 0 : 1,
      expiration: expiration,
      nonce: nonce,
      feeRateBps: 0, // Platform can set this
      signatureType: 0 // EOA signature
    };
    
    // Sign the order
    const signature = await this.signOrder(signer, order);
    
    return {
      ...order,
      signature
    };
  }

  /**
   * Sign order using EIP-712
   */
  async signOrder(signer, order) {
    const domain = {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId: EIP712_DOMAIN.chainId,
      verifyingContract: EIP712_DOMAIN.verifyingContract
    };
    
    const types = {
      Order: ORDER_TYPES.Order
    };
    
    // Sign the order
    const signature = await signer.signTypedData(domain, types, order);
    
    return signature;
  }

  /**
   * Submit signed order to CLOB
   */
  async submitOrder(signedOrder) {
    try {
      const path = '/order';
      const body = JSON.stringify(signedOrder);
      
      const response = await fetch(`${POLYMARKET_CLOB_URL}${path}`, {
        method: 'POST',
        headers: this.getHeaders('POST', path, body),
        body: body
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        try {
          const error = JSON.parse(errorData);
          throw new Error(`Failed to submit order: ${error.message || response.statusText}`);
        } catch {
          throw new Error(`Failed to submit order: ${response.statusText} - ${errorData}`);
        }
      }
      
      const result = await response.json();
      
      // Subscribe to order updates
      if (result.order_id || result.orderID) {
        const orderId = result.order_id || result.orderID;
        this.sendMessage({
          type: 'subscribe_order',
          order_id: orderId
        });
      }
      
      return result;
    } catch (error) {
      logError(error, { method: 'submitOrder' });
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    try {
      const response = await fetch(`${POLYMARKET_CLOB_URL}/order/${orderId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logError(error, { method: 'cancelOrder', orderId });
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userAddress, marketId = null) {
    try {
      const params = new URLSearchParams({ user: userAddress });
      if (marketId) params.append('market', marketId);
      
      const response = await fetch(`${POLYMARKET_CLOB_URL}/orders?${params}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user orders: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logError(error, { method: 'getUserOrders', userAddress });
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(marketId, limit = 100) {
    try {
      const response = await fetch(
        `${POLYMARKET_CLOB_URL}/markets/${marketId}/trades?limit=${limit}`,
        {
          headers: this.getHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trade history: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logError(error, { method: 'getTradeHistory', marketId });
      throw error;
    }
  }

  /**
   * Get headers for API requests
   */
  getHeaders(method = 'GET', path = '/', body = '') {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey && this.apiSecret && this.passphrase) {
      const timestamp = Math.floor(Date.now() / 1000); // Polymarket uses seconds
      
      // L2 Authentication headers
      headers['POLY_ADDRESS'] = this.polygonAddress;
      headers['POLY_SIGNATURE'] = this.generateRequestSignature(method, path, timestamp, body);
      headers['POLY_TIMESTAMP'] = timestamp.toString();
      headers['POLY_API_KEY'] = this.apiKey;
      headers['POLY_PASSPHRASE'] = this.passphrase;
    }
    
    return headers;
  }

  /**
   * Generate request signature for HTTP requests (L2 Authentication)
   */
  generateRequestSignature(method, path, timestamp, body = '') {
    const crypto = require('crypto');
    
    // Create the message to sign (Polymarket L2 format)
    const message = [
      timestamp.toString(),
      method.toUpperCase(),
      path,
      body || ''
    ].join('');
    
    // Generate HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');
    
    return signature;
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;
      
      // If no message received in 30 seconds, send ping
      if (timeSinceLastHeartbeat > 30000) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }
      
      // If no response in 60 seconds, reconnect
      if (timeSinceLastHeartbeat > 60000) {
        console.warn('Heartbeat timeout, reconnecting...');
        this.ws.close();
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Check if WebSocket is connected and ready
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Ensure WebSocket is connected
   */
  async ensureConnected() {
    if (!this.isConnected()) {
      await this.connectWebSocket();
    }
  }
  
  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.orderCallbacks.clear();
    this.isAuthenticated = false;
  }
}

// Export singleton instance
module.exports = new PolymarketCLOBService();