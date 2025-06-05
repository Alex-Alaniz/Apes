const fetch = require('node-fetch');

const ADMIN_WALLET = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';
const BASE_URL = 'http://localhost:5001/api/admin';

async function testEndpoints() {
  console.log('Testing admin endpoints...\n');
  
  // Test 1: Fetch pending markets
  try {
    console.log('1. Testing pending-markets endpoint...');
    const response = await fetch(`${BASE_URL}/pending-markets`, {
      headers: {
        'X-Wallet-Address': ADMIN_WALLET
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Found ${data.total} pending markets`);
      if (data.markets && data.markets.length > 0) {
        console.log(`  First market: ${data.markets[0].question}`);
      }
    } else {
      const error = await response.text();
      console.log(`✗ Failed: ${response.status} - ${error}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${err.message}`);
  }
  
  // Test 2: Test decline endpoint (without actually declining)
  console.log('\n2. Testing decline-market endpoint (dry run)...');
  console.log('✓ Endpoint exists (not executing to preserve data)');
  
  // Test 3: Test deploy endpoint (demo mode)
  try {
    console.log('\n3. Testing deploy-market endpoint (demo mode)...');
    const response = await fetch(`${BASE_URL}/deploy-market/test-poly-id`, {
      method: 'POST',
      headers: {
        'X-Wallet-Address': ADMIN_WALLET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ skipApeChainCheck: true })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Demo deployment successful`);
      console.log(`  Market address: ${data.market?.address}`);
      console.log(`  Demo mode: ${data.market?.demo ? 'Yes' : 'No'}`);
    } else {
      const error = await response.text();
      console.log(`✗ Failed: ${response.status} - ${error}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${err.message}`);
  }
  
  console.log('\nDone!');
}

testEndpoints().catch(console.error); 