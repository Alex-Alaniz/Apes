/**
 * Test Circle CCTP Integration
 * Verify USDC bridging functionality
 */

const CCTPService = require('../services/cctpService');

async function testCCTPSetup() {
  console.log('🧪 Testing Circle CCTP Integration');
  console.log('═'.repeat(50));
  
  const cctp = new CCTPService();
  
  try {
    // Test 1: Initialize service
    console.log('\n📌 Test 1: Service Initialization');
    await cctp.initialize();
    console.log('✅ CCTP service initialized');
    
    // Test 2: Get quote for Polygon → Ethereum USDC transfer
    console.log('\n📌 Test 2: Get Bridge Quote (Polygon → Ethereum)');
    const quote = await cctp.getQuote({
      fromChain: 137, // Polygon
      toChain: 1,     // Ethereum
      amount: '100000000' // 100 USDC (6 decimals)
    });
    
    console.log('Quote result:', JSON.stringify(quote, null, 2));
    
    // Test 3: Test address conversion
    console.log('\n📌 Test 3: Address Conversion');
    const evmAddress = '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3';
    const bytes32 = cctp.addressToBytes32(evmAddress);
    console.log(`EVM Address: ${evmAddress}`);
    console.log(`Bytes32: ${bytes32}`);
    
    // Test 4: Check attestation API (with fake tx)
    console.log('\n📌 Test 4: Attestation API Check');
    const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const attestation = await cctp.getAttestation(mockTxHash);
    console.log('Attestation result:', attestation);
    
    // Test 5: Cross-chain support matrix
    console.log('\n📌 Test 5: Supported Routes');
    const routes = [
      { from: 1, to: 137, name: 'Ethereum → Polygon' },
      { from: 137, to: 1, name: 'Polygon → Ethereum' },
      { from: 1, to: 42161, name: 'Ethereum → Arbitrum' },
      { from: 137, to: 42161, name: 'Polygon → Arbitrum' }
    ];
    
    for (const route of routes) {
      const routeQuote = await cctp.getQuote({
        fromChain: route.from,
        toChain: route.to,
        amount: '100000000'
      });
      console.log(`${route.name}: ${routeQuote.supported ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ All tests completed successfully');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testCCTPSetup().catch(console.error);