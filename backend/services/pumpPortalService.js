/**
 * PumpPortal WebSocket Service
 * Connects to pump.fun real-time data via PumpPortal API
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class PumpPortalService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectInterval = null;
    this.pingInterval = null;
    this.isConnected = false;
    this.activeStreams = new Map();
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize() {
    console.log('🔌 Initializing PumpPortal WebSocket connection...');
    this.connect();
  }

  /**
   * Connect to PumpPortal WebSocket
   */
  connect() {
    try {
      // PumpPortal WebSocket endpoint
      this.ws = new WebSocket('wss://pumpportal.fun/api/data', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      this.ws.on('open', () => {
        console.log('✅ Connected to PumpPortal WebSocket');
        this.isConnected = true;
        
        // Clear reconnect interval
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }

        // Subscribe to events
        this.subscribe();

        // Start ping to keep connection alive
        this.startPing();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing PumpPortal message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('PumpPortal WebSocket error:', error.message);
      });

      this.ws.on('close', () => {
        console.log('🔌 PumpPortal WebSocket disconnected');
        this.isConnected = false;
        this.stopPing();
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect to PumpPortal:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to relevant events
   */
  subscribe() {
    // Subscribe to new token creates
    this.send({
      method: 'subscribeNewToken'
    });

    // Subscribe to trades
    this.send({
      method: 'subscribeTokenTrade',
      keys: [] // Subscribe to all trades initially
    });

    // Subscribe to account trades (for specific tokens)
    this.send({
      method: 'subscribeAccountTrade',
      keys: [] // Will be populated with active stream tokens
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    // Check if it's a token creation event
    if (message.signature && message.mint) {
      this.handleTokenCreation(message);
    }
    
    // Check if it's a trade event
    if (message.signature && message.baseAmount) {
      this.handleTrade(message);
    }

    // Emit raw message for other services to process
    this.emit('message', message);
  }

  /**
   * Handle new token creation
   */
  handleTokenCreation(data) {
    const tokenInfo = {
      mint: data.mint,
      name: data.name,
      symbol: data.symbol,
      uri: data.uri,
      creator: data.traderPublicKey,
      timestamp: new Date(data.timestamp * 1000),
      signature: data.signature
    };

    console.log(`🪙 New token created: ${tokenInfo.name} (${tokenInfo.symbol})`);
    this.emit('tokenCreated', tokenInfo);

    // Check if creator is streaming
    this.checkIfStreaming(tokenInfo);
  }

  /**
   * Handle trade events
   */
  handleTrade(data) {
    const trade = {
      mint: data.mint,
      amount: data.baseAmount,
      type: data.txType,
      trader: data.traderPublicKey,
      price: data.tokenAmount / data.baseAmount,
      timestamp: new Date(data.timestamp * 1000)
    };

    // Update volume tracking for active streams
    if (this.activeStreams.has(trade.mint)) {
      const stream = this.activeStreams.get(trade.mint);
      stream.volume = (stream.volume || 0) + trade.amount;
      stream.trades = (stream.trades || 0) + 1;
      
      this.emit('streamUpdate', {
        tokenAddress: trade.mint,
        volume: stream.volume,
        trades: stream.trades
      });
    }
  }

  /**
   * Check if token creator is streaming
   */
  async checkIfStreaming(tokenInfo) {
    // Only process if we detect actual streaming activity
    // This would be enhanced with real pump.fun stream detection
    
    // For now, we'll only mark as streaming if we have additional signals
    // like high trade volume or specific metadata
    const recentTrades = this.getRecentTradesForToken(tokenInfo.mint);
    const hasHighActivity = recentTrades > 10; // More than 10 trades in last few minutes
    
    if (hasHighActivity) {
      const streamInfo = {
        tokenAddress: tokenInfo.mint,
        tokenName: tokenInfo.name,
        tokenSymbol: tokenInfo.symbol,
        streamerWallet: tokenInfo.creator,
        isLive: true,
        viewerCount: 0, // Will be updated from pump.fun
        streamUrl: `https://pump.fun/coin/${tokenInfo.mint}`,
        startedAt: tokenInfo.timestamp,
        volume: 0,
        trades: 0
      };

      this.activeStreams.set(tokenInfo.mint, streamInfo);
      console.log(`🎥 High activity detected for ${tokenInfo.name} - checking if streaming`);
      this.emit('streamStarted', streamInfo);

      // Subscribe to this token's trades
      this.send({
        method: 'subscribeTokenTrade',
        keys: [tokenInfo.mint]
      });
    }
  }
  
  /**
   * Get recent trades for a token (helper method)
   */
  getRecentTradesForToken(mint) {
    // This would track recent trades per token
    // For now, return 0 to avoid false positives
    return 0;
  }

  /**
   * End a stream
   */
  endStream(tokenAddress) {
    if (this.activeStreams.has(tokenAddress)) {
      const stream = this.activeStreams.get(tokenAddress);
      stream.isLive = false;
      stream.endedAt = new Date();
      
      console.log(`🎥 Stream ended for ${stream.tokenName}`);
      this.emit('streamEnded', stream);
      
      // Keep in map for historical data
      setTimeout(() => {
        this.activeStreams.delete(tokenAddress);
      }, 60 * 60 * 1000); // Remove after 1 hour
    }
  }

  /**
   * Send message to WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Start ping interval
   */
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log('🔄 Attempting to reconnect to PumpPortal...');
        this.connect();
      }, 5000); // Try every 5 seconds
    }
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values()).filter(s => s.isLive);
  }

  /**
   * Clean up
   */
  close() {
    this.stopPing();
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = new PumpPortalService();