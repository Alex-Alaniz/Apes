const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const { v4: uuidv4 } = require('uuid');

class BelieveAppService {
  constructor() {
    this.apiKey = process.env.BELIEVE_APP_API_KEY || 'test_api_key';
    this.baseUrl = 'https://public.believe.app/v1/tokenomics';
    this.solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
  }

  /**
   * Process token burn for bet placement
   * @param {string} userId - User wallet address
   * @param {string} marketId - Market ID
   * @param {string} predictionOption - Selected option (Yes/No)
   * @param {number} amount - Bet amount
   * @param {string} transactionId - Solana transaction ID
   * @returns {Promise<Object>} - Burn response
   */
  async processBetBurn(userId, marketId, predictionOption, amount, transactionId) {
    try {
      const burnAmount = this.calculateBurnAmount(amount, 2.5); // 2.5% burn rate for bets
      
      const proof = {
        userId,
        marketId,
        predictionOption,
        amount: amount.toString(),
        timestamp: new Date().toISOString(),
        transactionId
      };

      return await this.burnTokens('PREDICTION_BET', proof, burnAmount);
    } catch (error) {
      console.error('Error processing bet burn:', error);
      throw error;
    }
  }

  /**
   * Process token burn for reward claiming
   * @param {string} userId - User wallet address
   * @param {string} marketId - Market ID
   * @param {number} amount - Reward amount
   * @param {string} transactionId - Solana transaction ID
   * @returns {Promise<Object>} - Burn response
   */
  async processClaimBurn(userId, marketId, amount, transactionId) {
    try {
      const burnAmount = this.calculateBurnAmount(amount, 1.5); // 1.5% burn rate for claims
      
      const proof = {
        userId,
        marketId,
        amount: amount.toString(),
        timestamp: new Date().toISOString(),
        transactionId
      };

      return await this.burnTokens('PREDICTION_CLAIM', proof, burnAmount);
    } catch (error) {
      console.error('Error processing claim burn:', error);
      throw error;
    }
  }

  /**
   * Process token burn for market creation
   * @param {string} userId - Creator wallet address
   * @param {string} marketId - Market ID
   * @param {string} marketTitle - Market question
   * @param {number} stakeAmount - Creator stake amount
   * @param {string} transactionId - Solana transaction ID
   * @returns {Promise<Object>} - Burn response
   */
  async processMarketCreationBurn(userId, marketId, marketTitle, stakeAmount, transactionId) {
    try {
      const burnAmount = this.calculateBurnAmount(stakeAmount, 0.5); // 0.5% burn rate for market creation
      
      const proof = {
        userId,
        marketId,
        marketTitle,
        stakeAmount: stakeAmount.toString(),
        timestamp: new Date().toISOString(),
        transactionId
      };

      return await this.burnTokens('MARKET_CREATION', proof, burnAmount);
    } catch (error) {
      console.error('Error processing market creation burn:', error);
      throw error;
    }
  }

  /**
   * Process batch token burns
   * @param {Array<Object>} burnRequests - Array of burn requests
   * @returns {Promise<Array<Object>>} - Array of burn responses
   */
  async processBatchBurns(burnRequests) {
    try {
      const idempotencyKey = uuidv4();
      
      const response = await axios.post(
        `${this.baseUrl}/burn-batch`,
        burnRequests,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Believe-API-Key': this.apiKey,
            'X-Idempotency-Key': idempotencyKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error processing batch burns:', error);
      throw error;
    }
  }

  /**
   * Get token burn statistics
   * @returns {Promise<Object>} - Burn statistics
   */
  async getTokenBurnStats() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/stats`,
        {
          headers: {
            'X-Believe-API-Key': this.apiKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching token burn stats:', error);
      throw error;
    }
  }

  /**
   * Internal method to burn tokens
   * @param {string} proofType - Type of burn proof
   * @param {Object} proof - Burn proof data
   * @param {number} burnAmount - Amount to burn
   * @returns {Promise<Object>} - Burn response
   */
  async burnTokens(proofType, proof, burnAmount) {
    try {
      const idempotencyKey = uuidv4();
      
      const burnRequest = {
        type: proofType,
        proof,
        burnAmount,
        persistOnchain: true
      };
      
      const response = await axios.post(
        `${this.baseUrl}/burn`,
        burnRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Believe-API-Key': this.apiKey,
            'X-Idempotency-Key': idempotencyKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      // Handle rate limiting
      if (error.response && error.response.status === 429) {
        console.log('Rate limited, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.burnTokens(proofType, proof, burnAmount);
      }
      
      throw error;
    }
  }

  /**
   * Calculate burn amount based on amount and rate
   * @param {number} amount - Original amount
   * @param {number} rate - Burn rate percentage
   * @returns {number} - Burn amount
   */
  calculateBurnAmount(amount, rate) {
    return Math.floor(amount * (rate / 100));
  }

  /**
   * Verify transaction on Solana blockchain
   * @param {string} transactionId - Solana transaction ID
   * @returns {Promise<boolean>} - Whether transaction is valid
   */
  async verifyTransaction(transactionId) {
    try {
      const signature = new PublicKey(transactionId);
      const transaction = await this.solanaConnection.getTransaction(signature);
      return !!transaction;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
}

module.exports = new BelieveAppService();
