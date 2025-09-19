/**
 * Test Livestream API Endpoints
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001';
const TEST_WALLET = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const TEST_STREAM_TOKEN = '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts'; // APES token

async function testLivestreamAPI() {
  console.log('🎥 Testing Livestream API Endpoints');
  console.log('═'.repeat(50));
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Stream: ${TEST_STREAM_TOKEN}`);
  
  const results = [];
  
  try {
    // Test 1: Get featured streams
    console.log('\n📌 Test 1: Get Featured Streams');
    try {
      const response = await axios.get(`${API_URL}/api/livestreams`);
      console.log('✅ Found streams:', response.data.streams.length);
      response.data.streams.forEach(stream => {
        console.log(`   - ${stream.title} (${stream.tokenAddress?.substring(0, 16)}...)`);
      });
      results.push({ test: 'Get featured streams', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get featured streams', status: 'FAILED' });
    }
    
    // Test 2: Get stream details
    console.log('\n📌 Test 2: Get Stream Details');
    try {
      const response = await axios.get(`${API_URL}/api/livestreams/${TEST_STREAM_TOKEN}`);
      const stream = response.data.stream;
      console.log('✅ Stream found:', stream.title);
      console.log(`   Token: ${stream.token_address}`);
      console.log(`   Live: ${stream.is_live}`);
      console.log(`   Featured: ${stream.is_featured}`);
      results.push({ test: 'Get stream details', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get stream details', status: 'FAILED' });
    }
    
    // Test 3: Create a market
    console.log('\n📌 Test 3: Create Stream Market');
    let marketId;
    try {
      const response = await axios.post(`${API_URL}/api/livestreams/${TEST_STREAM_TOKEN}/market`, {
        question: 'Will APES reach $1 in the next 5 minutes?',
        duration: 5,
        options: ['YES', 'NO'],
        creatorWallet: TEST_WALLET
      });
      
      const market = response.data.market;
      marketId = market.id;
      console.log('✅ Market created:', market.question);
      console.log(`   ID: ${market.id}`);
      console.log(`   Expires: ${new Date(market.expires_at).toLocaleString()}`);
      results.push({ test: 'Create stream market', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Create stream market', status: 'FAILED' });
    }
    
    // Test 4: Place a bet
    if (marketId) {
      console.log('\n📌 Test 4: Place Bet on Market');
      try {
        const response = await axios.post(`${API_URL}/api/livestreams/bet`, {
          marketId: marketId,
          option: 0, // YES
          amount: 0.1, // 0.1 SOL
          userWallet: TEST_WALLET
        });
        
        const bet = response.data.bet;
        console.log('✅ Bet placed successfully');
        console.log(`   Amount: ${bet.amount} SOL`);
        console.log(`   Option: ${bet.option === 0 ? 'YES' : 'NO'}`);
        results.push({ test: 'Place bet', status: 'PASSED' });
      } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
        results.push({ test: 'Place bet', status: 'FAILED' });
      }
    }
    
    // Test 5: Get stream markets
    console.log('\n📌 Test 5: Get Stream Markets');
    try {
      const response = await axios.get(`${API_URL}/api/livestreams/${TEST_STREAM_TOKEN}/markets`);
      console.log('✅ Markets found:', response.data.markets.length);
      response.data.markets.forEach(market => {
        console.log(`   - "${market.question.substring(0, 50)}..."`);
        console.log(`     Volume: ${market.total_volume} SOL`);
        console.log(`     Status: ${market.status}`);
      });
      results.push({ test: 'Get stream markets', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get stream markets', status: 'FAILED' });
    }
    
    // Test 6: Get market stats
    if (marketId) {
      console.log('\n📌 Test 6: Get Market Stats');
      try {
        const response = await axios.get(`${API_URL}/api/livestreams/market/${marketId}`);
        const market = response.data.market;
        console.log('✅ Market stats:');
        console.log(`   Total volume: ${market.total_volume} SOL`);
        console.log(`   Total bettors: ${market.total_bettors}`);
        console.log(`   Status: ${market.status}`);
        results.push({ test: 'Get market stats', status: 'PASSED' });
      } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
        results.push({ test: 'Get market stats', status: 'FAILED' });
      }
    }
    
    // Test 7: Get overall stats
    console.log('\n📌 Test 7: Get Overall Stats');
    try {
      const response = await axios.get(`${API_URL}/api/livestreams/stats/overview`);
      const stats = response.data.stats;
      console.log('✅ Platform stats:');
      console.log(`   Total streams: ${stats.total_streams}`);
      console.log(`   Live streams: ${stats.live_streams}`);
      console.log(`   Total markets: ${stats.total_markets}`);
      console.log(`   Active markets: ${stats.active_markets}`);
      console.log(`   Total volume: ${stats.total_volume} SOL`);
      results.push({ test: 'Get overall stats', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get overall stats', status: 'FAILED' });
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
  
  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('═'.repeat(50));
  results.forEach(r => {
    console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.test}`);
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const total = results.length;
  console.log(`\n🎯 Results: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Livestream system is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
}

// Run tests
testLivestreamAPI().catch(console.error);