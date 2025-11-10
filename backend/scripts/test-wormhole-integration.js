/**
 * Test Wormhole Integration
 * Verify SDK setup and quote functionality
 */

const WormholeService = require('../services/wormholeService');

async function testWormholeSetup() {
  console.log('🧪 Testing Wormhole SDK Setup');
  console.log('═'.repeat(50));
  
  const wormhole = new WormholeService();
  
  try {
    // Test 1: Initialize SDK
    console.log('\n📌 Test 1: SDK Initialization');
    await wormhole.initialize();
    console.log('✅ SDK initialized successfully');
    
    // Test 2: Get supported tokens
    console.log('\n📌 Test 2: Get Supported Tokens');
    const solanaTokens = await wormhole.getSupportedTokens('Solana');
    const polygonTokens = await wormhole.getSupportedTokens('Polygon');
    
    console.log('Solana tokens:', solanaTokens);
    console.log('Polygon tokens:', polygonTokens);
    
    // Test 3: Get bridge quote
    console.log('\n📌 Test 3: Get Bridge Quote (Solana USDC → Polygon)');
    const quote = await wormhole.getQuote({
      fromChain: 'Solana',
      toChain: 'Polygon',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      amount: 100000000 // 100 USDC
    });
    
    console.log('Quote result:', JSON.stringify(quote, null, 2));
    
    // Test 4: Check transfer status (mock)
    console.log('\n📌 Test 4: Check Transfer Status');
    const status = await wormhole.getTransferStatus('mock-tx-id', 'Solana');
    console.log('Status:', status);
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testWormholeSetup().catch(console.error);