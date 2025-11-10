/**
 * Add real pump.fun-style tokens for testing
 */

const db = require('../database/db');

async function addRealPumpTokens() {
  console.log('🚀 Adding real Solana meme tokens as livestreams...');
  
  // Real popular Solana meme tokens that would be on pump.fun
  const realTokens = [
    {
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      name: 'Bonk',
      symbol: 'BONK',
      volume: 15000000,
      viewers: 1523
    },
    {
      address: '5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC',
      name: 'Popcat',
      symbol: 'POPCAT', 
      volume: 8500000,
      viewers: 892
    },
    {
      address: 'CatgQU4GJKvMpWfa2FySXLfPPwc24BgzyBBhq4jJ4Xrq',
      name: 'Solana Cat',
      symbol: 'SCAT',
      volume: 3200000,
      viewers: 445
    },
    {
      address: '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn',
      name: 'BODEN',
      symbol: 'BODEN',
      volume: 5600000,
      viewers: 623
    },
    {
      address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScAP5',
      name: 'cat in a dogs world', 
      symbol: 'MEW',
      volume: 12000000,
      viewers: 1245
    }
  ];

  try {
    for (const token of realTokens) {
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (token_address) 
        DO UPDATE SET 
          is_live = EXCLUDED.is_live,
          viewer_count = EXCLUDED.viewer_count,
          updated_at = NOW()
      `, [
        token.address,
        `${token.name} 🚀 Trading Live`,
        token.symbol,
        'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE', // Random creator
        `https://pump.fun/coin/${token.address}`,
        true,
        true,
        realTokens.indexOf(token),
        token.viewers,
        true
      ]);

      console.log(`✅ Added ${token.name} (${token.symbol}) - ${token.viewers} viewers`);
    }

    // Also add stream market data
    for (const token of realTokens) {
      await db.query(`
        UPDATE pumpfun_streams 
        SET 
          metadata = jsonb_build_object(
            'market_cap', $1,
            'volume_24h', $2,
            'price_change_24h', $3
          )
        WHERE token_address = $4
      `, [
        token.volume * 10, // Fake market cap
        token.volume,
        (Math.random() - 0.5) * 100, // Random price change
        token.address
      ]);
    }

    console.log('\n🎉 Real Solana tokens added as livestreams!');
    console.log('🌐 Visit http://localhost:3002/livestreams to see them');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addRealPumpTokens();