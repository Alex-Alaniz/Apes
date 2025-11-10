/**
 * Scrape pump.fun for currently live streams
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrapePumpFunStreams() {
  console.log('🔍 Scraping pump.fun for live streams...\n');

  try {
    // First, let's get the main page
    const response = await axios.get('https://pump.fun', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('✅ Fetched pump.fun homepage');

    // Parse HTML
    const $ = cheerio.load(response.data);

    // Look for livestream indicators
    const livestreams = [];

    // Method 1: Look for live badges or indicators
    $('.live-badge, .livestream-indicator, [class*="live"], [class*="stream"]').each((i, elem) => {
      const parent = $(elem).closest('a, div[data-token]');
      if (parent.length) {
        const href = parent.attr('href') || '';
        const tokenMatch = href.match(/coin\/([A-Za-z0-9]+)/);
        if (tokenMatch) {
          console.log(`Found potential livestream token: ${tokenMatch[1]}`);
        }
      }
    });

    // Method 2: Look in the page's JavaScript data
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('livestream')) {
        // Extract JSON data if present
        const jsonMatch = scriptContent.match(/\{[^{}]*"livestream"[^{}]*\}/g);
        if (jsonMatch) {
          jsonMatch.forEach(match => {
            try {
              const data = JSON.parse(match);
              console.log('Found livestream data:', data);
            } catch (e) {
              // Not valid JSON
            }
          });
        }
      }
    });

    // Method 3: Try the API endpoints that might work
    console.log('\n🔍 Checking API endpoints...');
    
    const apiEndpoints = [
      'https://pump.fun/api/coins',
      'https://api.pump.fun/coins',
      'https://frontend-api.pump.fun/coins'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const apiResponse = await axios.get(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://pump.fun/'
          },
          timeout: 5000
        });

        if (apiResponse.data) {
          console.log(`✅ Got response from ${endpoint}`);
          const coins = Array.isArray(apiResponse.data) ? apiResponse.data : apiResponse.data.coins;
          
          if (coins && coins.length > 0) {
            // Check each coin for livestream
            for (const coin of coins.slice(0, 10)) { // Check first 10
              if (coin.isLive || coin.livestream || coin.streaming) {
                livestreams.push({
                  tokenAddress: coin.mint || coin.address,
                  name: coin.name,
                  symbol: coin.symbol,
                  isLive: true
                });
              }
            }
          }
        }
      } catch (error) {
        // API didn't work
      }
    }

    // Method 4: Get trending tokens and check each one
    console.log('\n🔍 Checking trending tokens for livestreams...');
    
    // Look for token links on the page
    const tokenLinks = [];
    $('a[href*="/coin/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const match = href.match(/coin\/([A-Za-z0-9]+)/);
      if (match && match[1].length > 20) { // Likely a token address
        tokenLinks.push({
          address: match[1],
          text: $(elem).text().trim()
        });
      }
    });

    console.log(`Found ${tokenLinks.length} token links`);

    // Check first 5 tokens for livestreams
    for (const token of tokenLinks.slice(0, 5)) {
      try {
        console.log(`Checking ${token.text || token.address}...`);
        const tokenResponse = await axios.get(`https://pump.fun/coin/${token.address}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 5000
        });

        const tokenPage = tokenResponse.data;
        const hasLivestream = tokenPage.includes('Watch live') || 
                             tokenPage.includes('LIVE NOW') ||
                             tokenPage.includes('streaming now') ||
                             tokenPage.includes('class="live-indicator"');

        if (hasLivestream) {
          console.log(`✅ LIVESTREAM FOUND: ${token.text}`);
          livestreams.push({
            tokenAddress: token.address,
            name: token.text,
            isLive: true
          });
        }
      } catch (error) {
        console.log(`Failed to check ${token.address}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`Total livestreams found: ${livestreams.length}`);
    
    if (livestreams.length > 0) {
      console.log('\n🎥 Active Livestreams:');
      livestreams.forEach(stream => {
        console.log(`- ${stream.name} (${stream.tokenAddress})`);
      });
    } else {
      console.log('\n⚠️ No livestreams currently active on pump.fun');
      console.log('This could mean:');
      console.log('1. No tokens are currently livestreaming');
      console.log('2. Livestream feature may be region-restricted');
      console.log('3. The page structure has changed');
    }

    return livestreams;

  } catch (error) {
    console.error('Error scraping pump.fun:', error.message);
    return [];
  }
}

// Run the scraper
scrapePumpFunStreams().then(streams => {
  console.log('\n✅ Scraping complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});