const tokenController = require('../controllers/tokenController');
const believeAppService = require('../utils/believeAppService');
const meteoraService = require('../utils/meteoraService');

// Token controller implementation
module.exports = {
  // Process token burn
  async burnTokens(req, res) {
    try {
      const { userId, marketId, type, amount, predictionOption, transactionId } = req.body;
      
      if (!userId || !marketId || !type || !amount || !transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      let result;
      
      // Process different burn types
      switch (type) {
        case 'PREDICTION_BET':
          if (!predictionOption) {
            return res.status(400).json({
              status: 'error',
              message: 'Missing predictionOption parameter for bet burn'
            });
          }
          result = await believeAppService.processBetBurn(
            userId,
            marketId,
            predictionOption,
            parseFloat(amount),
            transactionId
          );
          break;
          
        case 'PREDICTION_CLAIM':
          result = await believeAppService.processClaimBurn(
            userId,
            marketId,
            parseFloat(amount),
            transactionId
          );
          break;
          
        case 'MARKET_CREATION':
          const { marketTitle } = req.body;
          if (!marketTitle) {
            return res.status(400).json({
              status: 'error',
              message: 'Missing marketTitle parameter for market creation burn'
            });
          }
          result = await believeAppService.processMarketCreationBurn(
            userId,
            marketId,
            marketTitle,
            parseFloat(amount),
            transactionId
          );
          break;
          
        default:
          return res.status(400).json({
            status: 'error',
            message: 'Invalid burn type'
          });
      }
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Error processing token burn:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error processing token burn'
      });
    }
  },
  
  // Get token statistics
  async getTokenStats(req, res) {
    try {
      // Get token burn statistics from BelieveApp
      const burnStats = await believeAppService.getTokenBurnStats();
      
      // Get token price from Meteora
      const tokenPrice = await meteoraService.getTokenPrice();
      
      // Get pool information from Meteora
      const poolInfo = await meteoraService.getPoolInfo();
      
      return res.status(200).json({
        status: 'success',
        data: {
          burnStats,
          tokenPrice,
          poolInfo
        }
      });
    } catch (error) {
      console.error('Error fetching token stats:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching token stats'
      });
    }
  },
  
  // Calculate swap details
  async calculateSwap(req, res) {
    try {
      const { inputAmount, isTokenToUsdc } = req.body;
      
      if (!inputAmount || isTokenToUsdc === undefined) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      const swapDetails = await meteoraService.calculateSwap(
        parseFloat(inputAmount),
        isTokenToUsdc
      );
      
      return res.status(200).json({
        status: 'success',
        data: swapDetails
      });
    } catch (error) {
      console.error('Error calculating swap:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error calculating swap'
      });
    }
  },
  
  // Get historical token prices
  async getHistoricalPrices(req, res) {
    try {
      const { timeframe } = req.query;
      
      const priceData = await meteoraService.getHistoricalPrices(timeframe);
      
      return res.status(200).json({
        status: 'success',
        data: priceData
      });
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching historical prices'
      });
    }
  }
};
