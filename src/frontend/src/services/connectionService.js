import { Connection } from '@solana/web3.js';
import { getAllRpcUrls, getAllWsUrls, config } from '../config/solana';

class ConnectionService {
  constructor() {
    this._connection = null;
    this._currentRpcIndex = 0;
    this._rpcUrls = getAllRpcUrls();
    this._wsUrls = getAllWsUrls();
    this._lastConnectionTime = 0;
    this._connectionTimeout = 30000; // 30 seconds
  }

  // Get or create connection (singleton pattern)
  getConnection() {
    const now = Date.now();
    
    // Create new connection if none exists or if it's been too long
    if (!this._connection || (now - this._lastConnectionTime) > this._connectionTimeout) {
      const rpcUrl = this._rpcUrls[this._currentRpcIndex];
      const wsUrl = this._wsUrls[this._currentRpcIndex];
      console.log(`Creating connection to: ${rpcUrl}`);
      console.log(`📡 Using WebSocket endpoint: ${wsUrl}`);
      
      this._connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 15000, // 15 seconds (faster)
        wsEndpoint: wsUrl, // Enable WebSocket for real-time updates
        httpHeaders: {
          'solana-client': 'solana-prediction-market'
        },
        disableRetryOnRateLimit: false,
        fetch: fetch
      });
      
      this._lastConnectionTime = now;
    }
    
    return this._connection;
  }

  // Switch to next RPC endpoint on failure
  switchToNextRpc() {
    this._currentRpcIndex = (this._currentRpcIndex + 1) % this._rpcUrls.length;
    this._connection = null; // Force recreation on next getConnection()
    console.log(`Switching to RPC endpoint ${this._currentRpcIndex}: ${this._rpcUrls[this._currentRpcIndex]}`);
  }

  // Execute RPC call with automatic fallback
  async executeWithFallback(operation) {
    let lastError;
    const maxRetries = this._rpcUrls.length;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const connection = this.getConnection();
        return await operation(connection);
      } catch (error) {
        lastError = error;
        console.error(`RPC call failed on ${this._rpcUrls[this._currentRpcIndex]}:`, error.message);
        
        // Check if it's a rate limit or connection error
        if (error.message?.includes('429') || 
            error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('ETIMEDOUT') ||
            error.message?.includes('failed to fetch')) {
          this.switchToNextRpc();
        } else {
          // For other errors, throw immediately
          throw error;
        }
      }
    }
    
    // If all endpoints failed, throw the last error
    throw lastError;
  }

  // Get current RPC URL
  getCurrentRpcUrl() {
    return this._rpcUrls[this._currentRpcIndex];
  }

  // Reset to primary RPC
  resetToPrimary() {
    this._currentRpcIndex = 0;
    this._connection = null;
  }
}

// Export singleton instance
export default new ConnectionService(); 