const db = require('./config/database');

async function insertTestMarket() {
  try {
    console.log('🧪 Inserting test market with assets...');
    
    const testMarket = {
      market_address: 'TEST123456789ABCDEF',
      creator: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z',
      question: 'Will Bitcoin reach $100,000 by end of 2025?',
      description: 'Test market to verify asset pipeline',
      category: 'crypto',
      resolution_date: new Date('2025-12-31'),
      status: 'Active',
      options: ['Yes', 'No'], // PostgreSQL array format
      poly_id: 'test-event-12345',
      apechain_market_id: '12345',
      assets: JSON.stringify({
        banner: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-banner.jpg',
        icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-icon.png'
      }),
      options_metadata: JSON.stringify([
        { label: 'Yes', icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/yes-icon.png' },
        { label: 'No', icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/no-icon.png' }
      ]),
      option_volumes: [0, 0],
      total_volume: 0,
      min_bet: 10
    };

    const query = `
      INSERT INTO markets (
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        options,
        poly_id,
        apechain_market_id,
        assets,
        options_metadata,
        option_volumes,
        total_volume,
        min_bet,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      ON CONFLICT (market_address) DO UPDATE SET
        assets = EXCLUDED.assets,
        options_metadata = EXCLUDED.options_metadata,
        updated_at = NOW()
    `;

    const values = [
      testMarket.market_address,
      testMarket.creator,
      testMarket.question,
      testMarket.description,
      testMarket.category,
      testMarket.resolution_date,
      testMarket.status,
      testMarket.options,
      testMarket.poly_id,
      testMarket.apechain_market_id,
      testMarket.assets,
      testMarket.options_metadata,
      testMarket.option_volumes,
      testMarket.total_volume,
      testMarket.min_bet
    ];

    const result = await db.query(query, values);
    console.log('✅ Test market inserted successfully!');
    
    // Verify the insertion
    const verifyQuery = `
      SELECT 
        market_address,
        question,
        assets,
        options_metadata,
        poly_id,
        created_at
      FROM markets 
      WHERE market_address = $1
    `;
    
    const verifyResult = await db.query(verifyQuery, [testMarket.market_address]);
    
    if (verifyResult.rows.length > 0) {
      const market = verifyResult.rows[0];
      console.log('📋 Verified market in database:');
      console.log(`  Question: ${market.question}`);
      console.log(`  Assets: ${typeof market.assets === 'string' ? 'JSON string' : 'object'}`);
      console.log(`  Poly ID: ${market.poly_id}`);
      console.log(`  Created: ${market.created_at}`);
      
      // Test parsing
      try {
        const parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
        console.log(`  Banner URL: ${parsedAssets.banner}`);
        console.log(`  Icon URL: ${parsedAssets.icon}`);
      } catch (e) {
        console.error('  ❌ Error parsing assets:', e);
      }
    }
    
    console.log('\n🎯 Test complete! You can now:');
    console.log('1. Visit http://localhost:3000/markets to see the test market');
    console.log('2. Check the API: curl "http://localhost:5001/api/markets"');
    console.log('3. Assets should display properly in the frontend');
    
  } catch (error) {
    console.error('❌ Error inserting test market:', error);
  } finally {
    process.exit(0);
  }
}

insertTestMarket(); 