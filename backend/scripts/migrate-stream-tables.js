/**
 * Run PumpFun stream tables migration
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: "postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable"
});

const tables = [
  // pumpfun_streams table
  `CREATE TABLE IF NOT EXISTS pumpfun_streams (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    symbol VARCHAR(20),
    creator_wallet VARCHAR(255),
    stream_url VARCHAR(500),
    viewer_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    featured_order INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // stream_markets table
  `CREATE TABLE IF NOT EXISTS stream_markets (
    id SERIAL PRIMARY KEY,
    stream_token VARCHAR(255) NOT NULL,
    question VARCHAR(500) NOT NULL,
    options JSONB NOT NULL DEFAULT '["YES", "NO"]',
    duration_minutes INTEGER DEFAULT 5,
    creator_wallet VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    winning_option INTEGER,
    total_volume DECIMAL(20, 9) DEFAULT 0,
    option_volumes JSONB DEFAULT '{"0": 0, "1": 0}',
    platform_fee_bps INTEGER DEFAULT 200,
    creator_fee_bps INTEGER DEFAULT 50,
    streamer_fee_bps INTEGER DEFAULT 50,
    total_platform_fee DECIMAL(20, 9) DEFAULT 0,
    total_creator_fee DECIMAL(20, 9) DEFAULT 0,
    total_streamer_fee DECIMAL(20, 9) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // stream_bets table
  `CREATE TABLE IF NOT EXISTS stream_bets (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES stream_markets(id),
    user_wallet VARCHAR(255) NOT NULL,
    option INTEGER NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    tx_signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // stream_payouts table
  `CREATE TABLE IF NOT EXISTS stream_payouts (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL REFERENCES stream_markets(id),
    user_wallet VARCHAR(255) NOT NULL,
    bet_amount DECIMAL(20, 9) NOT NULL,
    payout_amount DECIMAL(20, 9) NOT NULL,
    tx_signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // stream_stats table
  `CREATE TABLE IF NOT EXISTS stream_stats (
    id SERIAL PRIMARY KEY,
    stream_token VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_markets INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 9) DEFAULT 0,
    unique_bettors INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(stream_token, date)
  )`
];

const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_streams_featured ON pumpfun_streams (is_featured, featured_order) WHERE is_featured = true`,
  `CREATE INDEX IF NOT EXISTS idx_streams_live ON pumpfun_streams (is_live) WHERE is_live = true`,
  `CREATE INDEX IF NOT EXISTS idx_markets_stream ON stream_markets (stream_token, status)`,
  `CREATE INDEX IF NOT EXISTS idx_markets_expires ON stream_markets (expires_at) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_stream_bets_market ON stream_bets (market_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stream_bets_user ON stream_bets (user_wallet)`,
  `CREATE INDEX IF NOT EXISTS idx_stream_payouts_user ON stream_payouts (user_wallet)`
];

const testData = `
  INSERT INTO pumpfun_streams (token_address, title, symbol, is_featured, featured_order)
  VALUES 
    ('7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump', 'Test Stream 1', 'TEST1', true, 1),
    ('J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump', 'Test Stream 2', 'TEST2', true, 2),
    ('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts', 'APES Dev Stream', 'APES', true, 0)
  ON CONFLICT (token_address) DO NOTHING
`;

async function runMigration() {
  console.log('🚀 Running PumpFun Stream Tables Migration\n');
  
  try {
    // Create tables
    console.log('📊 Creating tables...');
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`   Creating ${tableName}...`);
      await pool.query(tables[i]);
      console.log(`   ✅ ${tableName} created`);
    }
    
    console.log('\n🔍 Creating indexes...');
    for (let i = 0; i < indexes.length; i++) {
      const indexName = indexes[i].match(/CREATE INDEX IF NOT EXISTS (\w+)/)[1];
      console.log(`   Creating ${indexName}...`);
      await pool.query(indexes[i]);
      console.log(`   ✅ ${indexName} created`);
    }
    
    console.log('\n📝 Inserting test data...');
    await pool.query(testData);
    console.log('   ✅ Test streams inserted');
    
    // Verify
    console.log('\n🔍 Verifying migration...');
    const streams = await pool.query('SELECT * FROM pumpfun_streams');
    console.log(`   ✅ Found ${streams.rows.length} streams`);
    
    streams.rows.forEach(stream => {
      console.log(`      - ${stream.title} (${stream.token_address.substring(0, 16)}...)`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(console.error);