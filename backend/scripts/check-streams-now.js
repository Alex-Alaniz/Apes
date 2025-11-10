const db = require('../database/db');

async function checkStreams() {
  try {
    const result = await db.query(`
      SELECT 
        token_address,
        title,
        symbol,
        viewer_count,
        is_live,
        is_featured,
        created_at
      FROM pumpfun_streams 
      WHERE is_active = true 
      ORDER BY viewer_count DESC
    `);
    
    console.log('\n📺 Active Livestreams in Database:');
    console.log('===================================');
    
    if (result.rows.length === 0) {
      console.log('⚠️  NO STREAMS FOUND IN DATABASE');
      console.log('\nTry running: node backend/scripts/add-real-pump-tokens.js');
    } else {
      result.rows.forEach(stream => {
        console.log(`\n${stream.symbol} - ${stream.title}`);
        console.log(`  👥 ${stream.viewer_count} viewers`);
        console.log(`  🔴 Status: ${stream.is_live ? 'LIVE' : 'offline'}`);
        console.log(`  ⭐ Featured: ${stream.is_featured ? 'YES' : 'NO'}`);
        console.log(`  📍 Address: ${stream.token_address}`);
      });
      console.log(`\n✅ Total: ${result.rows.length} streams`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

checkStreams();