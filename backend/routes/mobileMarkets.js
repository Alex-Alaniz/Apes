const express = require('express');
const router = express.Router();
const db = require('../config/database');
const scraperOrchestrator = require('../services/scrapers/scraperOrchestrator');
const { authenticateAdmin } = require('../middleware/auth');

// Get all scraped markets pending approval
router.get('/scraped/pending', authenticateAdmin, async (req, res) => {
  try {
    const filters = {
      source: req.query.source,
      category: req.query.category,
      sport_type: req.query.sport_type,
      time_category: req.query.time_category,
      min_quality_score: req.query.min_quality_score ? parseFloat(req.query.min_quality_score) : null,
      sort_by: req.query.sort_by || 'quality_score',
      sort_order: req.query.sort_order || 'DESC',
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const markets = await scraperOrchestrator.getPendingMarkets(filters);
    
    // Add statistics
    const stats = await db.query(`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(quality_score) as avg_quality
      FROM scraped_markets
      WHERE approval_status = 'pending'
        AND end_time > NOW()
      GROUP BY source
    `);

    res.json({
      markets,
      stats: stats.rows,
      total: markets.length
    });
  } catch (error) {
    console.error('Error fetching pending markets:', error);
    res.status(500).json({ error: 'Failed to fetch pending markets' });
  }
});

// Get high quality markets for quick approval
router.get('/scraped/high-quality', authenticateAdmin, async (req, res) => {
  try {
    const minScore = req.query.min_score ? parseFloat(req.query.min_score) : 0.7;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    const markets = await scraperOrchestrator.getHighQualityMarkets(minScore, limit);
    
    res.json({
      markets,
      total: markets.length,
      min_score: minScore
    });
  } catch (error) {
    console.error('Error fetching high quality markets:', error);
    res.status(500).json({ error: 'Failed to fetch high quality markets' });
  }
});

// Approve markets in bulk
router.post('/scraped/approve-bulk', authenticateAdmin, async (req, res) => {
  try {
    const { market_ids, auto_deploy } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!market_ids || !Array.isArray(market_ids)) {
      return res.status(400).json({ error: 'market_ids array is required' });
    }

    // Approve markets
    const approvedCount = await scraperOrchestrator.approveMarkets(market_ids, walletAddress);
    
    // If auto_deploy is true, mark them for deployment
    if (auto_deploy) {
      await db.query(`
        UPDATE scraped_markets 
        SET deployment_status = 'approved'
        WHERE id = ANY($1::int[])
      `, [market_ids]);
    }
    
    res.json({
      success: true,
      approved_count: approvedCount,
      auto_deploy: auto_deploy || false
    });
  } catch (error) {
    console.error('Error approving markets:', error);
    res.status(500).json({ error: 'Failed to approve markets' });
  }
});

// Reject markets in bulk
router.post('/scraped/reject-bulk', authenticateAdmin, async (req, res) => {
  try {
    const { market_ids, reason } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!market_ids || !Array.isArray(market_ids)) {
      return res.status(400).json({ error: 'market_ids array is required' });
    }

    const rejectedCount = await scraperOrchestrator.rejectMarkets(
      market_ids, 
      walletAddress, 
      reason || 'Not suitable for platform'
    );
    
    res.json({
      success: true,
      rejected_count: rejectedCount
    });
  } catch (error) {
    console.error('Error rejecting markets:', error);
    res.status(500).json({ error: 'Failed to reject markets' });
  }
});

// Auto-approve high quality markets
router.post('/scraped/auto-approve', authenticateAdmin, async (req, res) => {
  try {
    const { min_score = 0.8, max_markets = 20, sources = [] } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    // Get high quality markets
    let query = `
      SELECT id FROM scraped_markets 
      WHERE approval_status = 'pending'
        AND quality_score >= $1
        AND end_time > NOW()
    `;
    
    const params = [min_score];
    
    if (sources.length > 0) {
      params.push(sources);
      query += ` AND source = ANY($${params.length})`;
    }
    
    query += ` ORDER BY quality_score DESC LIMIT $${params.length + 1}`;
    params.push(max_markets);
    
    const result = await db.query(query, params);
    const marketIds = result.rows.map(r => r.id);
    
    if (marketIds.length === 0) {
      return res.json({
        success: true,
        approved_count: 0,
        message: 'No markets met the auto-approval criteria'
      });
    }
    
    // Approve the markets
    const approvedCount = await scraperOrchestrator.approveMarkets(marketIds, walletAddress);
    
    res.json({
      success: true,
      approved_count: approvedCount,
      min_score,
      sources
    });
  } catch (error) {
    console.error('Error auto-approving markets:', error);
    res.status(500).json({ error: 'Failed to auto-approve markets' });
  }
});

// Get scraper statistics
router.get('/scrapers/stats', authenticateAdmin, async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;
    const stats = await scraperOrchestrator.getStats(hours);
    
    res.json({
      stats,
      hours,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching scraper stats:', error);
    res.status(500).json({ error: 'Failed to fetch scraper stats' });
  }
});

// Manually trigger a scraper
router.post('/scrapers/run/:source', authenticateAdmin, async (req, res) => {
  try {
    const { source } = req.params;
    
    // Run scraper asynchronously
    scraperOrchestrator.runScraper(source)
      .then(result => {
        console.log(`Manual scrape completed for ${source}:`, result);
      })
      .catch(error => {
        console.error(`Manual scrape failed for ${source}:`, error);
      });
    
    res.json({
      success: true,
      message: `${source} scraper started`,
      source
    });
  } catch (error) {
    console.error('Error running scraper:', error);
    res.status(500).json({ error: 'Failed to run scraper' });
  }
});

// Get market sources configuration
router.get('/sources', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        *,
        (SELECT COUNT(*) FROM scraped_markets WHERE source = ms.name AND approval_status = 'pending') as pending_count,
        (SELECT COUNT(*) FROM scraped_markets WHERE source = ms.name AND approval_status = 'approved') as approved_count
      FROM market_sources ms
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching market sources:', error);
    res.status(500).json({ error: 'Failed to fetch market sources' });
  }
});

// Update market source configuration
router.patch('/sources/:name', authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const { is_active, scrape_interval_minutes } = req.body;
    
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (typeof is_active === 'boolean') {
      params.push(is_active);
      updates.push(`is_active = $${++paramCount}`);
    }
    
    if (scrape_interval_minutes) {
      params.push(scrape_interval_minutes);
      updates.push(`scrape_interval_minutes = $${++paramCount}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    params.push(name);
    const query = `
      UPDATE market_sources 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE name = $${++paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Market source not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating market source:', error);
    res.status(500).json({ error: 'Failed to update market source' });
  }
});

// Get approved markets ready for deployment
router.get('/deployment/ready', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sm.*,
        ms.name as source_name
      FROM scraped_markets sm
      JOIN market_sources ms ON sm.source = ms.name
      WHERE sm.approval_status = 'approved'
        AND sm.deployment_status = 'approved'
        AND sm.market_address IS NULL
        AND sm.end_time > NOW()
      ORDER BY sm.quality_score DESC, sm.approved_at ASC
      LIMIT 50
    `);
    
    res.json({
      markets: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching deployment ready markets:', error);
    res.status(500).json({ error: 'Failed to fetch deployment ready markets' });
  }
});

// Mark markets as deployed
router.post('/deployment/mark-deployed', authenticateAdmin, async (req, res) => {
  try {
    const { deployments } = req.body; // Array of { scraped_market_id, market_address, tx_signature }
    
    if (!deployments || !Array.isArray(deployments)) {
      return res.status(400).json({ error: 'deployments array is required' });
    }
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const deployment of deployments) {
        // Update scraped market
        await client.query(`
          UPDATE scraped_markets 
          SET 
            deployment_status = 'deployed',
            market_address = $1,
            deployment_tx = $2
          WHERE id = $3
        `, [deployment.market_address, deployment.tx_signature, deployment.scraped_market_id]);
        
        // Get market data
        const marketResult = await client.query(
          'SELECT * FROM scraped_markets WHERE id = $1',
          [deployment.scraped_market_id]
        );
        
        if (marketResult.rows.length > 0) {
          const market = marketResult.rows[0];
          
          // Insert into main markets table
          await client.query(`
            INSERT INTO markets (
              market_address, source, source_id, question, description,
              category, options, status, mobile_approved, mobile_priority,
              time_category, sport_type, event_date, deployment_tx,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          `, [
            deployment.market_address,
            market.source,
            market.source_id,
            market.question,
            market.description,
            market.category,
            market.options,
            'Active',
            true, // Auto-approve for mobile
            market.quality_score * 100, // Use quality score as priority
            market.time_category,
            market.sport_type,
            market.event_date,
            deployment.tx_signature
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        deployed_count: deployments.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error marking markets as deployed:', error);
    res.status(500).json({ error: 'Failed to mark markets as deployed' });
  }
});

// Get market categories and stats
router.get('/categories/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        category,
        time_category,
        sport_type,
        COUNT(*) as total_markets,
        COUNT(CASE WHEN mobile_approved = true THEN 1 END) as mobile_approved,
        AVG(CASE WHEN total_volume IS NOT NULL THEN total_volume ELSE 0 END) as avg_volume
      FROM markets
      WHERE status = 'Active'
      GROUP BY category, time_category, sport_type
      ORDER BY total_markets DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

module.exports = router;