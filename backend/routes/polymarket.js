const express = require('express');
const router = express.Router();
const PolymarketProxyService = require('../services/polymarketProxyService');
const polymarketMock = require('../services/polymarketMockService');
const { authenticateUser } = require('../middleware/auth');
const { 
  asyncHandler, 
  ValidationError, 
  NotFoundError,
  validateRequired,
  validatePositiveNumber,
  validateWalletAddress
} = require('../utils/errorHandler');

// Initialize service
const polymarketProxy = new PolymarketProxyService();

// Use mock service for now
const USE_MOCK = true; // Toggle this for real implementation

// Middleware to verify user has connected wallet
const requireWallet = async (req, res, next) => {
  if (!req.user || !req.user.wallet_address) {
    return res.status(401).json({ 
      error: 'Wallet connection required',
      message: 'Please connect your Solana wallet first'
    });
  }
  next();
};

/**
 * GET /api/polymarket/markets
 * Search and list available markets
 */
router.get('/markets', asyncHandler(async (req, res) => {
  const { search, category, limit = 20, offset = 0 } = req.query;
  
  // Validate query parameters
  const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const validatedOffset = Math.max(parseInt(offset) || 0, 0);
  
  if (USE_MOCK) {
    // Use mock service
    const result = await polymarketMock.getMarkets({
      search,
      category,
      limit: validatedLimit,
      offset: validatedOffset
    });
    
    return res.json(result);
  }
  
  // Real Polymarket implementation would go here
  throw new Error('Real Polymarket API not implemented yet');
}));

/**
 * GET /api/polymarket/user-tier
 * Get user's fee tier based on APES holdings
 */
router.get('/user-tier', authenticateUser, requireWallet, async (req, res) => {
  try {
    const tier = await polymarketProxy.getUserTier(req.user.wallet_address);
    
    res.json({
      walletAddress: req.user.wallet_address,
      apesBalance: tier.apesBalance,
      tier: tier.tierName,
      feeRate: tier.feeRate,
      savings: tier.savingsPercent,
      benefits: tier.benefits
    });
  } catch (error) {
    console.error('Error fetching user tier:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user tier',
      message: error.message 
    });
  }
});

/**
 * POST /api/polymarket/place-order
 * Place an order through the proxy service
 */
router.post('/place-order', authenticateUser, requireWallet, async (req, res) => {
  try {
    const { marketId, outcomeId, size, side } = req.body;

    // Validate input
    if (!marketId || outcomeId === undefined || !size || !side) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['marketId', 'outcomeId', 'size', 'side']
      });
    }

    if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid side',
        message: 'Side must be BUY or SELL'
      });
    }

    if (size <= 0) {
      return res.status(400).json({ 
        error: 'Invalid size',
        message: 'Size must be greater than 0'
      });
    }

    if (USE_MOCK) {
      // Use mock service for testing
      const mockOrder = await polymarketMock.placeOrder(
        req.user.wallet_address,
        marketId,
        outcomeId,
        size,
        side.toUpperCase()
      );
      
      // Calculate fees based on user tier
      const userTier = await polymarketProxy.getUserTier(req.user.wallet_address);
      const platformFee = size * userTier.feeRate;
      const standardFee = size * 0.01; // 1% standard rate
      const feeSavings = standardFee - platformFee;
      
      return res.json({
        orderId: mockOrder.id,
        status: mockOrder.status,
        fee: platformFee,
        feeSavings: feeSavings,
        estimatedFillPrice: mockOrder.price,
        message: `Order placed successfully. You saved $${feeSavings.toFixed(2)} on fees with your ${userTier.tierName} tier!`
      });
    }
    
    // Real implementation
    const order = await polymarketProxy.placeOrder(
      req.user.wallet_address,
      marketId,
      outcomeId,
      size,
      side.toUpperCase()
    );

    res.json({
      orderId: order.orderId,
      status: order.status,
      fee: order.fee,
      feeSavings: order.feeSavings,
      estimatedFillPrice: order.estimatedPrice,
      message: `Order placed successfully. You saved $${order.feeSavings.toFixed(2)} on fees!`
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ 
      error: 'Failed to place order',
      message: error.message 
    });
  }
});

/**
 * GET /api/polymarket/positions
 * Get user's current positions
 */
router.get('/positions', authenticateUser, requireWallet, async (req, res) => {
  try {
    if (USE_MOCK) {
      const positions = await polymarketMock.getUserPositions(req.user.wallet_address);
      
      return res.json({
        positions: positions.map(p => ({
          marketId: p.marketId,
          question: p.question,
          outcome: p.outcomeName,
          shares: p.shares,
          avgPrice: p.avgPrice,
          currentPrice: p.currentPrice,
          value: p.value,
          pnl: p.pnl,
          pnlPercent: p.pnlPercent,
          lastUpdated: new Date().toISOString()
        })),
        totalValue: positions.reduce((sum, p) => sum + p.value, 0),
        totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0)
      });
    }
    
    // Real implementation
    const positions = await polymarketProxy.getUserPositions(req.user.wallet_address);
    
    res.json({
      positions: positions.map(p => ({
        marketId: p.market_id,
        question: p.question,
        outcome: p.outcome,
        shares: p.shares,
        avgPrice: p.avg_price,
        currentPrice: p.current_price,
        value: p.value,
        pnl: p.pnl,
        pnlPercent: p.pnl_percent,
        lastUpdated: p.last_updated
      })),
      totalValue: positions.reduce((sum, p) => sum + p.value, 0),
      totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0)
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch positions',
      message: error.message 
    });
  }
});

/**
 * GET /api/polymarket/order-history
 * Get user's order history
 */
router.get('/order-history', authenticateUser, requireWallet, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const orders = await polymarketProxy.getOrderHistory(
      req.user.wallet_address,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      orders: orders.map(o => ({
        orderId: o.id,
        marketId: o.market_id,
        question: o.question,
        outcome: o.outcome,
        side: o.side,
        size: o.size,
        price: o.price,
        status: o.status,
        fee: o.fee_amount,
        feeSaved: o.fee_saved,
        createdAt: o.created_at,
        filledAt: o.filled_at
      })),
      total: orders.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order history',
      message: error.message 
    });
  }
});

/**
 * GET /api/polymarket/stats
 * Get platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await polymarketProxy.getPlatformStats();
    
    res.json({
      totalVolume: stats.totalVolume || 0,
      totalUsers: stats.totalUsers || 0,
      totalFeesCollected: stats.totalFees || 0,
      totalFeesSaved: stats.totalSaved || 0,
      averageFeeRate: stats.avgFeeRate || 0.005,
      topMarkets: stats.topMarkets || [],
      userTierDistribution: stats.tierDistribution || {
        standard: 0,
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch platform statistics',
      message: error.message 
    });
  }
});

/**
 * POST /api/polymarket/cancel-order
 * Cancel an open order
 */
router.post('/cancel-order/:orderId', authenticateUser, requireWallet, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await polymarketProxy.cancelOrder(
      req.user.wallet_address,
      orderId
    );
    
    res.json({
      success: result.success,
      orderId: orderId,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      error: 'Failed to cancel order',
      message: error.message 
    });
  }
});

/**
 * GET /api/polymarket/leaderboard
 * Get top traders leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = '7d', limit = 20 } = req.query;
    
    const leaderboard = await polymarketProxy.getLeaderboard(period, parseInt(limit));
    
    res.json({
      period,
      leaderboard: leaderboard.map((trader, index) => ({
        rank: index + 1,
        address: trader.wallet_address.slice(0, 6) + '...' + trader.wallet_address.slice(-4),
        pnl: trader.total_pnl,
        winRate: trader.win_rate,
        totalVolume: trader.total_volume,
        tradesCount: trader.trades_count,
        tier: trader.tier
      }))
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      message: error.message 
    });
  }
});

/**
 * POST /api/polymarket/copy-trader
 * Subscribe to copy a successful trader
 */
router.post('/copy-trader', authenticateUser, requireWallet, async (req, res) => {
  try {
    const { traderAddress, maxInvestment } = req.body;
    
    if (!traderAddress || !maxInvestment) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['traderAddress', 'maxInvestment']
      });
    }

    const subscription = await polymarketProxy.subscribeToCopyTrading(
      req.user.wallet_address,
      traderAddress,
      maxInvestment
    );
    
    res.json({
      subscriptionId: subscription.id,
      trader: traderAddress,
      maxInvestment,
      status: 'active',
      message: 'Successfully subscribed to copy trader'
    });
  } catch (error) {
    console.error('Error subscribing to copy trader:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe to copy trader',
      message: error.message 
    });
  }
});

/**
 * GET /api/polymarket/referral-stats
 * Get user's referral statistics
 */
router.get('/referral-stats', authenticateUser, requireWallet, async (req, res) => {
  try {
    const stats = await polymarketProxy.getReferralStats(req.user.wallet_address);
    
    res.json({
      referralCode: stats.referralCode,
      referredUsers: stats.referredUsers,
      totalEarnings: stats.totalEarnings,
      pendingEarnings: stats.pendingEarnings,
      referralLink: `https://markets.primape.app?ref=${stats.referralCode}`
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch referral statistics',
      message: error.message 
    });
  }
});

module.exports = router;