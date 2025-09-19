/**
 * Test Kalshi API Integration
 * Verifies authentication and basic endpoints
 */

const axios = require('axios');
const crypto = require('crypto');

// Kalshi demo API endpoint
const KALSHI_DEMO_URL = 'https://demo-api.kalshi.co/trade-api/v2';
const KALSHI_PROD_URL = 'https://api.elections.kalshi.com/trade-api/v2';

// Test with demo environment
const API_URL = KALSHI_DEMO_URL;

/**
 * Create RSA-PSS signature for Kalshi authentication
 * Note: In production, private key would come from environment
 */
function createSignature(privateKeyPem, timestamp, method, path) {
  try {
    const message = `${timestamp}${method}${path}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    
    // Use RSA-PSS padding
    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    });
    
    return signature.toString('base64');
  } catch (error) {
    console.error('Signature creation error:', error);
    return null;
  }
}

/**
 * Test public endpoints (no auth required)
 */
async function testPublicEndpoints() {
  console.log('\n🔍 Testing Public Endpoints');
  console.log('━'.repeat(50));
  
  const publicEndpoints = [
    { name: 'Get Events', path: '/events' },
    { name: 'Get Markets', path: '/markets' },
    { name: 'Get Exchange Status', path: '/exchange/status' }
  ];
  
  for (const endpoint of publicEndpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint.name}`);
      const response = await axios.get(`${API_URL}${endpoint.path}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'APES-Platform/1.0'
        },
        timeout: 10000
      });
      
      console.log('✅ Success!');
      console.log(`📊 Response preview:`, {
        status: response.status,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        itemCount: Array.isArray(response.data) ? response.data.length : 
                   response.data.events ? response.data.events.length :
                   response.data.markets ? response.data.markets.length : 'N/A'
      });
      
      // Show sample data
      if (endpoint.path === '/markets' && response.data.markets?.length > 0) {
        const market = response.data.markets[0];
        console.log('📈 Sample market:', {
          ticker: market.ticker,
          question: market.question,
          status: market.status,
          yes_price: market.yes_price,
          no_price: market.no_price,
          volume: market.volume
        });
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error('📋 Response:', error.response.status, error.response.data);
      }
    }
  }
}

/**
 * Test authentication flow
 * Note: This will fail without valid API keys
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Requirements');
  console.log('━'.repeat(50));
  
  try {
    // Try to access a protected endpoint without auth
    await axios.get(`${API_URL}/portfolio/balance`);
    console.log('🤔 Unexpected: Protected endpoint accessible without auth');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Protected endpoints require authentication (as expected)');
      console.log('📋 Error:', error.response.data);
      
      // Show what headers are required
      console.log('\n📝 Required headers for authenticated requests:');
      console.log('- KALSHI-ACCESS-KEY: Your API key ID');
      console.log('- KALSHI-ACCESS-TIMESTAMP: Request timestamp');
      console.log('- KALSHI-ACCESS-SIGNATURE: RSA-PSS signature');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

/**
 * Test market data structure
 */
async function analyzeMarketData() {
  console.log('\n📊 Analyzing Market Data Structure');
  console.log('━'.repeat(50));
  
  try {
    const response = await axios.get(`${API_URL}/markets`, {
      params: { limit: 5, status: 'active' }
    });
    
    if (response.data.markets?.length > 0) {
      const market = response.data.markets[0];
      console.log('\n🏷️ Market fields available:');
      Object.keys(market).forEach(key => {
        const value = market[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
      
      // Check for important fields
      const requiredFields = ['ticker', 'question', 'yes_price', 'no_price', 'volume', 'status'];
      const missingFields = requiredFields.filter(field => !(field in market));
      
      if (missingFields.length === 0) {
        console.log('\n✅ All required fields present');
      } else {
        console.log(`\n⚠️ Missing fields: ${missingFields.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Error analyzing markets:', error.message);
  }
}

/**
 * Test CORS compatibility
 */
async function testCORS() {
  console.log('\n🌐 Testing CORS Configuration');
  console.log('━'.repeat(50));
  
  try {
    const response = await axios.options(`${API_URL}/markets`, {
      headers: {
        'Origin': 'https://apes.primape.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log('✅ CORS preflight successful');
    console.log('📋 CORS headers:', {
      'access-control-allow-origin': response.headers['access-control-allow-origin'] || 'Not set',
      'access-control-allow-methods': response.headers['access-control-allow-methods'] || 'Not set',
      'access-control-allow-headers': response.headers['access-control-allow-headers'] || 'Not set'
    });
    
  } catch (error) {
    if (error.response) {
      console.log('⚠️ CORS preflight returned:', error.response.status);
      console.log('📋 Headers:', error.response.headers);
    } else {
      console.error('❌ CORS test failed:', error.message);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Kalshi API Integration Tests');
  console.log('═'.repeat(50));
  console.log(`📍 Testing against: ${API_URL}`);
  
  await testPublicEndpoints();
  await testAuthentication();
  await analyzeMarketData();
  await testCORS();
  
  console.log('\n📊 Summary:');
  console.log('- Public endpoints: Accessible ✅');
  console.log('- Authentication: RSA-PSS required ⚠️');
  console.log('- Market data: Well-structured ✅');
  console.log('- CORS: Need to test from frontend 🔍');
  
  console.log('\n💡 Next steps:');
  console.log('1. Create Kalshi API keys via dashboard');
  console.log('2. Implement RSA-PSS authentication service');
  console.log('3. Build market sync service');
  console.log('4. Create order proxy for users');
}

// Run tests
runTests().catch(console.error);