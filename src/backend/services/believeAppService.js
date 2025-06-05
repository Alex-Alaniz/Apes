const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class BelieveAppService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://public.believe.app/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-believe-api-key': apiKey
      }
    });
  }

  /**
   * Burn tokens for a single operation
   * @param {string} type - Type of burn (PREDICTION_BET, REWARD_CLAIM, MARKET_CREATION)
   * @param {Object} proof - Proof object containing transaction details
   * @param {number} burnAmount - Amount of tokens to burn
   * @param {boolean} persistOnchain - Whether to persist proof on-chain
   */
  async burnTokens(type, proof, burnAmount, persistOnchain = true) {
    const idempotencyKey = uuidv4();
    
    try {
      const response = await this.client.post('/tokenomics/burn', {
        type,
        proof,
        burnAmount,
        persistOnchain
      }, {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      });

      console.log(`Token burn successful: ${type}`, {
        txHash: response.data.txHash,
        burnAmount,
        dateBurned: response.data.dateBurned
      });

      return response.data;
    } catch (error) {
      console.error('Token burn failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Burn tokens for multiple operations in batch
   * @param {Array} burnOperations - Array of burn operations
   */
  async burnBatch(burnOperations) {
    const idempotencyKey = uuidv4();
    
    try {
      const response = await this.client.post('/tokenomics/burn-batch', 
        burnOperations,
        {
          headers: {
            'x-idempotency-key': idempotencyKey
          }
        }
      );

      console.log('Batch burn results:', {
        successful: response.data.success.length,
        failed: response.data.errors.length
      });

      return response.data;
    } catch (error) {
      console.error('Batch burn failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create proof object for prediction bet
   */
  createPredictionBetProof(marketId, userId, optionIndex, amount, txSignature) {
    return {
      marketId,
      userId,
      optionIndex: optionIndex.toString(),
      betAmount: amount.toString(),
      transactionSignature: txSignature,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create proof object for reward claim
   */
  createRewardClaimProof(marketId, userId, rewardAmount, txSignature) {
    return {
      marketId,
      userId,
      rewardAmount: rewardAmount.toString(),
      transactionSignature: txSignature,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create proof object for market creation
   */
  createMarketCreationProof(marketId, creatorId, stakeAmount, txSignature) {
    return {
      marketId,
      creatorId,
      stakeAmount: stakeAmount.toString(),
      transactionSignature: txSignature,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BelieveAppService; 