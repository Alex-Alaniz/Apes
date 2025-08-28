/**
 * Safe Mobile Approval Migration Script
 * 
 * This script safely adds the mobile_approved column to the markets table
 * WITHOUT modifying any existing data
 * 
 * Run with: node scripts/safe-mobile-migration.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runSafeMigration() {
  let client;
  
  try {
    console.log('🔒 Starting SAFE mobile approval migration...\n');
    
    // Get a client from the pool for transaction
    client = await pool.connect();
    
    // Start transaction for safety
    await client.query('BEGIN');
    console.log('📝 Transaction started\n');
    
    // Check current schema first
    console.log('🔍 Checking current markets table schema...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'markets'
      AND column_name IN ('mobile_approved', 'status', 'options')
      ORDER BY column_name
    `);
    
    console.log('Current relevant columns:');
    schemaCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    console.log('');
    
    // Check if mobile_approved already exists
    const columnExists = schemaCheck.rows.some(col => col.column_name === 'mobile_approved');
    
    if (columnExists) {
      console.log('✅ Column mobile_approved already exists - migration not needed\n');
      
      // Still show stats
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_markets,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_markets,
          COUNT(CASE WHEN mobile_approved = true THEN 1 END) as mobile_approved,
          COUNT(CASE WHEN mobile_approved = false OR mobile_approved IS NULL THEN 1 END) as not_approved
        FROM markets
      `);
      
      console.log('📊 Current market statistics:');
      console.log(`  - Total markets: ${stats.rows[0].total_markets}`);
      console.log(`  - Active markets: ${stats.rows[0].active_markets}`);
      console.log(`  - Mobile approved: ${stats.rows[0].mobile_approved}`);
      console.log(`  - Not approved: ${stats.rows[0].not_approved}`);
      
      await client.query('ROLLBACK');
      return;
    }
    
    // Run the safe migration
    console.log('🔧 Adding mobile_approved column (default: false)...');
    await client.query(`
      ALTER TABLE markets 
      ADD COLUMN mobile_approved BOOLEAN DEFAULT false
    `);
    console.log('✅ Column added successfully\n');
    
    // Create index
    console.log('📇 Creating performance index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_markets_mobile_approved 
      ON markets (mobile_approved) 
      WHERE mobile_approved = true
    `);
    console.log('✅ Index created successfully\n');
    
    // Add documentation
    console.log('📝 Adding column documentation...');
    await client.query(`
      COMMENT ON COLUMN markets.mobile_approved IS 
      'Controls visibility in PRIMAPE iOS app. Set to true to show market in mobile.'
    `);
    console.log('✅ Documentation added\n');
    
    // Show statistics (no data modified)
    const afterStats = await client.query(`
      SELECT 
        COUNT(*) as total_markets,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_markets,
        COUNT(CASE WHEN mobile_approved = true THEN 1 END) as mobile_approved,
        COUNT(CASE WHEN mobile_approved = false OR mobile_approved IS NULL THEN 1 END) as not_approved
      FROM markets
    `);
    
    console.log('📊 Post-migration statistics:');
    console.log(`  - Total markets: ${afterStats.rows[0].total_markets}`);
    console.log(`  - Active markets: ${afterStats.rows[0].active_markets}`);
    console.log(`  - Mobile approved: ${afterStats.rows[0].mobile_approved} (should be 0)`);
    console.log(`  - Not approved: ${afterStats.rows[0].not_approved} (should equal total)`);
    console.log('');
    
    // Show sample of markets (no modifications)
    const sampleMarkets = await client.query(`
      SELECT market_address, question, status, mobile_approved
      FROM markets
      WHERE status = 'Active'
      LIMIT 3
    `);
    
    if (sampleMarkets.rows.length > 0) {
      console.log('📋 Sample active markets (all should have mobile_approved = false):');
      sampleMarkets.rows.forEach(market => {
        console.log(`  - ${market.question.substring(0, 50)}...`);
        console.log(`    Status: ${market.status}, Mobile: ${market.mobile_approved}`);
      });
      console.log('');
    }
    
    // Confirm before committing
    console.log('🎯 Migration complete! Ready to commit.\n');
    console.log('⚠️  NO DATA WAS MODIFIED - all markets have mobile_approved = false');
    console.log('👉 You can manually approve markets through the admin UI\n');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!\n');
    
    console.log('🎉 Migration completed safely!');
    console.log('📱 Next steps:');
    console.log('   1. Go to https://apes.primape.app/admin/mobile-markets');
    console.log('   2. Manually approve specific markets for mobile');
    console.log('   3. Test in iOS app to verify only approved markets appear');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    
    if (client) {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back - no changes made');
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check database connection settings');
    console.error('   - Verify you have ALTER TABLE permissions');
    console.error('   - Check if migration was already run');
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Show warning and run
console.log('================================================');
console.log('     SAFE Mobile Approval Migration Script      ');
console.log('================================================\n');
console.log('This script will:');
console.log('  ✓ Add mobile_approved column (default: false)');
console.log('  ✓ Create a performance index');
console.log('  ✓ Add documentation comments');
console.log('\nThis script will NOT:');
console.log('  ✗ Modify any existing data');
console.log('  ✗ Delete anything');
console.log('  ✗ Auto-approve any markets\n');
console.log('================================================\n');

// Run the migration
runSafeMigration().catch(console.error);