import believeApiService from '../services/believeApiService';
import { BELIEVE_CONFIG, isBelieveConfigured } from '../config/believe';

// Test function to verify Believe API integration
export async function testBelieveApi() {
  console.log('🔥 Testing Believe API Integration');
  console.log('==================================');
  
  // Check configuration
  console.log('Configuration Status:');
  console.log('- API Configured:', isBelieveConfigured());
  console.log('- API URL:', BELIEVE_CONFIG.apiUrl || 'https://public.believe.app/v1');
  console.log('- Burn Amounts:', BELIEVE_CONFIG.burnAmounts);
  console.log('- Proof Types:', BELIEVE_CONFIG.proofTypes);
  
  if (!isBelieveConfigured()) {
    console.error('❌ Believe API not configured!');
    console.log('Please set VITE_BELIEVE_API_KEY in your .env file');
    return;
  }
  
  // Test data
  const testData = {
    marketId: 'test-market-' + Date.now(),
    userWallet: '4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS',
    transactionSignature: 'test-tx-' + Date.now()
  };
  
  console.log('\nTest Data:', testData);
  
  try {
    // Test 1: Prediction Burn
    console.log('\n1️⃣ Testing Prediction Burn...');
    console.log('Expected request format:', {
      type: 'PREDICTION_BUY',
      proof: {
        marketId: testData.marketId,
        userWallet: testData.userWallet,
        optionIndex: 0,
        betAmount: '100',
        transactionId: testData.transactionSignature,
        timestamp: new Date().toISOString()
      },
      burnAmount: 1,
      persistOnchain: true
    });
    
    const predictionResult = await believeApiService.burnForPrediction(
      testData.marketId,
      testData.userWallet,
      0, // option index
      100, // bet amount
      testData.transactionSignature
    );
    console.log('✅ Prediction burn result:', predictionResult);
    
    // Test 2: Claim Burn
    console.log('\n2️⃣ Testing Claim Burn...');
    const claimResult = await believeApiService.burnForClaim(
      testData.marketId,
      testData.userWallet,
      150, // claim amount
      testData.transactionSignature + '-claim'
    );
    console.log('✅ Claim burn result:', claimResult);
    
    // Test 3: Market Creation Burn
    console.log('\n3️⃣ Testing Market Creation Burn...');
    const marketResult = await believeApiService.burnForMarketCreation(
      testData.marketId,
      testData.userWallet,
      'Test Market Question?',
      testData.transactionSignature + '-create'
    );
    console.log('✅ Market creation burn result:', marketResult);
    
    console.log('\n✅ All tests completed!');
    console.log('\nExpected successful response format:', {
      result: 'SUCCESS',
      hash: 'SHA256_HASH_OF_PROOF',
      txHash: 'SOLANA_TRANSACTION_HASH',
      type: 'PROOF_TYPE',
      dateBurned: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  window.testBelieveApi = testBelieveApi;
  console.log('Believe API test function loaded. Run "testBelieveApi()" in console to test.');
} 