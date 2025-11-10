/**
 * Test direct pump.fun API endpoints
 */

const axios = require('axios');

async function testPumpFunAPIs() {
  console.log('🔍 Testing pump.fun API endpoints...\n');

  const endpoints = [
    // Direct pump.fun endpoints
    'https://pump.fun/api/live',
    'https://pump.fun/api/livestreams',
    'https://pump.fun/api/streams',
    'https://api.pump.fun/live',
    'https://api.pump.fun/streams',
    'https://api.pump.fun/v1/streams',
    
    // Frontend API endpoints
    'https://frontend-api.pump.fun/livestreams',
    'https://frontend-api.pump.fun/streams/live',
    'https://frontend-api.pump.fun/coins/livestreaming',
    
    // Known pump.fun endpoints
    'https://frontend-api.pump.fun/coins/featured',
    'https://frontend-api.pump.fun/coins/trending',
    'https://frontend-api.pump.fun/coins/new',
    
    // Blockchain API
    'https://pumpapi.fun/api/live_streams',
    'https://pumpapi.fun/api/streams',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://pump.fun',
          'Referer': 'https://pump.fun/'
        },
        timeout: 10000
      });

      console.log(`✅ SUCCESS: ${endpoint}`);
      console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
      console.log('\n---\n');

      // If we find stream data, analyze the structure
      if (response.data && (Array.isArray(response.data) || response.data.streams || response.data.livestreams)) {
        console.log('🎉 Found potential stream data!');
        const streams = Array.isArray(response.data) ? response.data : (response.data.streams || response.data.livestreams);
        if (streams.length > 0) {
          console.log('First stream example:', JSON.stringify(streams[0], null, 2));
        }
      }

    } catch (error) {
      console.log(`❌ FAILED: ${endpoint}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        if (error.response.data) {
          console.log(`   Data:`, JSON.stringify(error.response.data).substring(0, 200));
        }
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('\n');
    }
  }

  // Also test the main pump.fun page
  try {
    console.log('\n🌐 Fetching pump.fun/live page...');
    const pageResponse = await axios.get('https://pump.fun/live', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Check if livestreams are mentioned in the page
    const pageText = pageResponse.data;
    if (pageText.includes('livestream') || pageText.includes('live-stream')) {
      console.log('✅ Livestreams mentioned on the page');
      
      // Look for API endpoints in the page
      const apiMatches = pageText.match(/api\.pump\.fun[^"'\s]*/g) || [];
      const frontendApiMatches = pageText.match(/frontend-api\.pump\.fun[^"'\s]*/g) || [];
      
      if (apiMatches.length > 0) {
        console.log('Found API endpoints:', [...new Set(apiMatches)]);
      }
      if (frontendApiMatches.length > 0) {
        console.log('Found frontend API endpoints:', [...new Set(frontendApiMatches)]);
      }
    } else {
      console.log('⚠️ No livestream content found on pump.fun/live');
    }
  } catch (error) {
    console.log('❌ Failed to fetch pump.fun/live page');
  }
}

testPumpFunAPIs().catch(console.error);