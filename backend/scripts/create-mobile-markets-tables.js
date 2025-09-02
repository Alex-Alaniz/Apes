const pool = require('../config/database');

async function createMobileMarketsTables() {
  console.log('🚀 Creating Mobile Markets Pipeline tables...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create market_sources table
    console.log('1. Creating market_sources table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        base_url TEXT,
        api_key TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        scrape_interval_minutes INTEGER DEFAULT 30,
        last_scraped_at TIMESTAMP,
        total_markets_scraped INTEGER DEFAULT 0,
        total_markets_approved INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Success\n');
    
    // 2. Create scraped_markets table
    console.log('2. Creating scraped_markets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scraped_markets (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        source_id VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50),
        sport_type VARCHAR(50),
        options JSONB NOT NULL,
        options_metadata JSONB,
        assets JSONB,
        event_date TIMESTAMP,
        end_time TIMESTAMP,
        time_category VARCHAR(20),
        source_url TEXT,
        source_data JSONB,
        quality_score DECIMAL(3,2),
        approval_status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(44),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        market_address VARCHAR(44),
        deployment_status VARCHAR(20),
        deployment_tx VARCHAR(88),
        deployment_error TEXT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source, source_id)
      )
    `);
    console.log('   ✅ Success\n');
    
    // 3. Create market_approvals table
    console.log('3. Creating market_approvals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_approvals (
        id SERIAL PRIMARY KEY,
        scraped_market_id INTEGER REFERENCES scraped_markets(id),
        approved_by VARCHAR(44) NOT NULL,
        action VARCHAR(20) NOT NULL,
        reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Success\n');
    
    // 4. Create scraper_logs table
    console.log('4. Creating scraper_logs table...');
    await client.query(`
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
      )
    `);
    console.log('   ✅ Success\n');
    
    // 5. Create indexes
    console.log('5. Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_scraped_markets_approval_status ON scraped_markets(approval_status)',
      'CREATE INDEX IF NOT EXISTS idx_scraped_markets_source ON scraped_markets(source, source_id)',
      'CREATE INDEX IF NOT EXISTS idx_scraped_markets_event_date ON scraped_markets(event_date)',
      'CREATE INDEX IF NOT EXISTS idx_scraped_markets_quality_score ON scraped_markets(quality_score DESC)',
      'CREATE INDEX IF NOT EXISTS idx_market_approvals_scraped_market_id ON market_approvals(scraped_market_id)',
      'CREATE INDEX IF NOT EXISTS idx_scraper_logs_source ON scraper_logs(source)',
      'CREATE INDEX IF NOT EXISTS idx_scraper_logs_created_at ON scraper_logs(created_at DESC)'
    ];
    
    for (const index of indexes) {
      await client.query(index);
    }
    console.log('   ✅ Created all indexes\n');
    
    // 6. Insert default market sources
    console.log('6. Inserting default market sources...');
    await client.query(`
      INSERT INTO market_sources (name, type, base_url) VALUES 
        ('polymarket', 'api', 'https://polymarket.com/api'),
        ('kalshi', 'api', 'https://api.kalshi.com/v1'),
        ('fanduel', 'scraper', 'https://sportsbook.fanduel.com'),
        ('manifold', 'api', 'https://manifold.markets/api/v0'),
        ('predictit', 'scraper', 'https://www.predictit.org')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('   ✅ Success\n');
    
    // 7. Add columns to markets table if they don't exist
    console.log('7. Adding new columns to markets table...');
    
    const columnsToAdd = [
      { name: 'source', type: 'VARCHAR(50)', default: "'manual'" },
      { name: 'source_id', type: 'VARCHAR(255)' },
      { name: 'source_url', type: 'TEXT' },
      { name: 'scraped_at', type: 'TIMESTAMP' },
      { name: 'mobile_approved', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'mobile_priority', type: 'INTEGER', default: '0' },
      { name: 'time_category', type: 'VARCHAR(20)' },
      { name: 'sport_type', type: 'VARCHAR(50)' },
      { name: 'event_date', type: 'TIMESTAMP' },
      { name: 'deployment_status', type: 'VARCHAR(20)', default: "'pending'" },
      { name: 'deployment_tx', type: 'VARCHAR(88)' },
      { name: 'deployment_error', type: 'TEXT' },
      { name: 'quality_score', type: 'DECIMAL(3,2)', default: '0' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        const defaultClause = column.default ? ` DEFAULT ${column.default}` : '';
        await client.query(`
          ALTER TABLE markets 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}${defaultClause}
        `);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  Error adding ${column.name}: ${error.message}`);
        }
      }
    }
    console.log('   ✅ All columns added\n');
    
    // 8. Create updated_at trigger function
    console.log('8. Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('   ✅ Success\n');
    
    // 9. Create trigger
    console.log('9. Creating update trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_market_sources_updated_at ON market_sources
    `);
    await client.query(`
      CREATE TRIGGER update_market_sources_updated_at 
      BEFORE UPDATE ON market_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('   ✅ Success\n');
    
    await client.query('COMMIT');
    
    console.log('✅ All Mobile Markets Pipeline tables created successfully!\n');
    
    // Show summary
    const sourcesResult = await client.query('SELECT name, type FROM market_sources ORDER BY name');
    console.log('📌 Configured market sources:');
    sourcesResult.rows.forEach(source => {
      console.log(`   - ${source.name} (${source.type})`);
    });
    
    console.log('\n🎉 Setup complete! Next steps:');
    console.log('1. Set ADMIN_WALLETS environment variable');
    console.log('2. Optionally add API keys for external sources');
    console.log('3. Restart the backend server');
    console.log('4. Visit /admin/market-approval to use the pipeline\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMobileMarketsTables().catch(console.error);