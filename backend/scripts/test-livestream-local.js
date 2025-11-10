#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:5001';

async function testLivestreams() {
  console.log('🧪 Testing Livestream Feature Locally\n');
  
  try {
    // Test 1: Check API health
    console.log('1️⃣ Checking API health...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ API is healthy\n');
    
    // Test 2: Get livestreams
    console.log('2️⃣ Fetching livestreams...');
    const streams = await axios.get(`${API_URL}/api/livestreams`);
    const streamCount = streams.data.streams?.length || 0;
    console.log(`✅ Found ${streamCount} livestreams`);
    
    if (streamCount > 0) {
      console.log('\n📺 Sample streams:');
      streams.data.streams.slice(0, 5).forEach(stream => {
        console.log(`   - ${stream.symbol}: ${stream.title} (${stream.viewer_count || 0} viewers)`);
      });
      
      // Test 3: Get details for first stream
      const firstStream = streams.data.streams[0];
      console.log(`\n3️⃣ Fetching details for ${firstStream.symbol}...`);
      const details = await axios.get(`${API_URL}/api/livestreams/${firstStream.token_address || firstStream.tokenAddress}`);
      console.log(`✅ Stream details fetched`);
      
      // Test 4: Check markets
      console.log(`\n4️⃣ Checking markets for ${firstStream.symbol}...`);
      const markets = await axios.get(`${API_URL}/api/livestreams/${firstStream.token_address || firstStream.tokenAddress}/markets`);
      const marketCount = markets.data.markets?.length || 0;
      console.log(`✅ Found ${marketCount} markets`);
    }
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📱 To view in browser:');
    console.log('   1. Make sure frontend is running: cd src/frontend && npm run dev');
    console.log('   2. Visit: http://localhost:3000/livestreams');
    console.log('   3. Click on any stream to see the player view');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Backend is running on port 5001');
    console.log('   - Database has livestream data (run: node scripts/add-real-pump-tokens.js)');
  }
}

testLivestreams();