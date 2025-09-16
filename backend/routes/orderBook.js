const express = require('express');
const router = express.Router();
const db = require('../config/database');
const orderBookService = require('../services/orderBookService');
const logger = require('../utils/logger');

// Middleware to check if order book service is initialized
const checkService = (req, res, next) => {
  if (!orderBookService.polymarketService) {
    return res.status(503).json({ 
      error: 'Order book service not initialized',
      message: 'Please try again in a few moments' 
    });
  }
  next();
};

/**
 * GET /api/orderbook/:marketAddress
 * Get aggregated order book for a market
 */
router.get('/:marketAddress', checkService, async (req, res) => {
  try {
    const { marketAddress } = req.params;
    const { useCache } = req.query;
    
    let orderBook;
    
    // Try cache first if requested
    if (useCache !== 'false') {
      orderBook = await orderBookService.getCachedOrderBook(marketAddress);
    }
    
    // Fetch fresh data if no cache or cache miss
    if (!orderBook) {
      orderBook = await orderBookService.getAggregatedOrderBook(marketAddress);
    }
    
    res.json({
      success: true,
      marketAddress,
      orderBook,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching order book:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order book',
      message: error.message 
    });
  }
});

/**
 * GET /api/orderbook/external/search
 * Search for external markets to map
 */
router.get('/external/search', checkService, async (req, res) => {
  try {
    const { query, platform } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = {
      polymarket: [],
      kalshi: []
    };
    
    // Search based on platform preference
    if (!platform || platform === 'polymarket') {
      try {
        results.polymarket = await orderBookService.polymarketService.searchMarkets(query);
      } catch (error) {
        logger.error('Polymarket search error:', error);
      }
    }
    
    if (!platform || platform === 'kalshi') {
      try {
        results.kalshi = await orderBookService.kalshiService.searchMarkets(query);
      } catch (error) {
        logger.error('Kalshi search error:', error);
      }
    }
    
    res.json({
      success: true,
      query,
      results,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error searching external markets:', error);
    res.status(500).json({ 
      error: 'Failed to search external markets',
      message: error.message 
    });
  }
});

/**
 * POST /api/orderbook/mapping
 * Create or update market mapping
 */
router.post('/mapping', async (req, res) => {
  try {
    const {
      market_address,
      polymarket_slug,
      polymarket_condition_id,
      kalshi_ticker,
      kalshi_market_id,
      mapping_confidence
    } = req.body;
    
    if (!market_address) {
      return res.status(400).json({ error: 'market_address required' });
    }
    
    // Upsert mapping
    const query = `
      INSERT INTO external_market_mappings (
        market_address,
        polymarket_slug,
        polymarket_condition_id,
        kalshi_ticker,
        kalshi_market_id,
        mapping_confidence,
        manual_override
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (market_address) DO UPDATE SET
        polymarket_slug = EXCLUDED.polymarket_slug,
        polymarket_condition_id = EXCLUDED.polymarket_condition_id,
        kalshi_ticker = EXCLUDED.kalshi_ticker,
        kalshi_market_id = EXCLUDED.kalshi_market_id,
        mapping_confidence = EXCLUDED.mapping_confidence,
        manual_override = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [
      market_address,
      polymarket_slug || null,
      polymarket_condition_id || null,
      kalshi_ticker || null,
      kalshi_market_id || null,
      mapping_confidence || 0.5
    ]);
    
    res.json({
      success: true,
      mapping: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating market mapping:', error);
    res.status(500).json({ 
      error: 'Failed to create market mapping',
      message: error.message 
    });
  }
});

/**
 * GET /api/orderbook/mappings
 * Get all market mappings
 */
router.get('/mappings', async (req, res) => {
  try {
    const query = `
      SELECT 
        emm.*,
        m.question,
        m.options,
        m.status,
        m.category
      FROM external_market_mappings emm
      JOIN markets m ON emm.market_address = m.market_address
      ORDER BY emm.updated_at DESC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      mappings: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching market mappings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market mappings',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/orderbook/mapping/:marketAddress
 * Remove market mapping
 */
router.delete('/mapping/:marketAddress', async (req, res) => {
  try {
    const { marketAddress } = req.params;
    
    const query = 'DELETE FROM external_market_mappings WHERE market_address = $1 RETURNING *';
    const result = await db.query(query, [marketAddress]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({
      success: true,
      deleted: result.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting market mapping:', error);
    res.status(500).json({ 
      error: 'Failed to delete market mapping',
      message: error.message 
    });
  }
});

/**
 * GET /api/orderbook/liquidity/:marketAddress
 * Get liquidity metrics for a market
 */
router.get('/liquidity/:marketAddress', async (req, res) => {
  try {
    const { marketAddress } = req.params;
    const { period = '24h' } = req.query;
    
    let interval;
    switch (period) {
      case '1h': interval = '1 hour'; break;
      case '24h': interval = '24 hours'; break;
      case '7d': interval = '7 days'; break;
      default: interval = '24 hours';
    }
    
    const query = `
      SELECT 
        timestamp,
        total_liquidity_usd,
        polymarket_liquidity,
        kalshi_liquidity,
        apes_liquidity,
        bid_depth_1pct,
        ask_depth_1pct
      FROM market_liquidity
      WHERE market_address = $1
      AND timestamp > NOW() - INTERVAL '${interval}'
      ORDER BY timestamp DESC
    `;
    
    const result = await db.query(query, [marketAddress]);
    
    // Calculate aggregates
    const latest = result.rows[0] || {};
    const avgLiquidity = result.rows.reduce((sum, row) => 
      sum + parseFloat(row.total_liquidity_usd || 0), 0) / Math.max(result.rows.length, 1);
    
    res.json({
      success: true,
      marketAddress,
      period,
      latest,
      average: avgLiquidity,
      history: result.rows,
      dataPoints: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching liquidity data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch liquidity data',
      message: error.message 
    });
  }
});

/**
 * GET /api/orderbook/arbitrage
 * Get active arbitrage opportunities
 */
router.get('/arbitrage', async (req, res) => {
  try {
    const query = `
      SELECT 
        ao.*,
        m.question,
        m.options,
        m.category
      FROM arbitrage_opportunities ao
      JOIN markets m ON ao.market_address = m.market_address
      WHERE ao.status = 'active'
      AND ao.detected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY ao.potential_profit_pct DESC
      LIMIT 20
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      opportunities: result.rows,
      total: result.rows.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching arbitrage opportunities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch arbitrage opportunities',
      message: error.message 
    });
  }
});

/**
 * GET /api/orderbook/stats
 * Get order book statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get mapping stats
    const mappingQuery = `
      SELECT 
        COUNT(*) as total_mappings,
        COUNT(DISTINCT polymarket_slug) as polymarket_markets,
        COUNT(DISTINCT kalshi_ticker) as kalshi_markets,
        AVG(mapping_confidence) as avg_confidence
      FROM external_market_mappings
    `;
    
    const mappingResult = await db.query(mappingQuery);
    stats.mappings = mappingResult.rows[0];
    
    // Get cache stats
    const cacheQuery = `
      SELECT 
        COUNT(*) as cached_markets,
        AVG(EXTRACT(EPOCH FROM (NOW() - last_update))) as avg_cache_age_seconds
      FROM order_book_cache
      WHERE last_update > NOW() - INTERVAL '1 hour'
    `;
    
    const cacheResult = await db.query(cacheQuery);
    stats.cache = cacheResult.rows[0];
    
    // Get liquidity stats
    const liquidityQuery = `
      SELECT 
        AVG(total_liquidity_usd) as avg_liquidity,
        MAX(total_liquidity_usd) as max_liquidity,
        COUNT(DISTINCT market_address) as markets_tracked
      FROM market_liquidity
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    `;
    
    const liquidityResult = await db.query(liquidityQuery);
    stats.liquidity = liquidityResult.rows[0];
    
    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching order book stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order book stats',
      message: error.message 
    });
  }
});

module.exports = router;