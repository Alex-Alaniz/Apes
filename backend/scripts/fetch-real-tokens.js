/**
 * Fetch real Solana tokens from DexScreener to populate as "streams"
 */

const axios = require('axios');
const db = require('../database/db');

async function fetchRealTokens() {
  try {
    console.log('🔍 Fetching real Solana tokens from DexScreener...');
    
    // Get trending tokens on Solana
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 10000
    });

    if (!response.data || !response.data.pairs) {
      console.log('No data from DexScreener');
      return;
    }

    // Filter for pump.fun tokens (Raydium pairs with decent liquidity)
    const pairs = response.data.pairs
      .filter(p => 
        p.baseToken && 
        p.baseToken.address && 
        p.baseToken.symbol &&
        p.liquidity && 
        parseFloat(p.liquidity.usd) > 5000 && // Min $5k liquidity
        p.volume && 
        parseFloat(p.volume.h24) > 10000 // Min $10k daily volume
      )
      .slice(0, 10); // Get top 10

    console.log(`✅ Found ${pairs.length} active tokens`);

    // Add them as "livestreams"
    for (const pair of pairs) {
      const token = pair.baseToken;
      
      // Check if it could be a pump.fun token (new, high activity)
      const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : 999;
      const isPumpFunLikely = ageHours < 48; // Created in last 48 hours
      
      const streamData = {
        tokenAddress: token.address,
        title: `${token.name} ${isPumpFunLikely ? '🚀 Launch' : 'Trading'} Live`,
        symbol: token.symbol,
        creatorWallet: pair.info?.owner || 'Unknown',
        streamUrl: `https://pump.fun/coin/${token.address}`,
        isLive: true,
        viewerCount: Math.min(Math.floor(parseFloat(pair.volume.h24) / 100), 9999), // Volume as proxy
        marketCap: parseFloat(pair.fdv || pair.marketCap || 0),
        volume24h: parseFloat(pair.volume.h24 || 0),
        priceChange24h: parseFloat(pair.priceChange.h24 || 0),
        liquidity: parseFloat(pair.liquidity.usd || 0)
      };

      try {
        // Insert into database
        await db.query(`
          INSERT INTO pumpfun_streams (
            token_address,
            title,
            symbol,
            creator_wallet,
            stream_url,
            is_live,
            is_featured,
            viewer_count,
            is_active,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (token_address) 
          DO UPDATE SET 
            is_live = EXCLUDED.is_live,
            viewer_count = EXCLUDED.viewer_count,
            title = EXCLUDED.title,
            updated_at = NOW()
        `, [
          streamData.tokenAddress,
          streamData.title,
          streamData.symbol,
          streamData.creatorWallet,
          streamData.streamUrl,
          streamData.isLive,
          isPumpFunLikely, // Feature new tokens
          streamData.viewerCount,
          true
        ]);

        console.log(`✅ Added: ${token.name} (${token.symbol}) - $${(streamData.volume24h/1000).toFixed(1)}k vol, ${streamData.viewerCount} viewers`);
      } catch (error) {
        console.error(`Failed to add ${token.symbol}:`, error.message);
      }
    }

    console.log('\n🎉 Real tokens added successfully!');
    console.log('Visit http://localhost:3002/livestreams to see them');

  } catch (error) {
    console.error('Error fetching tokens:', error.message);
  } finally {
    process.exit(0);
  }
}

fetchRealTokens();