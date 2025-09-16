require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runPolymarketMigration() {
  console.log('🚀 Running Polymarket Proxy Tables Migration...\n');
  
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/create_polymarket_proxy_tables_fixed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    
    // Check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'polymarket_orders',
          'platform_fees',
          'fee_distributions',
          'user_fee_tiers',
          'copy_trading_subscriptions',
          'polymarket_leaderboard',
          'polymarket_referrals',
          'api_access_tokens',
          'user_proxy_settings',
          'proxy_wallets'
        )
    `);
    
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    
    if (existingTables.length > 0) {
      console.log('\n⚠️  Some tables already exist:');
      existingTables.forEach(table => console.log(`   - ${table}`));
      console.log('\nMigration will skip existing tables.\n');
    }
    
    // Execute migration
    console.log('🔄 Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    
    // Verify tables were created
    const verifyTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'polymarket_orders',
          'platform_fees',
          'fee_distributions',
          'user_fee_tiers',
          'copy_trading_subscriptions',
          'polymarket_leaderboard',
          'polymarket_referrals',
          'api_access_tokens',
          'user_proxy_settings',
          'proxy_wallets'
        )
      ORDER BY table_name
    `);
    
    console.log('\n✅ Created tables:');
    verifyTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check sample data
    const sampleData = await pool.query('SELECT COUNT(*) FROM user_fee_tiers');
    console.log(`\n✅ Sample data inserted: ${sampleData.rows[0].count} tier records`);
    
    // Create migration tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Record migration
    await pool.query(`
      INSERT INTO schema_migrations (version) 
      VALUES ('create_polymarket_proxy_tables') 
      ON CONFLICT (version) DO NOTHING
    `);
    
    console.log('\n🎉 Polymarket migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run integration tests: npm run test:polymarket');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Test the API endpoints: /api/polymarket/*');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  runPolymarketMigration();
}

module.exports = runPolymarketMigration;