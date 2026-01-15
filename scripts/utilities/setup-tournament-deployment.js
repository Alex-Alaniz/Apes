#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function runMigration() {
  console.log('🚀 Setting up tournament deployment features...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'backend/migrations/add_tournament_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');
    
    // Add initial authorized market creators if specified
    const authorizedWallets = process.env.AUTHORIZED_MARKET_CREATORS?.split(',') || [];
    const adminWallet = process.env.ADMIN_WALLETS?.split(',')[0] || 'ADMIN';
    
    if (authorizedWallets.length > 0) {
      console.log('👥 Adding authorized market creators...');
      
      for (const wallet of authorizedWallets) {
        try {
          await pool.query(`
            INSERT INTO authorized_market_creators (wallet_address, added_by)
            VALUES ($1, $2)
            ON CONFLICT (wallet_address) DO NOTHING
          `, [wallet.trim(), adminWallet]);
          
          console.log(`✅ Added ${wallet.trim()}`);
        } catch (error) {
          console.log(`⚠️ Failed to add ${wallet}: ${error.message}`);
        }
      }
      console.log('');
    }
    
    // Show deployment checklist
    console.log('📋 TOURNAMENT DEPLOYMENT CHECKLIST:\n');
    console.log('1. Database Setup ✅');
    console.log('   - tournament_id and tournament_type columns added');
    console.log('   - authorized_market_creators table created');
    console.log('   - market_deployment_log table created');
    console.log('   - Indexes created for performance\n');
    
    console.log('2. Environment Variables Required:');
    console.log('   - DEPLOYER_PRIVATE_KEY: Base64 encoded private key (for on-behalf deployment)');
    console.log('   - AUTHORIZED_MARKET_CREATORS: Comma-separated wallet addresses');
    console.log('   - ADMIN_WALLETS: Admin wallet addresses\n');
    
    console.log('3. Features Enabled:');
    console.log('   ✅ Duplicate market prevention');
    console.log('   ✅ Automatic market end time monitoring');
    console.log('   ✅ Team member authorization system');
    console.log('   ✅ Proper timezone conversion with 5-minute buffer');
    console.log('   ✅ Deployment audit trail\n');
    
    console.log('4. API Endpoints:');
    console.log('   - GET  /api/markets/check-duplicate');
    console.log('   - GET  /api/market-creators');
    console.log('   - POST /api/market-creators');
    console.log('   - GET  /api/market-creators/check/:wallet');
    console.log('   - GET  /api/market-creators/deployment-log\n');
    
    console.log('5. First Match Alert 🚨');
    console.log('   Match #1: Al Ahly vs Inter Miami');
    console.log('   Date: June 14, 2025 at 20:00 ET');
    console.log('   Deploy by: June 14, 2025 at 16:00 ET (4 hours before)\n');
    
    console.log('🎯 READY FOR TOURNAMENT DEPLOYMENT!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
runMigration(); 