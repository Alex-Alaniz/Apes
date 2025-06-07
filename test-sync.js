#!/usr/bin/env node

/**
 * Test script to verify blockchain sync is working correctly
 * Usage: node test-sync.js
 */

const blockchainSyncService = require('./src/backend/services/blockchainSyncService');

async function testSync() {
  console.log('🧪 Testing Blockchain Sync Service');
  console.log('=====================================');

  try {
    // Test the sync service
    console.log('1. Starting sync test...');
    const success = await blockchainSyncService.syncUserPositions();
    
    if (success) {
      console.log('✅ Sync completed successfully!');
    } else {
      console.log('❌ Sync failed');
    }

    // Check if we can connect to database
    const db = require('./src/backend/config/database');
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(DISTINCT wallet_address) as unique_users,
        SUM(amount) as total_volume
      FROM prediction_history
    `);

    const stats = result.rows[0];
    console.log('\n📊 Sync Results:');
    console.log(`   Total Predictions: ${stats.total_predictions}`);
    console.log(`   Unique Users: ${stats.unique_users}`);
    console.log(`   Total Volume: ${Number(stats.total_volume).toFixed(2)} APES`);

    if (Number(stats.total_predictions) > 0) {
      console.log('\n✅ SUCCESS: Position data found in database!');
      console.log('   The leaderboard should now show correct "Total Invested" amounts.');
    } else {
      console.log('\n⚠️  No position data found. This could mean:');
      console.log('   - No predictions exist on the blockchain yet');
      console.log('   - The program ID or network configuration needs adjustment');
      console.log('   - The prediction account structure parsing needs refinement');
    }

    await db.end();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSync().catch(console.error); 