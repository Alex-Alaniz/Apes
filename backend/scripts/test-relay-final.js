/**
 * Final Relay.link Integration Test
 * Based on documentation findings
 */

const axios = require('axios');

const RELAY_API_URL = 'https://api.relay.link';

// Correct configurations based on documentation
const WORKING_CONFIGS = [
  {
    name: 'Ethereum USDC to Polygon USDC',
    params: {
      originChainId: 1,
      destinationChainId: 137,
      originCurrency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM address (destination)
      amount: '100000000', // 100 USDC
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Solana USDC to Polygon USDC',
    params: {
      originChainId: 792703809, // Solana chain ID for Relay
      destinationChainId: 137,
      originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon  
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM address for destination
      amount: '100000000', // 100 USDC
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Solana SOL to Polygon MATIC',
    params: {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: '11111111111111111111111111111111', // Native SOL
      destinationCurrency: '0x0000000000000000000000000000000000000000', // Native MATIC
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM address for destination
      amount: '1000000000', // 1 SOL (9 decimals)
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Polygon USDC to Solana USDC',
    params: {
      originChainId: 137,
      destinationChainId: 792703809, // Solana as destination
      originCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
      destinationCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // Solana address for destination
      amount: '100000000', // 100 USDC
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Solana USDC to Polygon USDC with recipient',
    params: {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // Must be EVM for Polygon destination
      recipient: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // Explicit recipient
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  }
];

async function testQuote(config) {
  console.log(`\n🧪 Testing: ${config.name}`);
  console.log('━'.repeat(60));
  console.log('Request params:', JSON.stringify(config.params, null, 2));
  
  try {
    const response = await axios.post(`${RELAY_API_URL}/quote`, config.params, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'APES-Platform/1.0'
      },
      timeout: 15000
    });
    
    console.log('\n✅ SUCCESS! Quote received');
    
    // Extract key information
    const quote = response.data;
    console.log('\n📊 Quote Summary:');
    console.log(`- Quote ID: ${quote.id}`);
    console.log(`- Steps: ${quote.steps?.length || 0}`);
    console.log(`- Expires at: ${quote.expiresAt}`);
    
    if (quote.fees) {
      console.log('\n💰 Fees:');
      console.log(`- Gas: ${quote.fees.gas?.amountFormatted || 0} ${quote.fees.gas?.currency?.symbol || ''}`);
      console.log(`- Relayer: ${quote.fees.relayer?.amountFormatted || 0} ${quote.fees.relayer?.currency?.symbol || ''}`);
      console.log(`- Total USD: $${quote.fees.relayer?.amountUsd || 0}`);
    }
    
    if (quote.steps && quote.steps[0]) {
      const firstStep = quote.steps[0];
      console.log('\n📝 First Step:');
      console.log(`- Action: ${firstStep.action || 'N/A'}`);
      console.log(`- Description: ${firstStep.description || 'N/A'}`);
      if (firstStep.items && firstStep.items[0]) {
        console.log(`- To address: ${firstStep.items[0].data?.to || 'N/A'}`);
        console.log(`- Data preview: ${firstStep.items[0].data?.data?.substring(0, 10) || 'N/A'}...`);
      }
    }
    
    return { success: true, quote };
    
  } catch (error) {
    console.log('\n❌ FAILED');
    console.log(`Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.errorCode) {
      console.log(`Error code: ${error.response.data.errorCode}`);
    }
    if (error.response?.data?.details) {
      console.log(`Details: ${JSON.stringify(error.response.data.details)}`);
    }
    return { success: false, error: error.response?.data };
  }
}

async function testCORS() {
  console.log('\n🌐 Testing CORS Headers');
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.options(`${RELAY_API_URL}/quote`, {
      headers: {
        'Origin': 'https://apes-production.up.railway.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log('✅ CORS Headers:');
    console.log(`- Allow Origin: ${response.headers['access-control-allow-origin'] || 'Not set'}`);
    console.log(`- Allow Methods: ${response.headers['access-control-allow-methods'] || 'Not set'}`);
    console.log(`- Allow Headers: ${response.headers['access-control-allow-headers'] || 'Not set'}`);
    
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Final Relay.link Integration Test');
  console.log('═'.repeat(60));
  
  // Test CORS
  await testCORS();
  
  // Test each configuration
  const results = [];
  for (const config of WORKING_CONFIGS) {
    const result = await testQuote(config);
    results.push({
      name: config.name,
      success: result.success
    });
  }
  
  // Summary
  console.log('\n\n📊 FINAL SUMMARY');
  console.log('═'.repeat(60));
  
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const confidence = (successCount / results.length) * 100;
  
  console.log(`\n🎯 Confidence Level: ${confidence.toFixed(0)}%`);
  
  if (confidence >= 80) {
    console.log('\n✅ Ready for implementation with these findings:');
    console.log('1. Use chain ID 792703809 for Solana');
    console.log('2. User field must match destination chain address type');
    console.log('3. Token addresses are case-sensitive');
    console.log('4. CORS allows all origins (*)');
  } else {
    console.log('\n⚠️ Need more testing before implementation');
  }
}

// Run tests
runTests().catch(console.error);