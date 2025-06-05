// Service for handling off-chain token burns via Believe API
// https://docs.believe.app/api-reference/endpoint/tokenomics/burn

import axios from 'axios';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';
import { config as solanaConfig } from '../config/solana';
import believeMonitor from '../utils/believeMonitor';

class BelieveApiService {
  constructor() {
    this.apiUrl = `${BELIEVE_CONFIG.apiUrl}/tokenomics/burn`;
    this.apiKey = BELIEVE_CONFIG.apiKey;
    this.isConfigured = isBelieveConfigured();
  }

  /**
   * Generate idempotency key for a transaction
   */
  generateIdempotencyKey() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Burn tokens via Believe API
   * @param {string} type - Type of burn
   * @param {Object} proof - Proof of burn
   * @param {number} burnAmount - Amount of tokens to burn
   * @returns {Promise<Object>} API response
   */
  async burnTokens(type, proof, burnAmount) {
    if (!this.apiKey) {
      console.warn('Believe API key not configured');
      return { success: false, message: 'API key not configured' };
    }

    const idempotencyKey = this.generateIdempotencyKey();
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          type,
          proof,
          burnAmount,
          persistOnchain: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-believe-api-key': this.apiKey,
            'x-idempotency-key': idempotencyKey
          }
        }
      );

      console.log(`🔥 Believe burn successful: ${burnAmount} tokens burned`, response.data);
      
      // Log detailed response for visibility
      console.log('📋 Believe API Response:');
      console.log(`   Result: ${response.data.result}`);
      console.log(`   Hash: ${response.data.hash}`);
      console.log(`   🔗 Burn TxHash: ${response.data.txHash}`);
      console.log(`   Type: ${response.data.type}`);
      console.log(`   Date Burned: ${response.data.dateBurned}`);
      
      const result = {
        success: true,
        message: `Successfully burned ${burnAmount} tokens`,
        data: response.data
      };
      
      // Track in monitor
      believeMonitor.addBurn(type, result);
      
      return result;
    } catch (error) {
      console.error('Believe API burn error:', error.response?.data || error.message);
      
      // Handle specific error codes
      if (error.response?.data?.error) {
        const errorCode = error.response.data.error;
        const errorMessage = error.response.data.message;
        
        switch (errorCode) {
          case 'ERR_TOKEN_NOT_FOUND':
            return { success: false, message: 'Token configuration error' };
          case 'ERR_INVALID_PROOF':
            return { success: false, message: 'Invalid proof data' };
          case 'ERR_BURN_TOKENOMICS_FAILED':
            return { success: false, message: 'Burn operation failed' };
          default:
            return { success: false, message: errorMessage || 'Unknown error' };
        }
      }
      
      const errorResult = {
        success: false,
        message: 'Failed to burn tokens',
        error: error.message
      };
      
      // Track failed burn in monitor
      believeMonitor.addBurn(type, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Burn tokens for placing a prediction
   * @param {string} marketId - Market identifier
   * @param {string} userWallet - User's wallet address
   * @param {number} optionIndex - Selected option
   * @param {number} betAmount - Bet amount in UI units
   * @param {string} txHash - On-chain transaction hash
   * @returns {Promise<Object>} API response
   */
  async burnForPrediction(marketId, userWallet, optionIndex, betAmount, txHash) {
    // Match Believe's expected proof schema
    const proof = {
      transactionId: txHash,
      value: betAmount.toString()
    };

    return this.burnTokens(
      BELIEVE_CONFIG.proofTypes.PREDICTION_BET,
      proof,
      BELIEVE_CONFIG.burnAmounts.PREDICTION_BET
    );
  }

  /**
   * Burn tokens for claiming rewards
   * @param {string} marketId - Market identifier
   * @param {string} userWallet - User's wallet address
   * @param {number} claimAmount - Claim amount in UI units
   * @param {string} txHash - On-chain transaction hash
   * @returns {Promise<Object>} API response
   */
  async burnForClaim(marketId, userWallet, claimAmount, txHash) {
    // Match Believe's expected proof schema
    const proof = {
      transactionId: txHash,
      value: claimAmount.toString()
    };

    return this.burnTokens(
      BELIEVE_CONFIG.proofTypes.PREDICTION_CLAIM,
      proof,
      BELIEVE_CONFIG.burnAmounts.PREDICTION_CLAIM
    );
  }

  /**
   * Burn tokens for market creation
   * @param {string} marketId - Market identifier
   * @param {string} creatorWallet - Creator's wallet address
   * @param {string} marketQuestion - Market question
   * @param {string} txHash - On-chain transaction hash
   * @returns {Promise<Object>} API response
   */
  async burnForMarketCreation(marketId, creatorWallet, marketQuestion, txHash) {
    // Match Believe's expected proof schema
    const proof = {
      transactionId: txHash,
      value: "5" // Market creation burns 5 APES
    };

    return this.burnTokens(
      BELIEVE_CONFIG.proofTypes.MARKET_CREATION,
      proof,
      BELIEVE_CONFIG.burnAmounts.MARKET_CREATION
    );
  }
}

// Export singleton instance
export default new BelieveApiService(); 