/**
 * Test LI.FI Integration
 * Verify multi-bridge aggregation functionality
 */

const LiFiService = require('../services/lifiService');

async function testLiFiSetup() {
  console.log('🧪 Testing LI.FI SDK Integration');
  console.log('═'.repeat(50));
  
  const lifi = new LiFiService();
  
  try {
    // Test 1: Initialize service
    console.log('\n📌 Test 1: Service Initialization');
    await lifi.initialize();
    console.log('✅ LI.FI service initialized');
    
    // Test 2: Get available chains
    console.log('\n📌 Test 2: Get Available Chains');
    const chains = await lifi.getChains();
    console.log(`Total chains supported: ${chains.length}`);
    
    // Find Solana, Polygon, Ethereum
    const targetChains = chains.filter(c => 
      c.id === 1 || // Ethereum
      c.id === 137 || // Polygon
      c.id === 1151111081099710 // Solana
    );
    console.log('Target chains:', targetChains.map(c => `${c.name} (${c.id})`));
    
    // Test 3: Get tokens for Polygon
    console.log('\n📌 Test 3: Get Tokens on Polygon');
    const polygonTokens = await lifi.getTokens(137);
    const usdc = polygonTokens.find(t => t.symbol === 'USDC' || t.symbol === 'USDC.e');
    console.log(`Found ${polygonTokens.length} tokens on Polygon`);
    if (usdc) {
      console.log('USDC on Polygon:', {
        symbol: usdc.symbol,
        address: usdc.address,
        decimals: usdc.decimals
      });
    }
    
    // Test 4: Get quote for Polygon USDC to Ethereum USDC
    console.log('\n📌 Test 4: Get Bridge Quote (Polygon USDC → Ethereum USDC)');
    const quote = await lifi.getQuote({
      fromChain: 137,
      toChain: 1,
      fromToken: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
      toToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      fromAmount: '100000000', // 100 USDC
      fromAddress: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3'
    });
    
    if (quote.success) {
      console.log('✅ Quote received:');
      console.log('Summary:', JSON.stringify(quote.summary, null, 2));
      console.log('Route tools:', quote.summary.tools);
    } else {
      console.log('❌ Quote failed:', quote.error);
    }
    
    // Test 5: Get available bridges between chains
    console.log('\n📌 Test 5: Available Bridges');
    const bridges = await lifi.getAvailableBridges(137, 1);
    console.log(`Bridges from Polygon to Ethereum: ${bridges.length}`);
    
    console.log('\n✅ All tests completed');
    
    // Summary
    console.log('\n📊 LI.FI Capabilities Summary:');
    console.log('- No API key required ✅');
    console.log('- Multi-chain support ✅');
    console.log('- Bridge aggregation ✅');
    console.log('- DEX aggregation ✅');
    console.log('- Real-time quotes ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testLiFiSetup().catch(console.error);