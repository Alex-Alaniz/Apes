const predictionController = require('../controllers/predictionController');
const believeAppService = require('../utils/believeAppService');

// Prediction controller implementation
module.exports = {
  // Create new prediction
  async createPrediction(req, res) {
    try {
      const { 
        marketId, 
        userAddress, 
        optionIndex, 
        amount,
        transactionId
      } = req.body;
      
      // Validate required fields
      if (!marketId || !userAddress || optionIndex === undefined || !amount || !transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      // Fetch market details (in a real implementation, this would come from database)
      const market = {
        id: marketId,
        question: 'Will BTC reach $100,000 by end of 2025?',
        options: ['Yes', 'No'],
        status: 'Active'
      };
      
      // Validate option index
      if (optionIndex >= market.options.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid option index'
        });
      }
      
      // Process token burn for bet placement (2.5% of bet amount)
      await believeAppService.processBetBurn(
        userAddress,
        marketId,
        market.options[optionIndex],
        parseFloat(amount),
        transactionId
      );
      
      // In a real implementation, we would save to database
      // For now, we'll return mock data
      const newPrediction = {
        id: 'pred_' + Math.random().toString(36).substring(2, 15),
        marketId,
        userAddress,
        optionIndex,
        option: market.options[optionIndex],
        amount: parseFloat(amount),
        netAmount: parseFloat(amount) * 0.975, // After 2.5% burn
        timestamp: new Date(),
        transactionId,
        claimed: false
      };
      
      return res.status(201).json({
        status: 'success',
        data: newPrediction
      });
    } catch (error) {
      console.error('Error creating prediction:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error creating prediction'
      });
    }
  },
  
  // Get prediction by ID
  async getPredictionById(req, res) {
    try {
      const { id } = req.params;
      
      // In a real implementation, we would fetch from database
      // For now, we'll return mock data
      const prediction = {
        id,
        marketId: '1',
        userAddress: '7X2aBc...9Zxy',
        optionIndex: 0,
        option: 'Yes',
        amount: 1000,
        netAmount: 975, // After 2.5% burn
        timestamp: new Date(Date.now() - 86400000),
        transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
        claimed: false,
        market: {
          question: 'Will BTC reach $100,000 by end of 2025?',
          endDate: new Date('2025-12-31'),
          status: 'Active'
        }
      };
      
      return res.status(200).json({
        status: 'success',
        data: prediction
      });
    } catch (error) {
      console.error('Error fetching prediction:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching prediction'
      });
    }
  },
  
  // Claim reward for winning prediction
  async claimReward(req, res) {
    try {
      const { id } = req.params;
      const { userAddress, transactionId } = req.body;
      
      // Validate required fields
      if (!userAddress || !transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      // In a real implementation, we would fetch prediction and market from database
      // For now, we'll use mock data
      const prediction = {
        id,
        marketId: '1',
        userAddress: '7X2aBc...9Zxy',
        optionIndex: 0,
        option: 'Yes',
        amount: 1000,
        netAmount: 975,
        timestamp: new Date(Date.now() - 86400000),
        claimed: false
      };
      
      const market = {
        id: '1',
        question: 'Will BTC reach $100,000 by end of 2025?',
        options: ['Yes', 'No'],
        optionPools: [16250, 8750],
        totalPool: 25000,
        status: 'Resolved',
        winningOption: 0
      };
      
      // Validate user address
      if (prediction.userAddress !== userAddress) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: Not the prediction owner'
        });
      }
      
      // Validate market is resolved
      if (market.status !== 'Resolved') {
        return res.status(400).json({
          status: 'error',
          message: 'Market is not resolved yet'
        });
      }
      
      // Validate prediction is not already claimed
      if (prediction.claimed) {
        return res.status(400).json({
          status: 'error',
          message: 'Reward already claimed'
        });
      }
      
      // Validate prediction is a winner
      if (prediction.optionIndex !== market.winningOption) {
        return res.status(400).json({
          status: 'error',
          message: 'Not a winning prediction'
        });
      }
      
      // Calculate reward amount
      // For binary markets: (bet amount / winning pool) * total pool
      const rewardAmount = (prediction.netAmount / market.optionPools[market.winningOption]) * market.totalPool;
      
      // Process token burn for reward claiming (1.5% of reward amount)
      await believeAppService.processClaimBurn(
        userAddress,
        market.id,
        rewardAmount,
        transactionId
      );
      
      // In a real implementation, we would update the database
      // For now, we'll return mock data
      const claimResult = {
        predictionId: id,
        marketId: market.id,
        userAddress,
        rewardAmount,
        burnAmount: rewardAmount * 0.015, // 1.5% burn
        netReward: rewardAmount * 0.985, // After 1.5% burn
        claimedAt: new Date(),
        transactionId
      };
      
      return res.status(200).json({
        status: 'success',
        data: claimResult
      });
    } catch (error) {
      console.error('Error claiming reward:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error claiming reward'
      });
    }
  }
};
