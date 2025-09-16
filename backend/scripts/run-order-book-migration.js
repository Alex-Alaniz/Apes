const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    console.log('📊 Running order book tables migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/create_order_book_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Order book tables created successfully');
    console.log('📋 Created tables:');
    console.log('  - external_market_mappings');
    console.log('  - order_book_cache');
    console.log('  - order_book_history');
    console.log('  - market_liquidity');
    console.log('  - arbitrage_opportunities');
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'external_market_mappings',
        'order_book_cache',
        'order_book_history',
        'market_liquidity',
        'arbitrage_opportunities'
      )
    `);
    
    console.log(`\n✅ Verified ${tableCheck.rows.length} tables created`);
    
    // Check sample mappings
    const mappingsCheck = await pool.query('SELECT COUNT(*) FROM external_market_mappings');
    console.log(`📊 Sample mappings inserted: ${mappingsCheck.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();