/**
 * Direct pump.fun WebSocket connection for real-time token data
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const axios = require('axios');

class PumpFunWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectInterval = null;
    this.activeTokens = new Map();
    this.isConnected = false;
  }

  async initialize() {
    console.log('🚀 Initializing pump.fun WebSocket connection...');
    await this.connect();
  }

  async connect() {
    try {
      // Connect to pump.fun's WebSocket
      this.ws = new WebSocket('wss://pumpportal.fun/api/data', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://pump.fun'
        }
      });

      this.ws.on('open', () => {
        console.log('✅ Connected to pump.fun WebSocket');
        this.isConnected = true;
        
        // Subscribe to new token events
        this.send({
          method: "subscribeNewToken",
        });
        
        // Subscribe to trades
        this.send({
          method: "subscribeTokenTrade",
          keys: [] // Subscribe to all
        });
      });

      this.ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  async handleMessage(message) {
    // New token creation
    if (message.mint && message.name && message.symbol) {
      console.log(`🪙 New token: ${message.name} (${message.symbol})`);
      
      // Check if this token has a livestream
      const hasLivestream = await this.checkTokenForLivestream(message.mint);
      
      if (hasLivestream) {
        const streamData = {
          tokenAddress: message.mint,
          tokenName: message.name,
          tokenSymbol: message.symbol,
          creatorWallet: message.traderPublicKey,
          isLive: true,
          streamUrl: `https://pump.fun/coin/${message.mint}`,
          timestamp: new Date()
        };
        
        this.activeTokens.set(message.mint, streamData);
        this.emit('livestreamDetected', streamData);
        console.log(`🎥 LIVESTREAM DETECTED: ${message.name}`);
      }
    }

    // Trade events
    if (message.signature && message.txType) {
      // Track high activity tokens
      const trades = this.activeTokens.get(message.mint)?.trades || 0;
      if (this.activeTokens.has(message.mint)) {
        this.activeTokens.get(message.mint).trades = trades + 1;
      }
    }
  }

  async checkTokenForLivestream(mint) {
    // Try to fetch the token page to check for livestream
    try {
      const response = await axios.get(`https://pump.fun/coin/${mint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });
      
      // Check if page mentions livestream
      const hasLivestream = response.data.includes('livestream') || 
                           response.data.includes('live-stream') ||
                           response.data.includes('streaming');
      
      return hasLivestream;
    } catch (error) {
      return false;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, 5000);
    }
  }

  getActiveStreams() {
    return Array.from(this.activeTokens.values()).filter(t => t.isLive);
  }

  close() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = new PumpFunWebSocketService();