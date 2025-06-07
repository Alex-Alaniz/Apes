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
   * Test connectivity to Believe API
   */
  async testConnectivity() {
    console.log('🔍 Testing Believe API connectivity...');
    try {
      // Try a simple GET request to the base API
      const response = await axios.get('https://public.believe.app/v1', {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('✅ Believe API is reachable:', response.status);
      return true;
    } catch (error) {
      console.error('❌ Believe API connectivity test failed:');
      console.error('- Error:', error.message);
      console.error('- Status:', error.response?.status);
      console.error('- CORS issue?:', error.message === 'Network Error');
      return false;
    }
  }

  /**
   * Burn tokens via Believe API with retry logic for timeouts
   * @param {string} type - Type of burn
   * @param {Object} proof - Proof of burn
   * @param {number} burnAmount - Amount of tokens to burn
   * @param {number} retryCount - Current retry attempt (internal)
   * @returns {Promise<Object>} API response
   */
  async burnTokens(type, proof, burnAmount, retryCount = 0) {
    if (!this.apiKey) {
      console.warn('Believe API key not configured');
      return { success: false, message: 'API key not configured' };
    }

    const idempotencyKey = this.generateIdempotencyKey();
    const maxRetries = 1; // Only retry once for timeouts
    
    try {
      console.log('🌐 Making Believe API request to:', this.apiUrl);
      console.log('📤 Request payload:', {
        type,
        proof,
        burnAmount,
        persistOnchain: true
      });
      console.log('📋 Request headers:', {
        'Content-Type': 'application/json',
        'x-believe-api-key': this.apiKey ? '***PRESENT***' : 'MISSING',
        'x-idempotency-key': idempotencyKey
      });

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
          },
          timeout: 60000 // 60 second timeout (Believe API can be slow)
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
      console.error('❌ Believe API burn error details:');
      console.error('- Error type:', error.constructor.name);
      console.error('- Error message:', error.message);
      console.error('- Error code:', error.code);
      console.error('- Response status:', error.response?.status);
      console.error('- Response data:', error.response?.data);
      console.error('- Request URL:', error.config?.url);
      console.error('- Is timeout?:', error.code === 'ECONNABORTED');
      console.error('- Is network error?:', error.message === 'Network Error');
      console.error('- Full error object:', error);
      
      // Handle specific error types
      if (error.message === 'Network Error') {
        console.error('🚨 NETWORK ERROR DETECTED - Possible causes:');
        console.error('1. CORS: Believe API blocking requests from your domain');
        console.error('2. DNS: Cannot resolve public.believe.app');
        console.error('3. Firewall: Request being blocked');
        console.error('4. API Down: Believe API service unavailable');
        return { 
          success: false, 
          message: 'Network error - Cannot reach Believe API (possible CORS issue)',
          error: 'NETWORK_ERROR'
        };
      }
      
             if (error.code === 'ECONNABORTED') {
         console.error('⏰ TIMEOUT DETECTED - Believe API is slow but reachable');
         console.error('- This usually means the API is processing but taking time');
         console.error('- The burn may still succeed on their end');
         
         // Retry once for timeouts (with same idempotency key)
         if (retryCount < maxRetries) {
           console.error(`🔄 Retrying burn request (attempt ${retryCount + 1}/${maxRetries + 1})`);
           await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
           return this.burnTokens(type, proof, burnAmount, retryCount + 1);
         }
         
         console.error('- Consider this a "pending" state rather than failed');
         return { 
           success: false, 
           message: 'Believe API timeout (60s) - Request may still be processing',
           error: 'TIMEOUT',
           isPending: true
         };
       }
      
      // Handle specific API error codes
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
    // Match Believe's EXACT proof schema from successful call
    const proof = {
      value: betAmount.toString(),
      transactionId: txHash
    };

    console.log('🔥 Preparing Believe API burn request (simplified):', {
      type: BELIEVE_CONFIG.proofTypes.PREDICTION_BET,
      burnAmount: BELIEVE_CONFIG.burnAmounts.PREDICTION_BET,
      proof: proof // Show the actual proof being sent
    });

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