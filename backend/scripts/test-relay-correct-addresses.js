/**
 * Test Relay.link with correct address formats
 * Based on error messages from previous tests
 */

const axios = require('axios');

const RELAY_API_URL = 'https://api.relay.link';

// Test configurations with proper address formats
const CORRECT_CONFIGS = [
  {
    name: 'Solana USDC to Polygon USDC (Solana origin address)',
    params: {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // Solana address for Solana origin
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Polygon USDC to Solana USDC (EVM origin address)',
    params: {
      originChainId: 137,
      destinationChainId: 792703809,
      originCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      destinationCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM address for EVM origin
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Solana USDC to Polygon with recipient override',
    params: {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // Solana address
      recipient: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM recipient
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Polygon USDC to Solana with recipient override',
    params: {
      originChainId: 137,
      destinationChainId: 792703809,
      originCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      destinationCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      user: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // EVM address
      recipient: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // Solana recipient
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  {
    name: 'Native SOL to Polygon MATIC',
    params: {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: '11111111111111111111111111111111',
      destinationCurrency: '0x0000000000000000000000000000000000000000',
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // Solana address
      amount: '1000000000', // 1 SOL
      tradeType: 'EXACT_INPUT'
    }
  }
];

async function testQuote(config) {
  console.log(`\n🧪 Testing: ${config.name}`);
  console.log('━'.repeat(60));
  console.log('Request:', JSON.stringify(config.params, null, 2));
  
  try {
    const response = await axios.post(`${RELAY_API_URL}/quote`, config.params, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('\n✅ SUCCESS!');
    
    const quote = response.data;
    if (quote.fees) {
      console.log('\n💰 Fees:');
      console.log(`- Gas: ${quote.fees.gas?.amountFormatted || 0} ${quote.fees.gas?.currency?.symbol || ''}`);
      console.log(`- Relayer: ${quote.fees.relayer?.amountFormatted || 0} ${quote.fees.relayer?.currency?.symbol || ''}`);
    }
    
    if (quote.steps && quote.steps[0]) {
      console.log('\n📝 First Step:', quote.steps[0].action || 'N/A');
    }
    
    return { success: true };
    
  } catch (error) {
    console.log('\n❌ FAILED');
    console.log(`Error: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

async function runTests() {
  console.log('🚀 Relay.link Corrected Address Test');
  console.log('═'.repeat(60));
  console.log('\n📌 Key Finding: User field must match ORIGIN chain address type');
  console.log('- Solana origin → Use Solana address');
  console.log('- EVM origin → Use EVM address');
  console.log('- Use recipient field to override destination address');
  
  const results = [];
  for (const config of CORRECT_CONFIGS) {
    const result = await testQuote(config);
    results.push({
      name: config.name,
      success: result.success
    });
  }
  
  console.log('\n\n📊 SUMMARY');
  console.log('═'.repeat(60));
  
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const confidence = (successCount / results.length) * 100;
  
  console.log(`\n🎯 Confidence Level: ${confidence.toFixed(0)}%`);
  
  if (confidence >= 80) {
    console.log('\n✨ READY FOR IMPLEMENTATION!');
    console.log('\nWorking Parameters:');
    console.log('1. Chain ID 792703809 for Solana ✓');
    console.log('2. User field = origin chain address type ✓');
    console.log('3. Use recipient field for cross-chain addresses ✓');
    console.log('4. CORS allows all origins (*) ✓');
  } else {
    console.log('\n⚠️ Still need more testing...');
  }
}

runTests().catch(console.error);