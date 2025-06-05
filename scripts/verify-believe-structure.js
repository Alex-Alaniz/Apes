#!/usr/bin/env node

// This script shows what the CORRECT Believe API request should look like

const BELIEVE_CONFIG = {
  burnAmounts: {
    PREDICTION_BET: 1,      // 1 APES
    PREDICTION_CLAIM: 1,    // 1 APES
    MARKET_CREATION: 5      // 5 APES
  },
  proofTypes: {
    PREDICTION_BET: 'PREDICTION_BUY',
    PREDICTION_CLAIM: 'PREDICTION_CLAIM',
    MARKET_CREATION: 'MARKET_CREATE'
  }
};

console.log('✅ CORRECT Believe API Request Structure:\n');

// Example prediction bet
const correctRequest = {
  type: BELIEVE_CONFIG.proofTypes.PREDICTION_BET,
  proof: {
    marketId: '9iLNUyiuwpCgwr2bGH39T4FV759DQLKbQk78XAmHghSf',
    userWallet: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z',
    optionIndex: 0,
    betAmount: '10000',
    transactionId: '5TvkMxj1yuPJ4WiaH3T6bB3QhKMe2uwhmt3bcFXLWGqGeFX5kCMpop8zwjQxAWFevnD4X9nd7hxVE5fwQyUnRvn',
    timestamp: new Date().toISOString()
  },
  burnAmount: BELIEVE_CONFIG.burnAmounts.PREDICTION_BET, // This should be 1, not 1000000!
  persistOnchain: true
};

console.log(JSON.stringify(correctRequest, null, 2));

console.log('\n❌ INCORRECT (what you\'re seeing):\n');
const incorrectRequest = {
  type: 'PREDICTION_BET',  // Wrong type
  proof: {
    userId: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z',  // Wrong field name
    network: 'Devnet',  // Should not exist
    marketId: '9iLNUyiuwpCgwr2bGH39T4FV759DQLKbQk78XAmHghSf',
    betAmount: '10000',
    timestamp: '2025-05-31T02:36:29.291Z',
    transactionHash: '5TvkMxj1yuPJ4WiaH3T6bB3QhKMe2uwhmt3bcFXLWGqGeFX5kCMpop8zwjQxAWFevnD4X9nd7hxVE5fwQyUnRvn',  // Wrong field name
    predictionOption: '0'  // Wrong field name
  },
  burnAmount: 1000000,  // This is 1 MILLION tokens!
  persistOnchain: true
};

console.log(JSON.stringify(incorrectRequest, null, 2));

console.log('\n📋 Key Differences:');
console.log('1. burnAmount: 1 (correct) vs 1000000 (incorrect - 1 million tokens!)');
console.log('2. type: "PREDICTION_BUY" (correct) vs "PREDICTION_BET" (incorrect)');
console.log('3. proof.userWallet (correct) vs proof.userId (incorrect)');
console.log('4. proof.optionIndex (correct) vs proof.predictionOption (incorrect)');
console.log('5. proof.transactionId (correct) vs proof.transactionHash (incorrect)');
console.log('6. No "network" field in the correct version');

console.log('\n🔧 TO FIX:');
console.log('1. Do a hard refresh in your browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
console.log('2. Or open in an incognito/private window');
console.log('3. Or clear your browser cache completely');
console.log('\nThe browser is caching the old JavaScript code!'); 