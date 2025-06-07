require('dotenv').config({ path: './src/frontend/.env' });
const axios = require('axios');

// Configuration
const BELIEVE_CONFIG = {
  // Use environment variables or test values
  apiKey: process.env.VITE_BELIEVE_API_KEY || 'test-api-key',
  apiUrl: process.env.VITE_BELIEVE_API_URL || 'https://public.believe.app/v1',
  
  // Burn amounts
  burnAmounts: {
    PREDICTION_BET: 1,
    PREDICTION_CLAIM: 1,
    MARKET_CREATION: 5
  },
  
  // Proof types - FIXED to match Believe API configuration
  proofTypes: {
    PREDICTION_BET: 'PREDICTION_PLACED',
    PREDICTION_CLAIM: 'PREDICTION_CLAIMED',
    MARKET_CREATION: 'MARKET_CREATED'
  }
};

// Generate UUID v4
function generateIdempotencyKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test wallet addresses
const TEST_DATA = {
  userWallet: '4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS',
  marketId: 'test-market-' + Date.now(),
  transactionSignature: 'test-tx-' + Date.now(),
  betAmount: 100
};

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper function to make API calls
async function makeBurnRequest(type, proof, burnAmount) {
  try {
    const endpoint = `${BELIEVE_CONFIG.apiUrl}/tokenomics/burn`;
    const idempotencyKey = generateIdempotencyKey();
    
    console.log(`\n${colors.blue}Making request to: ${endpoint}${colors.reset}`);
    console.log('Headers:', {
      'x-believe-api-key': BELIEVE_CONFIG.apiKey ? '***' : 'NOT SET',
      'x-idempotency-key': idempotencyKey
    });
    console.log('Request body:', JSON.stringify({
      type,
      proof,
      burnAmount,
      persistOnchain: true
    }, null, 2));
    
    const response = await axios.post(
      endpoint,
      {
        type,
        proof,
        burnAmount,
        persistOnchain: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-believe-api-key': BELIEVE_CONFIG.apiKey,
          'x-idempotency-key': idempotencyKey
        }
      }
    );
    
    console.log(`${colors.green}Response received:${colors.reset}`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`${colors.red}Error making request:${colors.reset}`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Test burn for prediction
async function testPredictionBurn() {
  console.log(`\n${colors.yellow}=== Testing Prediction Burn ===${colors.reset}`);
  
  const proof = {
    marketId: TEST_DATA.marketId,
    userWallet: TEST_DATA.userWallet,
    optionIndex: 0,
    betAmount: TEST_DATA.betAmount.toString(),
    transactionId: TEST_DATA.transactionSignature,
    timestamp: new Date().toISOString()
  };
  
  try {
    const result = await makeBurnRequest(
      BELIEVE_CONFIG.proofTypes.PREDICTION_BET,
      proof,
      BELIEVE_CONFIG.burnAmounts.PREDICTION_BET
    );
    
    console.log(`\n${colors.green}✓ Prediction burn successful!${colors.reset}`);
    console.log('Result:', result.result);
    console.log('Hash:', result.hash);
    console.log('TxHash:', result.txHash);
    console.log('Date Burned:', result.dateBurned);
    
    return result;
  } catch (error) {
    console.error(`${colors.red}✗ Prediction burn failed${colors.reset}`);
    return null;
  }
}

// Test burn for claim
async function testClaimBurn() {
  console.log(`\n${colors.yellow}=== Testing Claim Burn ===${colors.reset}`);
  
  const proof = {
    marketId: TEST_DATA.marketId,
    userWallet: TEST_DATA.userWallet,
    claimAmount: '150',
    transactionId: TEST_DATA.transactionSignature + '-claim',
    timestamp: new Date().toISOString()
  };
  
  try {
    const result = await makeBurnRequest(
      BELIEVE_CONFIG.proofTypes.PREDICTION_CLAIM,
      proof,
      BELIEVE_CONFIG.burnAmounts.PREDICTION_CLAIM
    );
    
    console.log(`\n${colors.green}✓ Claim burn successful!${colors.reset}`);
    console.log('Result:', result.result);
    console.log('Hash:', result.hash);
    console.log('TxHash:', result.txHash);
    console.log('Date Burned:', result.dateBurned);
    
    return result;
  } catch (error) {
    console.error(`${colors.red}✗ Claim burn failed${colors.reset}`);
    return null;
  }
}

// Test burn for market creation
async function testMarketCreationBurn() {
  console.log(`\n${colors.yellow}=== Testing Market Creation Burn ===${colors.reset}`);
  
  const proof = {
    marketId: TEST_DATA.marketId,
    creatorWallet: TEST_DATA.userWallet,
    marketQuestion: 'Will this test succeed?',
    transactionId: TEST_DATA.transactionSignature + '-create',
    timestamp: new Date().toISOString()
  };
  
  try {
    const result = await makeBurnRequest(
      BELIEVE_CONFIG.proofTypes.MARKET_CREATION,
      proof,
      BELIEVE_CONFIG.burnAmounts.MARKET_CREATION
    );
    
    console.log(`\n${colors.green}✓ Market creation burn successful!${colors.reset}`);
    console.log('Result:', result.result);
    console.log('Hash:', result.hash);
    console.log('TxHash:', result.txHash);
    console.log('Date Burned:', result.dateBurned);
    
    return result;
  } catch (error) {
    console.error(`${colors.red}✗ Market creation burn failed${colors.reset}`);
    return null;
  }
}

// Test getting burn proof
async function testGetBurnProof(burnId) {
  console.log(`\n${colors.yellow}=== Testing Get Burn Proof ===${colors.reset}`);
  console.log('Burn ID:', burnId);
  
  try {
    const response = await axios.get(
      `${BELIEVE_CONFIG.apiUrl}/burn/${burnId}/proof`,
      {
        headers: {
          'Authorization': `Bearer ${BELIEVE_CONFIG.apiKey}`
        }
      }
    );
    
    console.log(`\n${colors.green}✓ Burn proof retrieved!${colors.reset}`);
    console.log('Proof:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`${colors.red}✗ Failed to get burn proof${colors.reset}`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return null;
  }
}

// Test getting burn history
async function testGetBurnHistory() {
  console.log(`\n${colors.yellow}=== Testing Get Burn History ===${colors.reset}`);
  console.log('User Wallet:', TEST_DATA.userWallet);
  
  try {
    const response = await axios.get(
      `${BELIEVE_CONFIG.apiUrl}/burns`,
      {
        params: {
          userWallet: TEST_DATA.userWallet,
          limit: 10
        },
        headers: {
          'Authorization': `Bearer ${BELIEVE_CONFIG.apiKey}`
        }
      }
    );
    
    console.log(`\n${colors.green}✓ Burn history retrieved!${colors.reset}`);
    console.log('Total burns:', response.data.length);
    console.log('Recent burns:', JSON.stringify(response.data.slice(0, 3), null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`${colors.red}✗ Failed to get burn history${colors.reset}`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return null;
  }
}

// Main test function
async function runAllTests() {
  console.log(`\n${colors.blue}🔥 BELIEVE API BURN TESTING 🔥${colors.reset}`);
  console.log('=================================');
  console.log('API URL:', BELIEVE_CONFIG.apiUrl);
  console.log('API Key:', BELIEVE_CONFIG.apiKey ? '✓ Set' : '✗ Not set');
  
  if (!BELIEVE_CONFIG.apiKey || BELIEVE_CONFIG.apiKey === 'test-api-key') {
    console.log(`\n${colors.yellow}⚠️  WARNING: No real API key found${colors.reset}`);
    console.log('Set VITE_BELIEVE_API_KEY in .env to test with real API');
    console.log('Continuing with mock data...\n');
  }
  
  try {
    // Test prediction burn
    const predictionBurn = await testPredictionBurn();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    // Test claim burn
    const claimBurn = await testClaimBurn();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test market creation burn
    const marketBurn = await testMarketCreationBurn();
    
    // If we got a burn ID, test getting the proof
    if (predictionBurn && predictionBurn.burnId) {
      await testGetBurnProof(predictionBurn.burnId);
    }
    
    // Test getting burn history
    await testGetBurnHistory();
    
    console.log(`\n${colors.green}✅ All tests completed!${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test suite failed${colors.reset}`);
    console.error(error);
  }
}

// Check if Believe API is configured
function checkConfiguration() {
  console.log(`\n${colors.blue}Checking Believe API Configuration${colors.reset}`);
  console.log('=====================================');
  
  const envPath = './src/frontend/.env';
  const fs = require('fs');
  
  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}✓ .env file found${colors.reset}`);
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasApiKey = envContent.includes('VITE_BELIEVE_API_KEY=') && !envContent.includes('VITE_BELIEVE_API_KEY=\n');
    const hasApiUrl = envContent.includes('VITE_BELIEVE_API_URL=');
    
    console.log(`API Key: ${hasApiKey ? colors.green + '✓ Configured' : colors.red + '✗ Not configured'}${colors.reset}`);
    console.log(`API URL: ${hasApiUrl ? colors.green + '✓ Configured (custom)' : colors.yellow + '⚠ Using default'}${colors.reset}`);
    
    if (!hasApiUrl) {
      console.log(`Default URL: https://public.believe.app/v1`);
    }
  } else {
    console.log(`${colors.red}✗ .env file not found${colors.reset}`);
    console.log(`Create ${envPath} with:`);
    console.log('VITE_BELIEVE_API_KEY=your-api-key-here');
    console.log('VITE_BELIEVE_API_URL=https://public.believe.app/v1');
  }
}

// Run configuration check first
checkConfiguration();

// Ask user if they want to proceed
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nDo you want to run the burn tests? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    runAllTests().then(() => {
      rl.close();
    });
  } else {
    console.log('Tests cancelled');
    rl.close();
  }
}); 