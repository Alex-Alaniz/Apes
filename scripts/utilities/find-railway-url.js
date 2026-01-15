const axios = require('axios');

// Common Railway URL patterns to test
const commonPatterns = [
  'apes-backend',
  'apes-platform', 
  'backend',
  'apes',
  'apes-api',
  'prediction-market',
  'primape'
];

async function findRailwayUrl() {
  console.log('🔍 Finding your Railway deployment URL...\n');
  
  console.log('📋 To find your Railway URL manually:');
  console.log('1. Go to https://railway.app/dashboard');
  console.log('2. Click on your APES backend project');
  console.log('3. Go to "Deployments" tab');
  console.log('4. Look for the URL under "Domains"');
  console.log('5. It will look like: https://your-app-name.railway.app');
  
  console.log('\n🧪 Testing common Railway URL patterns...');
  
  const workingUrls = [];
  
  for (const pattern of commonPatterns) {
    const testUrl = `https://${pattern}.railway.app`;
    console.log(`Testing: ${testUrl}`);
    
    try {
      const response = await axios.get(`${testUrl}/health`, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      if (response.status === 200) {
        console.log(`✅ Found working URL: ${testUrl}`);
        workingUrls.push(testUrl);
      } else {
        console.log(`⚠️ ${testUrl} responded with status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log(`❌ ${testUrl} - Not found`);
      } else {
        console.log(`⚠️ ${testUrl} - ${error.message}`);
      }
    }
  }
  
  if (workingUrls.length > 0) {
    console.log('\n🎉 Found working Railway URLs:');
    workingUrls.forEach(url => console.log(`   ${url}`));
    console.log('\nUpdate test-production.js with:');
    console.log(`const RAILWAY_API_BASE = "${workingUrls[0]}/api";`);
  } else {
    console.log('\n❌ No working URLs found automatically.');
    console.log('Please manually find your Railway URL and update the test script.');
  }
  
  return workingUrls;
}

async function testSpecificUrl(url) {
  console.log(`\n🧪 Testing specific URL: ${url}`);
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${url}/health`, { timeout: 10000 });
    console.log('✅ Health endpoint working:', healthResponse.data);
    
    // Test API endpoint
    const apiResponse = await axios.get(`${url}/api/leaderboard`, { timeout: 10000 });
    console.log(`✅ API working - Found ${apiResponse.data.leaderboard?.length || 0} users`);
    
    console.log(`\n🎯 Use this URL in your test script:`);
    console.log(`const RAILWAY_API_BASE = "${url}/api";`);
    
    return true;
  } catch (error) {
    console.log('❌ URL test failed:', error.message);
    return false;
  }
}

// Check if URL provided as argument
const providedUrl = process.argv[2];

if (providedUrl) {
  console.log('🌟 TESTING PROVIDED RAILWAY URL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  testSpecificUrl(providedUrl)
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
} else {
  console.log('🌟 FINDING RAILWAY DEPLOYMENT URL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  findRailwayUrl()
    .then(urls => {
      if (urls.length === 0) {
        console.log('\n💡 Usage: node find-railway-url.js https://your-app.railway.app');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { findRailwayUrl, testSpecificUrl }; 