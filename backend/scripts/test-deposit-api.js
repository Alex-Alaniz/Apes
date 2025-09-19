/**
 * Test Deposit API Endpoints
 * Verify the complete deposit flow is working
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5001';
// Use a Solana wallet address for testing (or any valid string as user ID)
const TEST_WALLET = '6NnC9En5wxyQvNJTbcnMGH4VTmx3aBT7TsVKcbANP4cQ'; // Solana wallet address

async function testDepositAPI() {
  console.log('🧪 Testing Deposit API Endpoints');
  console.log('═'.repeat(50));
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Wallet: ${TEST_WALLET}`);
  
  const results = [];
  
  try {
    // Test 1: Get supported chains
    console.log('\n📌 Test 1: Get Supported Chains');
    try {
      const response = await axios.get(`${API_URL}/api/deposits/supported-chains`);
      console.log('✅ Supported chains:', response.data.chains.map(c => c.name).join(', '));
      results.push({ test: 'Get supported chains', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get supported chains', status: 'FAILED' });
    }
    
    // Test 2: Generate deposit address for Polygon
    console.log('\n📌 Test 2: Generate Deposit Address (Polygon)');
    let depositAddress;
    try {
      const response = await axios.get(`${API_URL}/api/deposits/address/137`, {
        headers: { 'x-wallet-address': TEST_WALLET }
      });
      depositAddress = response.data.address;
      console.log('✅ Generated deposit address:', depositAddress);
      console.log('📷 QR Code URL:', response.data.qrCode);
      results.push({ test: 'Generate deposit address', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Generate deposit address', status: 'FAILED' });
    }
    
    // Test 3: Get bridge quote
    console.log('\n📌 Test 3: Get Bridge Quote (Polygon → Ethereum)');
    try {
      const params = new URLSearchParams({
        fromChain: 137,
        toChain: 1,
        token: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
        amount: '100000000' // 100 USDC
      });
      
      const response = await axios.get(`${API_URL}/api/deposits/quote?${params}`, {
        headers: { 'x-wallet-address': TEST_WALLET }
      });
      
      if (response.data.quote) {
        console.log('✅ Quote received:');
        console.log(`   Protocol: ${response.data.quote.protocol}`);
        console.log(`   Cost: $${response.data.quote.totalCostUSD || 'N/A'}`);
        console.log(`   Time: ${response.data.quote.estimatedTime || 'N/A'}`);
        results.push({ test: 'Get bridge quote', status: 'PASSED' });
      }
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get bridge quote', status: 'FAILED' });
    }
    
    // Test 4: Get user balances
    console.log('\n📌 Test 4: Get User Balances');
    try {
      const response = await axios.get(`${API_URL}/api/deposits/balances`, {
        headers: { 'x-wallet-address': TEST_WALLET }
      });
      console.log('✅ Balances:', response.data.balances.length, 'tokens');
      results.push({ test: 'Get user balances', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get user balances', status: 'FAILED' });
    }
    
    // Test 5: Get deposit history
    console.log('\n📌 Test 5: Get Deposit History');
    try {
      const response = await axios.get(`${API_URL}/api/deposits/history`, {
        headers: { 'x-wallet-address': TEST_WALLET }
      });
      console.log('✅ Deposit history:', response.data.deposits.length, 'deposits');
      results.push({ test: 'Get deposit history', status: 'PASSED' });
    } catch (error) {
      console.error('❌ Failed:', error.response?.data || error.message);
      results.push({ test: 'Get deposit history', status: 'FAILED' });
    }
    
    // Test 6: Simulate deposit webhook (optional)
    if (depositAddress) {
      console.log('\n📌 Test 6: Simulate Deposit Processing');
      try {
        const mockDeposit = {
          chainId: 137,
          address: depositAddress,
          txHash: '0x' + 'a'.repeat(64),
          amount: '100000000',
          token: 'USDC'
        };
        
        const response = await axios.post(`${API_URL}/api/deposits/process`, mockDeposit);
        console.log('✅ Deposit processed:', response.data.deposit);
        results.push({ test: 'Process deposit', status: 'PASSED' });
      } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
        results.push({ test: 'Process deposit', status: 'FAILED' });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
  
  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('═'.repeat(50));
  results.forEach(r => {
    console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.test}`);
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const total = results.length;
  console.log(`\n🎯 Results: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Deposit system is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
}

// Run tests
testDepositAPI().catch(console.error);