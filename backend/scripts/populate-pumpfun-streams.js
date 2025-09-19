/**
 * Populate PumpFun streams with realistic data
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=disable"
});

const pumpFunStreams = [
  {
    token_address: '9h5y3WCqfeNt2fiAP7iM2ZRp9apFb58ipvTzcWi9pump',
    title: '🔧 Building APES Livestream Markets',
    symbol: 'DEVLIVE',
    creator_wallet: 'DevWallet123',
    stream_url: 'https://pump.fun/coin/9h5y3WCqfeNt2fiAP7iM2ZRp9apFb58ipvTzcWi9pump',
    viewer_count: 342,
    is_live: true,
    is_featured: true,
    featured_order: 1
  },
  {
    token_address: 'V5cCiSixPLAiEDX2zZquT5VuLm4prr5t35PWmjNpump',
    title: '📈 Pump.fun Trading Strategies',
    symbol: 'TRADER',
    creator_wallet: 'TraderPro456',
    stream_url: 'https://pump.fun/coin/V5cCiSixPLAiEDX2zZquT5VuLm4prr5t35PWmjNpump',
    viewer_count: 567,
    is_live: true,
    is_featured: true,
    featured_order: 2
  },
  {
    token_address: '7GQa9J5ztJPumpFunTokenAddressExample123pump',
    title: '🚀 Meme Coin Reviews',
    symbol: 'MEMES',
    creator_wallet: 'MemeKing789',
    stream_url: 'https://pump.fun/coin/7GQa9J5ztJPumpFunTokenAddressExample123pump',
    viewer_count: 890,
    is_live: true,
    is_featured: true,
    featured_order: 3
  },
  {
    token_address: 'K8nX4vLiveStreamingCryptoGamingToken456pump',
    title: '🎮 Crypto Gaming Live',
    symbol: 'GAME',
    creator_wallet: 'GamerX',
    stream_url: 'https://pump.fun/coin/K8nX4vLiveStreamingCryptoGamingToken456pump',
    viewer_count: 234,
    is_live: true,
    is_featured: true,
    featured_order: 4
  },
  {
    token_address: 'M3meCoinFactoryLiveProductionStream789pump',
    title: '🏭 Meme Coin Factory',
    symbol: 'FACTORY',
    creator_wallet: 'FactoryOwner',
    stream_url: 'https://pump.fun/coin/M3meCoinFactoryLiveProductionStream789pump',
    viewer_count: 456,
    is_live: true,
    is_featured: true,
    featured_order: 5
  },
  {
    token_address: 'ChartAnalysisProLiveEducationStream321pump',
    title: '📊 Chart Analysis Pro',
    symbol: 'CHARTS',
    creator_wallet: 'ChartMaster',
    stream_url: 'https://pump.fun/coin/ChartAnalysisProLiveEducationStream321pump',
    viewer_count: 678,
    is_live: false,
    is_featured: true,
    featured_order: 6
  }
];

async function populateStreams() {
  console.log('🚀 Populating PumpFun streams...\n');

  try {
    // Clear existing non-APES streams
    await pool.query(`
      DELETE FROM pumpfun_streams 
      WHERE token_address NOT LIKE '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts'
    `);

    // Insert new streams
    for (const stream of pumpFunStreams) {
      const result = await pool.query(`
        INSERT INTO pumpfun_streams (
          token_address,
          title,
          symbol,
          creator_wallet,
          stream_url,
          viewer_count,
          is_live,
          is_active,
          is_featured,
          featured_order,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (token_address) 
        DO UPDATE SET
          title = EXCLUDED.title,
          viewer_count = EXCLUDED.viewer_count,
          is_live = EXCLUDED.is_live,
          is_featured = EXCLUDED.is_featured,
          featured_order = EXCLUDED.featured_order,
          updated_at = NOW()
        RETURNING *
      `, [
        stream.token_address,
        stream.title,
        stream.symbol,
        stream.creator_wallet,
        stream.stream_url,
        stream.viewer_count,
        stream.is_live,
        true, // is_active
        stream.is_featured,
        stream.featured_order
      ]);

      console.log(`✅ Added: ${stream.title}`);
      console.log(`   Token: ${stream.token_address}`);
      console.log(`   Live: ${stream.is_live ? '🔴 YES' : '⚫ NO'}`);
      console.log(`   Viewers: ${stream.viewer_count}`);
      console.log('');
    }

    // Create initial markets for live streams
    console.log('🎯 Creating initial markets for live streams...\n');

    const liveStreams = pumpFunStreams.filter(s => s.is_live);
    
    for (const stream of liveStreams) {
      // Create a welcome market
      const marketQuestions = [
        `Will ${stream.title} reach 1000 viewers in the next 5 minutes?`,
        `Will the stream hit a new milestone in the next 5 minutes?`,
        `Will something epic happen in the next 5 minutes?`,
        `Will the streamer achieve their goal in the next 5 minutes?`
      ];

      const question = marketQuestions[Math.floor(Math.random() * marketQuestions.length)];

      await pool.query(`
        INSERT INTO stream_markets (
          stream_token,
          question,
          options,
          duration_minutes,
          creator_wallet,
          created_at,
          expires_at,
          status
        ) VALUES ($1, $2, '["YES", "NO"]'::jsonb, 5, $3, NOW(), NOW() + INTERVAL '5 minutes', 'active')
      `, [stream.token_address, question, stream.creator_wallet]);

      console.log(`🎯 Created market for ${stream.symbol}: "${question}"`);
    }

    console.log('\n✅ Successfully populated PumpFun streams!');
    
    // Show summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_streams,
        COUNT(*) FILTER (WHERE is_live = true) as live_streams,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_streams
      FROM pumpfun_streams
    `);

    console.log('\n📊 Summary:');
    console.log(`   Total streams: ${summary.rows[0].total_streams}`);
    console.log(`   Live streams: ${summary.rows[0].live_streams}`);
    console.log(`   Featured streams: ${summary.rows[0].featured_streams}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the population
populateStreams();