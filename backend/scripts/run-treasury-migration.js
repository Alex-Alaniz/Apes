const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runTreasuryMigration() {
  console.log('🔄 Running treasury monitoring migration...');
  
  try {
    const migrationPath = path.join(__dirname, '../migrations/create_treasury_monitoring.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(sql);
    console.log('✅ Treasury monitoring migration completed successfully');
    
    // Verify tables were created
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('treasury_snapshots', 'risk_events', 'parlay_payouts', 'risk_controls', 'system_health')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tables.rows.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });
    
    // Check risk controls
    const controls = await db.query('SELECT * FROM risk_controls ORDER BY control_name');
    console.log('\n🛡️ Risk controls initialized:');
    controls.rows.forEach(control => {
      console.log(`   ${control.control_name}: ${control.control_value} - ${control.description}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runTreasuryMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = runTreasuryMigration;