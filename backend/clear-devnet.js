const pool = require('./database/db.js');

async function clearDevnetData() {
  try {
    console.log('🧹 Clearing devnet markets...');
    
    // Delete all markets (they're all devnet since no mainnet markets deployed yet)
    await pool.query('DELETE FROM markets');
    console.log('✅ Cleared markets table');
    
    // Delete related data
    await pool.query('DELETE FROM prediction_history');
    console.log('✅ Cleared prediction_history table');
    
    await pool.query('DELETE FROM markets_cache WHERE 1=1');
    console.log('✅ Cleared markets_cache table');
    
    // Check counts
    const marketCount = await pool.query('SELECT COUNT(*) FROM markets');
    const historyCount = await pool.query('SELECT COUNT(*) FROM prediction_history');
    
    console.log('📊 Final counts:');
    console.log('   Markets:', parseInt(marketCount.rows[0].count));
    console.log('   Predictions:', parseInt(historyCount.rows[0].count));
    
    await pool.end();
    console.log('🎉 Devnet data cleared successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

clearDevnetData(); 