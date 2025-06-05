#!/usr/bin/env node

require('dotenv').config({ path: './src/frontend/.env' });
const axios = require('axios');

// Configuration
const BELIEVE_CONFIG = {
  apiKey: process.env.VITE_BELIEVE_API_KEY || 'test-api-key',
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

// Test different proof types
const PROOF_TYPES_TO_TEST = [
  'PREDICTION_PLACED',
  'PREDICTION_CLAIMED',
  'MARKET_CREATED',
  'PRODUCT_BUY',
  'PRODUCT_SELL',
  'PRODUCT_CREATE',
  'PRODUCT_REFUND',
  'TRANSACTION',
  'PURCHASE',
  'SALE',
  'CLAIM',
  'REWARD',
  'BET',
  'PREDICTION',
  'MARKET',
  'TOKEN_BURN',
  'BURN',
  'CUSTOM_BURN'
];

async function testProofType(type) {
  const proof = {
    transactionId: 'test-tx-' + Date.now(),
    value: '100'
  };

  try {
    const response = await axios.post(
      `${BELIEVE_CONFIG.apiUrl}/tokenomics/burn`,
      {
        type,
        proof,
        burnAmount: 1,
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

    console.log(`✅ ${type} - ACCEPTED`);
    return { type, status: 'accepted', response: response.data };
  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data?.error || error.response.data?.code;
      if (errorCode === 'ERR_INVALID_PROOF') {
        console.log(`❌ ${type} - INVALID PROOF TYPE`);
        return { type, status: 'invalid_proof' };
      } else {
        console.log(`⚠️  ${type} - OTHER ERROR: ${errorCode || error.response.status}`);
        return { type, status: 'other_error', error: errorCode };
      }
    } else {
      console.log(`💥 ${type} - NETWORK ERROR`);
      return { type, status: 'network_error' };
    }
  }
}

async function runTests() {
  console.log('🔍 Testing Believe API Proof Types\n');
  console.log('API URL:', BELIEVE_CONFIG.apiUrl);
  console.log('API Key:', BELIEVE_CONFIG.apiKey ? '✓ Set' : '✗ Not set');
  
  if (!BELIEVE_CONFIG.apiKey || BELIEVE_CONFIG.apiKey === 'test-api-key') {
    console.log('\n⚠️  WARNING: No real API key found');
    console.log('Set VITE_BELIEVE_API_KEY in .env to test with real API\n');
  }

  console.log('\nTesting proof types...\n');

  const results = [];
  for (const type of PROOF_TYPES_TO_TEST) {
    const result = await testProofType(type);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }

  console.log('\n📊 SUMMARY:');
  const accepted = results.filter(r => r.status === 'accepted');
  const invalid = results.filter(r => r.status === 'invalid_proof');
  const otherErrors = results.filter(r => r.status === 'other_error');

  console.log(`\n✅ Accepted proof types (${accepted.length}):`);
  accepted.forEach(r => console.log(`   - ${r.type}`));

  console.log(`\n❌ Invalid proof types (${invalid.length}):`);
  invalid.forEach(r => console.log(`   - ${r.type}`));

  if (otherErrors.length > 0) {
    console.log(`\n⚠️  Other errors (${otherErrors.length}):`);
    otherErrors.forEach(r => console.log(`   - ${r.type}: ${r.error}`));
  }

  console.log('\n💡 RECOMMENDATION:');
  if (accepted.length > 0) {
    console.log('Use one of the accepted proof types above for your burns.');
  } else {
    console.log('No proof types were accepted. You may need to:');
    console.log('1. Contact Believe to add your custom proof types');
    console.log('2. Check if your API key has the correct permissions');
    console.log('3. Verify the API endpoint and configuration');
  }
}

// Run the tests
runTests().catch(console.error); 