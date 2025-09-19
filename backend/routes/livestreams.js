/**
 * Livestream Routes
 * Endpoints for PumpFun livestream integration
 */

const express = require('express');
const router = express.Router();
const pumpfunStreamService = require('../services/pumpfunStreamService');
const streamMarketService = require('../services/streamMarketService');
const { body, param, query, validationResult } = require('express-validator');

/**
 * GET /api/livestreams
 * Get all featured livestreams
 */
router.get('/', async (req, res) => {
  try {
    const streams = await pumpfunStreamService.getFeaturedStreams();
    
    // Add market count for each stream
    for (const stream of streams) {
      const markets = await streamMarketService.getStreamMarkets(stream.tokenAddress);
      stream.activeMarkets = markets.length;
    }

    res.json({
      success: true,
      streams
    });

  } catch (error) {
    console.error('Error fetching livestreams:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch livestreams' 
    });
  }
});

/**
 * GET /api/livestreams/:tokenAddress
 * Get details for a specific livestream
 */
router.get('/:tokenAddress', [
  param('tokenAddress').isLength({ min: 32, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tokenAddress } = req.params;
    const streamDetails = await pumpfunStreamService.getStreamDetails(tokenAddress);
    
    if (!streamDetails) {
      return res.status(404).json({ 
        success: false,
        error: 'Stream not found' 
      });
    }

    // Get active markets
    const markets = await streamMarketService.getStreamMarkets(tokenAddress);
    
    res.json({
      success: true,
      stream: streamDetails,
      markets
    });

  } catch (error) {
    console.error('Error fetching stream details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stream details' 
    });
  }
});

/**
 * POST /api/livestreams/:tokenAddress/market
 * Create a new market for a livestream
 */
router.post('/:tokenAddress/market', [
  param('tokenAddress').isLength({ min: 32, max: 64 }),
  body('question').notEmpty().isLength({ max: 500 }),
  body('duration').optional().isInt({ min: 1, max: 60 }).default(5),
  body('options').optional().isArray({ min: 2, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tokenAddress } = req.params;
    const { question, duration, options, creatorWallet } = req.body;

    // Verify stream exists and is live
    const stream = await pumpfunStreamService.getStreamDetails(tokenAddress);
    if (!stream) {
      return res.status(404).json({ 
        success: false,
        error: 'Stream not found' 
      });
    }

    if (!stream.is_live) {
      return res.status(400).json({ 
        success: false,
        error: 'Stream is not live' 
      });
    }

    // Create market
    const market = await streamMarketService.createMarket({
      streamToken: tokenAddress,
      question,
      duration: duration || 5,
      options: options || ['YES', 'NO'],
      creatorWallet
    });

    res.json({
      success: true,
      market
    });

  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create market' 
    });
  }
});

/**
 * GET /api/livestreams/:tokenAddress/markets
 * Get all markets for a specific livestream
 */
router.get('/:tokenAddress/markets', [
  param('tokenAddress').isLength({ min: 32, max: 64 }),
  query('status').optional().isIn(['active', 'resolved', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tokenAddress } = req.params;
    const { status = 'active' } = req.query;

    const markets = await streamMarketService.getStreamMarkets(
      tokenAddress,
      status === 'all' ? null : status
    );

    res.json({
      success: true,
      markets
    });

  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch markets' 
    });
  }
});

/**
 * POST /api/livestreams/bet
 * Place a bet on a stream market
 */
router.post('/bet', [
  body('marketId').isInt(),
  body('option').isInt({ min: 0, max: 3 }),
  body('amount').isFloat({ min: 0.1 }), // Min 0.1 SOL
  body('userWallet').isLength({ min: 32, max: 64 }),
  body('txSignature').optional().isLength({ min: 64, max: 128 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { marketId, option, amount, userWallet, txSignature } = req.body;

    // Place bet
    const bet = await streamMarketService.placeBet({
      marketId,
      userWallet,
      option,
      amount,
      txSignature: txSignature || `pending_${Date.now()}`
    });

    res.json({
      success: true,
      bet
    });

  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to place bet' 
    });
  }
});

/**
 * GET /api/livestreams/market/:marketId
 * Get details for a specific market
 */
router.get('/market/:marketId', [
  param('marketId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { marketId } = req.params;
    const market = await streamMarketService.getMarketStats(marketId);

    if (!market) {
      return res.status(404).json({ 
        success: false,
        error: 'Market not found' 
      });
    }

    res.json({
      success: true,
      market
    });

  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch market' 
    });
  }
});

/**
 * POST /api/livestreams/admin/feature
 * Admin endpoint to feature/unfeature a stream
 */
router.post('/admin/feature', [
  body('tokenAddress').isLength({ min: 32, max: 64 }),
  body('featured').isBoolean(),
  body('order').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check admin auth (simplified for now)
    const walletAddress = req.headers['x-wallet-address'];
    const authorizedWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];
    
    if (!walletAddress || !authorizedWallets.includes(walletAddress)) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    const { tokenAddress, featured, order } = req.body;

    const db = require('../database/db');
    await db.query(`
      UPDATE pumpfun_streams 
      SET is_featured = $1, featured_order = $2, updated_at = NOW()
      WHERE token_address = $3
    `, [featured, order || null, tokenAddress]);

    res.json({
      success: true,
      message: 'Stream updated'
    });

  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update stream' 
    });
  }
});

/**
 * GET /api/livestreams/stats/overview
 * Get overall livestream stats
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const db = require('../database/db');
    
    // Get stats
    const stats = await db.query(`
      SELECT 
        COUNT(DISTINCT ps.id) as total_streams,
        COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_live = true) as live_streams,
        COUNT(DISTINCT sm.id) as total_markets,
        COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = 'active') as active_markets,
        COALESCE(SUM(sm.total_volume), 0) as total_volume,
        COUNT(DISTINCT sb.user_wallet) as unique_bettors
      FROM pumpfun_streams ps
      LEFT JOIN stream_markets sm ON ps.token_address = sm.stream_token
      LEFT JOIN stream_bets sb ON sm.id = sb.market_id
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stats' 
    });
  }
});

module.exports = router;