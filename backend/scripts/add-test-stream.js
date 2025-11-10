/**
 * Add a test stream for local development only
 * This is just for testing the UI locally
 */

const db = require('../database/db');

async function addTestStream() {
  try {
    console.log('🧪 Adding test stream for local development...');
    
    // Add a test stream
    await db.query(`
      INSERT INTO pumpfun_streams (
        token_address,
        title,
        symbol,
        creator_wallet,
        stream_url,
        is_live,
        is_featured,
        featured_order,
        viewer_count,
        is_active
      ) VALUES (
        'TEST' || substr(md5(random()::text), 1, 8) || '1111111111111111111111111',
        'TEST STREAM - Local Development',
        'TEST',
        'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z',
        'https://pump.fun',
        true,
        true,
        0,
        123,
        true
      )
      ON CONFLICT (token_address) DO NOTHING
    `);
    
    console.log('✅ Test stream added successfully');
    console.log('🌐 Visit http://localhost:3002/livestreams to see it');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding test stream:', error);
    process.exit(1);
  }
}

addTestStream();