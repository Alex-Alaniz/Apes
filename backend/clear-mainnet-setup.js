const pool = require('./database/db.js');

async function clearDevnetAndSetupMainnet() {
  try {
    console.log('🧹 Clearing old devnet data for mainnet deployment...');
    
    // First, clear all dependent tables to avoid foreign key constraint violations
    console.log('🔗 Clearing dependent tables first...');
    
    // Clear predictions table (references markets)
    const predictionsResult = await pool.query('DELETE FROM predictions');
    console.log(`✅ Cleared ${predictionsResult.rowCount || 0} predictions`);
    
    // Clear prediction_history table  
    const historyDeleteResult = await pool.query('DELETE FROM prediction_history');
    console.log(`✅ Cleared ${historyDeleteResult.rowCount || 0} prediction history records`);
    
    // Clear market comments (may reference markets)
    const commentsResult = await pool.query('DELETE FROM market_comments');
    console.log(`✅ Cleared ${commentsResult.rowCount || 0} market comments`);
    
    // Clear comment likes (may reference comments)
    const likesResult = await pool.query('DELETE FROM comment_likes');
    console.log(`✅ Cleared ${likesResult.rowCount || 0} comment likes`);
    
    // Clear markets cache
    const cacheDeleteResult = await pool.query('DELETE FROM markets_cache WHERE 1=1');
    console.log(`✅ Cleared ${cacheDeleteResult.rowCount || 0} cached markets`);
    
    // Now safe to delete markets (parent table)
    const marketDeleteResult = await pool.query('DELETE FROM markets');
    console.log(`✅ Cleared ${marketDeleteResult.rowCount || 0} old devnet markets`);
    
    // Check final counts
    const marketCount = await pool.query('SELECT COUNT(*) FROM markets');
    const historyCount = await pool.query('SELECT COUNT(*) FROM prediction_history');
    const cacheCount = await pool.query('SELECT COUNT(*) FROM markets_cache');
    const predictionsCount = await pool.query('SELECT COUNT(*) FROM predictions');
    
    console.log('📊 Final counts after cleanup:');
    console.log('   Markets:', parseInt(marketCount.rows[0].count));
    console.log('   Predictions:', parseInt(predictionsCount.rows[0].count));
    console.log('   Prediction History:', parseInt(historyCount.rows[0].count));
    console.log('   Cache:', parseInt(cacheCount.rows[0].count));
    
    console.log('\n🎉 Database cleaned for mainnet deployment!');
    console.log('📝 Next steps:');
    console.log('   1. Backend will now return empty markets array');
    console.log('   2. Frontend will show "No markets available" or empty state');
    console.log('   3. Ready to create real mainnet markets');
    console.log('   4. Consider upgrading Railway plan for reliable deployments');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

// Run the cleanup
clearDevnetAndSetupMainnet(); 