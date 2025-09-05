const express = require('express');
const router = express.Router();
const db = require('../config/database');
// const scraperOrchestrator = require('../services/scrapers/scraperOrchestrator'); // DISABLED - causing puppeteer-core errors
const { authenticateAdmin } = require('../middleware/auth');

// Get all scraped markets pending approval (DISABLED - scrapers disabled)
router.get('/scraped/pending', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Get high quality markets for quick approval (DISABLED - scrapers disabled)
router.get('/scraped/high-quality', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Approve markets in bulk (DISABLED - scrapers disabled)
router.post('/scraped/approve-bulk', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Reject markets in bulk (DISABLED - scrapers disabled)
router.post('/scraped/reject-bulk', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Auto-approve high quality markets (DISABLED - scrapers disabled)
router.post('/scraped/auto-approve', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Get scraper statistics (DISABLED - scrapers disabled)
router.get('/scrapers/stats', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
});

// Manually trigger a scraper (DISABLED - scrapers disabled)
router.post('/scrapers/run/:source', authenticateAdmin, async (req, res) => {
  res.status(503).json({ 
    error: 'Scraper functionality disabled due to puppeteer-core dependency issues',
    message: 'Scrapers are temporarily disabled to prevent backend crashes'
  });
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