/**
 * Debug Relay.link Parameters
 * Goal: Understand exact requirements for successful quotes
 */

const axios = require('axios');

const RELAY_API_URL = 'https://api.relay.link';

// Test different parameter combinations
const PARAMETER_TESTS = {
  // Test 1: Native token transfers (ETH to MATIC)
  nativeTokens: {
    test: 'ETH to MATIC native tokens',
    params: {
      originChainId: 1,
      destinationChainId: 137,
      originCurrency: '0x0000000000000000000000000000000000000000',
      destinationCurrency: '0x0000000000000000000000000000000000000000',
      user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3',
      amount: '100000000000000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  
  // Test 2: USDC on same chain (Ethereum)
  sameChainUSDC: {
    test: 'USDC on Ethereum (same chain)',
    params: {
      originChainId: 1,
      destinationChainId: 1,
      originCurrency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
      destinationCurrency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3',
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  
  // Test 3: Cross-chain USDC
  crossChainUSDC: {
    test: 'USDC Ethereum to Polygon',
    params: {
      originChainId: 1,
      destinationChainId: 137,
      originCurrency: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
      destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
      user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3',
      amount: '100000000',
      tradeType: 'EXACT_INPUT'
    }
  },
  
  // Test 4: Different user address formats
  addressFormats: {
    test: 'Different address formats',
    variations: [
      {
        name: 'Lowercase address',
        user: '0x742d35cc6634c0532925a3b844d4db0a2d7dd5b3'
      },
      {
        name: 'Checksum address', 
        user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3'
      },
      {
        name: 'Different valid address',
        user: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // vitalik.eth
      }
    ]
  }
};

// Test different Solana configurations
const SOLANA_TESTS = {
  // Test various Solana address formats
  solanaAddresses: {
    test: 'Solana address formats',
    variations: [
      {
        name: 'Solana USDC mint address',
        originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      },
      {
        name: 'Lowercase Solana address',
        originCurrency: 'epjfwdd5aufqssqem2qn1xzybapC8g4weggkzwytdt1v'
      },
      {
        name: 'Native SOL (system program)',
        originCurrency: '11111111111111111111111111111111'
      },
      {
        name: 'Native SOL (wrapped)',
        originCurrency: 'So11111111111111111111111111111111111111112'
      }
    ]
  },
  
  // Test user field for Solana
  solanaUsers: {
    test: 'User field for Solana origin',
    variations: [
      {
        name: 'EVM address as user',
        user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3'
      },
      {
        name: 'Solana address as user',
        user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' // Random Solana address
      },
      {
        name: 'Empty user field',
        user: ''
      }
    ]
  }
};

async function testParameters(testName, params) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('Parameters:', JSON.stringify(params, null, 2));
  
  try {
    const response = await axios.post(`${RELAY_API_URL}/quote`, params, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Quote received');
    console.log('Key details:', {
      fees: response.data.fees,
      steps: response.data.steps?.length || 0,
      toAmount: response.data.toAmount
    });
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errorCode) {
      console.log('Error code:', error.response.data.errorCode);
    }
    return { success: false, error: error.response?.data };
  }
}

async function runParameterTests() {
  console.log('🔍 Relay.link Parameter Testing');
  console.log('═'.repeat(50));
  
  // Test basic EVM transfers
  console.log('\n📌 EVM Chain Tests:');
  for (const [key, config] of Object.entries(PARAMETER_TESTS)) {
    if (config.params) {
      await testParameters(config.test, config.params);
    }
  }
  
  // Test address variations
  console.log('\n📌 Address Format Tests:');
  const baseParams = PARAMETER_TESTS.crossChainUSDC.params;
  for (const variation of PARAMETER_TESTS.addressFormats.variations) {
    await testParameters(
      variation.name,
      { ...baseParams, user: variation.user }
    );
  }
  
  // Test Solana parameters
  console.log('\n📌 Solana Tests:');
  const solanaBase = {
    originChainId: 792703809, // Correct Solana chain ID for Relay
    destinationChainId: 137,
    destinationCurrency: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
    amount: '100000000', // 100 USDC (6 decimals)
    tradeType: 'EXACT_INPUT'
  };
  
  // Test different Solana currencies
  for (const variation of SOLANA_TESTS.solanaAddresses.variations) {
    await testParameters(
      `Solana currency: ${variation.name}`,
      { 
        ...solanaBase,
        originCurrency: variation.originCurrency,
        user: '0x742d35Cc6634C0532925a3b844D4DB0a2D7DD5B3'
      }
    );
  }
  
  // Test different user formats for Solana
  console.log('\n📌 Testing Solana with proper user address:');
  await testParameters(
    'Solana USDC to Polygon with Solana user address',
    {
      ...solanaBase,
      originCurrency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana (case sensitive!)
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' // Solana address
    }
  );
  
  // Test SOL to Polygon
  await testParameters(
    'Native SOL to Polygon MATIC',
    {
      originChainId: 792703809,
      destinationChainId: 137,
      originCurrency: '11111111111111111111111111111111', // Native SOL
      destinationCurrency: '0x0000000000000000000000000000000000000000', // MATIC
      amount: '1000000000', // 1 SOL (9 decimals)
      tradeType: 'EXACT_INPUT',
      user: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
    }
  );
}

async function testAvailableChains() {
  console.log('\n🌐 Testing Available Chains Endpoint:');
  try {
    const response = await axios.get(`${RELAY_API_URL}/chains`);
    console.log('✅ Available chains:', response.data.length);
    
    // Find Solana
    const solana = response.data.find(c => c.name?.toLowerCase().includes('solana'));
    if (solana) {
      console.log('📍 Solana chain config:', JSON.stringify(solana, null, 2));
    }
    
    // Find Polygon
    const polygon = response.data.find(c => c.chainId === 137);
    if (polygon) {
      console.log('📍 Polygon chain config:', JSON.stringify(polygon, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Could not fetch chains:', error.message);
  }
}

// Run all tests
async function main() {
  await testAvailableChains();
  await runParameterTests();
  
  console.log('\n📊 Summary:');
  console.log('Need to understand:');
  console.log('1. Correct Solana token addresses for Relay');
  console.log('2. User field requirements for Solana origins');
  console.log('3. Whether Solana bridging is actually supported');
  console.log('4. Exact error meanings (INVALID_INPUT_CURRENCY)');
}

main().catch(console.error);