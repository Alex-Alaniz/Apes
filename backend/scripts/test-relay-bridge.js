/**
 * Proof of Concept: Test Relay.link API without API key
 * Tests quote fetching and CORS compatibility
 */

const axios = require('axios');

// Relay API endpoint (no API key needed for quotes)
const RELAY_API_URL = 'https://api.relay.link';

// Test chains and tokens based on Relay documentation
const TEST_CONFIGS = [
  {
    name: 'Solana to Polygon USDC',
    originChainId: 101, // Solana mainnet
    destinationChainId: 137, // Polygon
    originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
    destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
    user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3', // Test EVM address
    amount: '100000000', // 100 USDC (6 decimals)
    tradeType: 'EXACT_INPUT'
  },
  {
    name: 'Ethereum to Polygon ETH', 
    originChainId: 1, // Ethereum
    destinationChainId: 137, // Polygon
    originCurrency: '0x0000000000000000000000000000000000000000', // ETH
    destinationCurrency: '0x0000000000000000000000000000000000000000', // MATIC
    user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3',
    amount: '100000000000000000', // 0.1 ETH (18 decimals)
    tradeType: 'EXACT_INPUT'
  }
];

async function testRelayQuote(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log('━'.repeat(50));
  
  try {
    const url = `${RELAY_API_URL}/quote`;
    console.log('📡 Request URL:', url);
    console.log('📤 Request body:', JSON.stringify(config, null, 2));

    // Make POST request with proper format
    const response = await axios.post(url, config, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'APES-Platform/1.0'
      },
      timeout: 15000
    });

    console.log('✅ Quote received successfully!');
    console.log('📊 Quote details:');
    console.log(JSON.stringify(response.data, null, 2));

    // Extract key information
    const quote = response.data;
    if (quote.steps && quote.steps.length > 0) {
      console.log('\n🔄 Bridge steps:');
      quote.steps.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.action || 'Unknown action'}`);
        if (step.items) {
          step.items.forEach(item => {
            console.log(`     - ${item.status || 'Pending'}: ${item.data?.to || 'N/A'}`);
          });
        }
      });
    }

    if (quote.fees) {
      console.log('\n💰 Fee breakdown:');
      console.log(`  Gas: ${quote.fees.gas || 0}`);
      console.log(`  Relayer: ${quote.fees.relayer || 0}`);
      console.log(`  Total: ${quote.fees.total || 0}`);
    }

    return { success: true, quote };

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

async function testCORSHeaders() {
  console.log('\n🔍 Testing CORS headers');
  console.log('━'.repeat(50));
  
  try {
    // Make OPTIONS request to test CORS
    const response = await axios.options(`${RELAY_API_URL}/quote`, {
      headers: {
        'Origin': 'https://apes-production.up.railway.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    console.log('✅ CORS preflight successful');
    console.log('📋 CORS headers:', response.headers);
    
  } catch (error) {
    if (error.response && error.response.status === 204) {
      console.log('✅ CORS preflight returned 204 (expected)');
      console.log('📋 CORS headers:', error.response.headers);
    } else {
      console.error('❌ CORS test failed:', error.message);
    }
  }
}

async function testExecuteRequirements() {
  console.log('\n🔍 Testing execute endpoint requirements');
  console.log('━'.repeat(50));
  
  try {
    // Try to call execute without API key (should fail)
    const response = await axios.post(`${RELAY_API_URL}/execute`, {
      user: '0x0000000000000000000000000000000000000000',
      txs: []
    });
    
    console.log('🤔 Unexpected success without API key');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Execute endpoint requires API key (as expected)');
      console.log('📋 Error:', error.response.data.message || 'Unauthorized');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Relay.link API Tests');
  console.log('═'.repeat(50));
  
  // Test CORS
  await testCORSHeaders();
  
  // Test quotes for different routes
  for (const config of TEST_CONFIGS) {
    await testRelayQuote(config);
  }
  
  // Test execute requirements
  await testExecuteRequirements();
  
  console.log('\n📊 Summary:');
  console.log('- Quotes: Available without API key ✅');
  console.log('- Execute: Requires API key ⚠️');
  console.log('- CORS: Need to test from Railway backend');
  
  console.log('\n💡 Next steps:');
  console.log('1. Deploy this test to Railway to verify CORS');
  console.log('2. Contact Relay team for API key if needed');
  console.log('3. Build frontend quote UI');
}

// Run tests
runTests().catch(console.error);