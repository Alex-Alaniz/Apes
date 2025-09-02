import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Wallet authentication utilities for signing API requests
 */
export class WalletAuth {
  /**
   * Generate a timestamp message for signing
   * @returns {string} Message to be signed
   */
  static generateMessage() {
    const timestamp = Date.now();
    return `Authenticate PRIMAPE at ${timestamp}`;
  }

  /**
   * Extract timestamp from a signed message
   * @param {string} message - The signed message
   * @returns {number|null} Timestamp or null if not found
   */
  static extractTimestamp(message) {
    const match = message.match(/at (\d+)$/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Check if a message is still valid (not expired)
   * @param {string} message - The signed message
   * @param {number} maxAge - Maximum age in milliseconds (default 5 minutes)
   * @returns {boolean} Whether the message is valid
   */
  static isMessageValid(message, maxAge = 5 * 60 * 1000) {
    const timestamp = this.extractTimestamp(message);
    if (!timestamp) return false;
    
    const age = Date.now() - timestamp;
    return age <= maxAge;
  }

  /**
   * Sign a message using the wallet adapter
   * @param {object} wallet - Wallet adapter instance
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Base58 encoded signature
   */
  static async signMessage(wallet, message) {
    if (!wallet.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    try {
      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign the message
      const signature = await wallet.signMessage(messageBytes);
      
      // Convert to base58
      return bs58.encode(signature);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Generate authentication headers for API requests
   * @param {object} wallet - Wallet adapter instance
   * @returns {Promise<object>} Headers object with authentication
   */
  static async generateAuthHeaders(wallet) {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const message = this.generateMessage();
    const signature = await this.signMessage(wallet, message);

    return {
      'x-wallet-address': wallet.publicKey.toString(),
      'x-wallet-signature': signature,
      'x-signature-message': message
    };
  }

  /**
   * Make an authenticated API request
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @param {object} wallet - Wallet adapter instance
   * @returns {Promise<Response>} Fetch response
   */
  static async authenticatedFetch(url, options = {}, wallet) {
    try {
      const authHeaders = await this.generateAuthHeaders(wallet);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...authHeaders
        }
      });

      return response;
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }
}

export default WalletAuth;