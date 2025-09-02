const cron = require('node-cron');
const db = require('../../config/database');
const polymarketScraper = require('./polymarketScraper');
const kalshiScraper = require('./kalshiScraper');
const fanduelScraper = require('./fanduelScraper');

class ScraperOrchestrator {
  constructor() {
    this.scrapers = {
      polymarket: polymarketScraper,
      kalshi: kalshiScraper,
      fanduel: fanduelScraper
    };
    this.cronJobs = {};
    this.isRunning = false;
  }

  /**
   * Initialize and start all scrapers
   */
  async start() {
    if (this.isRunning) {
      console.log('Scraper orchestrator is already running');
      return;
    }

    console.log('🚀 Starting scraper orchestrator...');
    this.isRunning = true;

    // Load scraper configurations
    const sources = await this.getActiveSources();

    for (const source of sources) {
      this.scheduleScraperJob(source);
    }

    // Schedule cleanup job
    this.scheduleCleanupJob();

    // Schedule quality assessment job
    this.scheduleQualityAssessmentJob();

    console.log('✅ Scraper orchestrator started successfully');
  }

  /**
   * Stop all scrapers
   */
  stop() {
    console.log('Stopping scraper orchestrator...');
    
    // Stop all cron jobs
    Object.values(this.cronJobs).forEach(job => job.stop());
    this.cronJobs = {};
    this.isRunning = false;

    console.log('Scraper orchestrator stopped');
  }

  /**
   * Get active scraper sources from database
   */
  async getActiveSources() {
    const result = await db.query(
      'SELECT * FROM market_sources WHERE is_active = true'
    );
    return result.rows;
  }

  /**
   * Schedule a scraper job
   */
  scheduleScraperJob(source) {
    const scraper = this.scrapers[source.name];
    if (!scraper) {
      console.warn(`No scraper found for source: ${source.name}`);
      return;
    }

    // Convert interval to cron expression
    const interval = source.scrape_interval_minutes || 30;
    const cronExpression = `*/${interval} * * * *`; // Every N minutes

    console.log(`📅 Scheduling ${source.name} scraper to run every ${interval} minutes`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`🔄 Running ${source.name} scraper...`);
      
      try {
        const result = await scraper.scrapeAndSave();
        console.log(`✅ ${source.name} scrape completed:`, result);
        
        // Log scrape results
        await this.logScrapeResult(source.name, result);
      } catch (error) {
        console.error(`❌ ${source.name} scrape failed:`, error);
        await this.logScrapeError(source.name, error);
      }
    });

    this.cronJobs[source.name] = job;

    // Run immediately on start
    this.runScraper(source.name);
  }

  /**
   * Run a specific scraper
   */
  async runScraper(sourceName) {
    const scraper = this.scrapers[sourceName];
    if (!scraper) {
      throw new Error(`Scraper not found: ${sourceName}`);
    }

    try {
      const result = await scraper.scrapeAndSave();
      await this.logScrapeResult(sourceName, result);
      return result;
    } catch (error) {
      await this.logScrapeError(sourceName, error);
      throw error;
    }
  }

  /**
   * Log scrape results
   */
  async logScrapeResult(sourceName, result) {
    await db.query(`
      INSERT INTO scraper_logs (
        source, status, saved_count, duplicate_count, error_count, duration_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      sourceName,
      'success',
      result.saved || 0,
      result.duplicates || 0,
      result.errors || 0,
      result.duration || 0
    ]);
  }

  /**
   * Log scrape errors
   */
  async logScrapeError(sourceName, error) {
    await db.query(`
      INSERT INTO scraper_logs (
        source, status, error_message, created_at
      ) VALUES ($1, $2, $3, NOW())
    `, [
      sourceName,
      'error',
      error.message
    ]);
  }

  /**
   * Schedule cleanup job to remove old/expired markets
   */
  scheduleCleanupJob() {
    // Run daily at 2 AM
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running market cleanup...');
      
      try {
        // Remove expired pending markets
        const expiredResult = await db.query(`
          DELETE FROM scraped_markets 
          WHERE approval_status = 'pending' 
            AND end_time < NOW() - INTERVAL '24 hours'
          RETURNING id
        `);
        
        console.log(`Cleaned up ${expiredResult.rowCount} expired markets`);
        
        // Remove old rejected markets
        const rejectedResult = await db.query(`
          DELETE FROM scraped_markets 
          WHERE approval_status = 'rejected' 
            AND scraped_at < NOW() - INTERVAL '7 days'
          RETURNING id
        `);
        
        console.log(`Cleaned up ${rejectedResult.rowCount} old rejected markets`);
      } catch (error) {
        console.error('Cleanup job failed:', error);
      }
    });

    this.cronJobs.cleanup = job;
  }

  /**
   * Schedule quality assessment job
   */
  scheduleQualityAssessmentJob() {
    // Run every hour
    const job = cron.schedule('0 * * * *', async () => {
      console.log('📊 Running quality assessment...');
      
      try {
        // Recalculate quality scores for pending markets
        const markets = await db.query(`
          SELECT id, source, source_data 
          FROM scraped_markets 
          WHERE approval_status = 'pending' 
            AND end_time > NOW()
        `);
        
        for (const market of markets.rows) {
          const scraper = this.scrapers[market.source];
          if (scraper && scraper.calculateQualityScore) {
            const qualityScore = scraper.calculateQualityScore(market.source_data);
            
            await db.query(
              'UPDATE scraped_markets SET quality_score = $1 WHERE id = $2',
              [qualityScore, market.id]
            );
          }
        }
        
        console.log(`Updated quality scores for ${markets.rowCount} markets`);
      } catch (error) {
        console.error('Quality assessment failed:', error);
      }
    });

    this.cronJobs.quality = job;
  }

  /**
   * Get scraper statistics
   */
  async getStats(hours = 24) {
    const result = await db.query(`
      SELECT 
        source,
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
        SUM(saved_count) as total_saved,
        SUM(duplicate_count) as total_duplicates,
        SUM(error_count) as total_errors,
        AVG(duration_ms) as avg_duration_ms,
        MAX(created_at) as last_run
      FROM scraper_logs
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY source
    `);
    
    return result.rows;
  }

  /**
   * Get pending markets for approval
   */
  async getPendingMarkets(filters = {}) {
    let query = `
      SELECT * FROM scraped_markets 
      WHERE approval_status = 'pending' 
        AND end_time > NOW()
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.source) {
      params.push(filters.source);
      query += ` AND source = $${++paramCount}`;
    }
    
    if (filters.category) {
      params.push(filters.category);
      query += ` AND category = $${++paramCount}`;
    }
    
    if (filters.sport_type) {
      params.push(filters.sport_type);
      query += ` AND sport_type = $${++paramCount}`;
    }
    
    if (filters.time_category) {
      params.push(filters.time_category);
      query += ` AND time_category = $${++paramCount}`;
    }
    
    if (filters.min_quality_score) {
      params.push(filters.min_quality_score);
      query += ` AND quality_score >= $${++paramCount}`;
    }
    
    // Sorting
    const sortBy = filters.sort_by || 'quality_score';
    const sortOrder = filters.sort_order || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Limit
    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${++paramCount}`;
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get high quality markets across all sources
   */
  async getHighQualityMarkets(minScore = 0.7, limit = 100) {
    const result = await db.query(`
      SELECT 
        sm.*,
        ms.name as source_name
      FROM scraped_markets sm
      JOIN market_sources ms ON sm.source = ms.name
      WHERE sm.approval_status = 'pending'
        AND sm.quality_score >= $1
        AND sm.end_time > NOW()
      ORDER BY sm.quality_score DESC, sm.event_date ASC
      LIMIT $2
    `, [minScore, limit]);
    
    return result.rows;
  }

  /**
   * Approve markets in bulk
   */
  async approveMarkets(marketIds, approvedBy) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update approval status
      const updateResult = await client.query(`
        UPDATE scraped_markets 
        SET 
          approval_status = 'approved',
          approved_by = $1,
          approved_at = NOW()
        WHERE id = ANY($2::int[])
          AND approval_status = 'pending'
        RETURNING id, source
      `, [approvedBy, marketIds]);
      
      // Log approvals
      for (const market of updateResult.rows) {
        await client.query(`
          INSERT INTO market_approvals (scraped_market_id, approved_by, action, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [market.id, approvedBy, 'approve']);
      }
      
      // Update source statistics
      const sourceCounts = {};
      updateResult.rows.forEach(m => {
        sourceCounts[m.source] = (sourceCounts[m.source] || 0) + 1;
      });
      
      for (const [source, count] of Object.entries(sourceCounts)) {
        await client.query(
          'UPDATE market_sources SET total_markets_approved = total_markets_approved + $1 WHERE name = $2',
          [count, source]
        );
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Approved ${updateResult.rowCount} markets`);
      return updateResult.rowCount;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject markets in bulk
   */
  async rejectMarkets(marketIds, rejectedBy, reason) {
    const result = await db.query(`
      UPDATE scraped_markets 
      SET 
        approval_status = 'rejected',
        approved_by = $1,
        approved_at = NOW(),
        rejection_reason = $2
      WHERE id = ANY($3::int[])
        AND approval_status = 'pending'
      RETURNING id
    `, [rejectedBy, reason, marketIds]);
    
    // Log rejections
    for (const market of result.rows) {
      await db.query(`
        INSERT INTO market_approvals (scraped_market_id, approved_by, action, reason, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [market.id, rejectedBy, 'reject', reason]);
    }
    
    return result.rowCount;
  }
}

// Create table for scraper logs if not exists
const createScraperLogsTable = `
CREATE TABLE IF NOT EXISTS scraper_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  saved_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraper_logs_source ON scraper_logs(source);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created_at ON scraper_logs(created_at DESC);
`;

// Run table creation on module load
db.query(createScraperLogsTable).catch(console.error);

module.exports = new ScraperOrchestrator();