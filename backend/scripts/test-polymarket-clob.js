/**
 * Test script for Polymarket CLOB connection
 * Run with: node scripts/test-polymarket-clob.js
 */

require('dotenv').config();

async function testCLOBConnection() {
  console.log('🧪 Testing Polymarket CLOB Connection\n');
  
  // Check environment variables
  const apiKey = process.env.POLYMARKET_API_KEY;
  const apiSecret = process.env.POLYMARKET_API_SECRET;
  const passphrase = process.env.POLYMARKET_PASSPHRASE;
  const polygonAddress = process.env.POLYGON_ADDRESS;
  
  if (!apiKey || !apiSecret || !passphrase) {
    console.log('⚠️  Missing Polymarket API credentials');
    console.log('   Required: POLYMARKET_API_KEY, POLYMARKET_API_SECRET, POLYMARKET_PASSPHRASE');
    console.log('\n💡 To get API credentials:');
    console.log('   1. Run: node scripts/setup-polymarket-credentials.js');
    console.log('   2. Choose option 1 to create new wallet');
    console.log('   3. Save credentials to .env file');
    console.log('   4. Set USE_POLYMARKET_CLOB=true\n');
    console.log('\n📚 Or manually:');
    console.log('   1. Create a Polygon wallet');
    console.log('   2. Use the wallet to generate API credentials');
    console.log('   3. Add to backend/.env file:\n');
    console.log('   POLYGON_ADDRESS=your-polygon-address');
    console.log('   POLYGON_PRIVATE_KEY=your-private-key');
    console.log('   POLYMARKET_API_KEY=your-api-key');
    console.log('   POLYMARKET_API_SECRET=your-api-secret');
    console.log('   POLYMARKET_PASSPHRASE=your-passphrase');
    console.log('   USE_POLYMARKET_CLOB=true\n');
    return;
  }
  
  console.log('✅ API credentials found');
  console.log(`   API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Initialize CLOB service
  const clobService = require('../services/polymarketClobService');
  
  try {
    console.log('\n🔄 Initializing CLOB service...');
    await clobService.initialize(apiKey, apiSecret, passphrase, polygonAddress);
    
    // Wait for authentication
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📊 Service Status:');
    console.log(`   WebSocket Connected: ${clobService.isConnected()}`);
    console.log(`   Authenticated: ${clobService.isAuthenticated}`);
    
    // Test market data fetch
    console.log('\n🔍 Testing market data fetch...');
    
    // Example market ID (Bitcoin price market)
    const testMarketId = '0x0123456789abcdef'; // Replace with actual market ID
    
    try {
      console.log('   Fetching market info...');
      const marketInfo = await clobService.getMarketInfo(testMarketId);
      console.log('   ✅ Market info retrieved:', {
        question: marketInfo.question,
        volume: marketInfo.volume,
        liquidity: marketInfo.liquidity
      });
    } catch (error) {
      console.log(`   ⚠️  Market info failed: ${error.message}`);
      console.log('      (This is expected if the market ID is invalid)');
    }
    
    // Test order book fetch
    console.log('\n📈 Testing order book fetch...');
    
    // Example token ID
    const testTokenId = '12345678'; // Replace with actual token ID
    
    try {
      console.log('   Fetching order book...');
      const orderBook = await clobService.getOrderbook(testTokenId);
      console.log('   ✅ Order book retrieved:', {
        bids: orderBook.bids?.length || 0,
        asks: orderBook.asks?.length || 0,
        spread: orderBook.spread
      });
    } catch (error) {
      console.log(`   ⚠️  Order book failed: ${error.message}`);
      console.log('      (This is expected if the token ID is invalid)');
    }
    
    // Test WebSocket subscription
    console.log('\n🔔 Testing WebSocket subscription...');
    
    const unsubscribe = clobService.subscribeToMarket(testMarketId, (data) => {
      console.log('   📨 Market update received:', data);
    });
    
    console.log('   ✅ Subscribed to market updates');
    console.log('   ⏱️  Waiting 10 seconds for updates...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Clean up
    unsubscribe();
    console.log('   ✅ Unsubscribed from market updates');
    
    // Test statistics
    console.log('\n📊 Testing service integration...');
    const proxyService = require('../services/polymarketProxyService');
    await proxyService.initialize();
    
    const stats = await proxyService.getStats();
    console.log('   Integration Stats:', {
      clobConnected: stats.clobConnected,
      clobAuthenticated: stats.clobAuthenticated
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('   Stack trace:', error.stack);
  } finally {
    console.log('\n🔄 Disconnecting...');
    clobService.disconnect();
    console.log('✅ Test complete');
    process.exit(0);
  }
}

// Run the test
testCLOBConnection();