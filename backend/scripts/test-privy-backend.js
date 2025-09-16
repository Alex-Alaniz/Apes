/**
 * Test script for Privy backend integration
 * Run with: node scripts/test-privy-backend.js
 */

require('dotenv').config();

async function testPrivyBackend() {
  console.log('🧪 Testing Privy Backend Integration\n');
  
  // Check environment variables
  const appId = process.env.PRIVY_APP_ID || 'cmfmo7so5004ojz0bl03kuy1l';
  const appSecret = process.env.PRIVY_APP_SECRET || '2gbGWwWRjSNjpRVsKa99U824J266396r4LAUrkebMxNhZbXa1YLC5YbJc5ojueWKnJAGEuic1QsgnqK3q4CpPGZd';
  
  console.log('✅ Privy App ID:', appId);
  console.log('✅ Privy App Secret:', appSecret.substring(0, 10) + '...');
  
  try {
    // Test Privy client initialization
    const { PrivyClient } = require('@privy-io/server-auth');
    const privy = new PrivyClient(appId, appSecret);
    
    console.log('\n✅ Privy client initialized successfully');
    
    // Test API endpoint (no auth)
    const baseUrl = `http://localhost:${process.env.PORT || 5001}`;
    console.log(`\n🔍 Testing API endpoint at ${baseUrl}/api/privy/test`);
    
    const fetch = require('node-fetch');
    const response = await fetch(`${baseUrl}/api/privy/test`);
    const data = await response.json();
    
    console.log('✅ Test endpoint response:', data);
    
    // Instructions for frontend testing
    console.log('\n📝 Next Steps:');
    console.log('1. Start your backend: npm run dev');
    console.log('2. Add this route to your server.js:');
    console.log('   app.use("/api/privy", require("./routes/privyTest"));');
    console.log('3. Start your frontend with Privy integration');
    console.log('4. Test authentication flow');
    
    console.log('\n🎯 Test Endpoints:');
    console.log(`   GET  ${baseUrl}/api/privy/test - No auth required`);
    console.log(`   GET  ${baseUrl}/api/privy/me - Requires Privy auth`);
    console.log(`   POST ${baseUrl}/api/privy/link-user - Link/create user`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Solution: Install dependencies');
      console.log('   cd backend && npm install @privy-io/server-auth');
    }
  }
}

// Run the test
testPrivyBackend();