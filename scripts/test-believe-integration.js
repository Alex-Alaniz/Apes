#!/usr/bin/env node

require('dotenv').config({ path: './src/frontend/.env' });
const axios = require('axios');

// Configuration
const BELIEVE_CONFIG = {
  apiKey: process.env.VITE_BELIEVE_API_KEY || '',
  apiUrl: process.env.VITE_BELIEVE_API_URL || 'https://public.believe.app/v1'
};

// Generate UUID v4
function generateIdempotencyKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testBurn(type, proof, amount) {
  try {
    const response = await axios.post(
      `${BELIEVE_CONFIG.apiUrl}/tokenomics/burn`,
      {
        type,
        proof,
        burnAmount: amount,
        persistOnchain: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-believe-api-key': BELIEVE_CONFIG.apiKey,
          'x-idempotency-key': generateIdempotencyKey()
        }
      }
    );

    console.log(`✅ ${type} burn successful!`);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error(`❌ ${type} burn failed:`, error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔥 Testing Believe API Integration\n');
  console.log('API URL:', BELIEVE_CONFIG.apiUrl);
  console.log('API Key:', BELIEVE_CONFIG.apiKey ? '✓ Set' : '✗ Not set');

  if (!BELIEVE_CONFIG.apiKey) {
    console.log('\n❌ No API key found in .env file');
    console.log('   Please set VITE_BELIEVE_API_KEY in your .env file');
    return;
  }

  console.log('\n📝 Testing different burn scenarios...\n');

  // Test 1: Prediction Placed (should work)
  console.log('1️⃣ Testing PREDICTION_PLACED (betting)...');
  const betProof = {
    transactionId: '5xY8' + Date.now() + 'testTx',
    value: '100'
  };
  await testBurn('PREDICTION_PLACED', betProof, 1);

  console.log('\n2️⃣ Testing PREDICTION_CLAIMED (claiming rewards)...');
  const claimProof = {
    transactionId: '6zX9' + Date.now() + 'testTx',
    value: '250'
  };
  await testBurn('PREDICTION_CLAIMED', claimProof, 1);

  console.log('\n3️⃣ Testing MARKET_CREATED (market creation)...');
  const marketProof = {
    transactionId: '7aY0' + Date.now() + 'testTx',
    value: '5'
  };
  await testBurn('MARKET_CREATED', marketProof, 5);

  console.log('\n📊 Summary:');
  console.log('- PREDICTION_PLACED: Should be working ✅');
  console.log('- PREDICTION_CLAIMED: Needs to be added to Believe schema');
  console.log('- MARKET_CREATED: Needs to be added to Believe schema');
}

// Run the tests
runTests().catch(console.error); 