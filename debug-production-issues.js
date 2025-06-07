#!/usr/bin/env node

/**
 * Production Debug Script for APES Platform
 * 
 * This script diagnoses and potentially fixes the three production bugs:
 * 1. Sliders stuck at 50/50% and volume not showing
 * 2. Username saving returning HTML instead of JSON
 * 3. App burns not working
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PRODUCTION_URL = 'https://www.primape.app';
const API_URL = process.env.VITE_API_URL || 'http://localhost:5001';

console.log('🚀 Starting APES Production Debug Script');
console.log('===================================');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
}

async function testApiEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`🔍 Testing ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'APES-Debug-Script/1.0'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    // Check if response is HTML when we expect JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.log('❌ ERROR: Received HTML instead of JSON');
      console.log(`  First 200 chars: ${responseText.substring(0, 200)}...`);
      return { success: false, error: 'HTML_INSTEAD_OF_JSON', content: responseText };
    }
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ Valid JSON response');
      return { success: true, data: jsonData, status: response.status };
    } catch (parseError) {
      console.log('❌ Invalid JSON response');
      console.log(`  Response: ${responseText.substring(0, 500)}`);
      return { success: false, error: 'INVALID_JSON', content: responseText };
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return { success: false, error: 'NETWORK_ERROR', message: error.message };
  }
}

async function debugBug1_VolumeAndSliders() {
  console.log('\n🐛 Bug 1: Debugging Volume and Slider Issues');
  console.log('============================================');
  
  // Test markets endpoint
  const marketsTest = await testApiEndpoint('/api/markets');
  
  if (!marketsTest.success) {
    console.log('❌ Cannot fetch markets data');
    return false;
  }
  
  const markets = marketsTest.data;
  console.log(`📊 Found ${markets.length} markets`);
  
  if (markets.length === 0) {
    console.log('⚠️  No markets found - this explains why volume isn\'t showing');
    return false;
  }
  
  // Analyze first few markets
  const firstMarket = markets[0];
  console.log('\n📋 First Market Analysis:');
  console.log(`  Question: ${firstMarket.question?.substring(0, 60)}...`);
  console.log(`  Total Volume: ${firstMarket.totalVolume}`);
  console.log(`  Option Pools: ${JSON.stringify(firstMarket.optionPools)}`);
  console.log(`  Option Percentages: ${JSON.stringify(firstMarket.optionPercentages)}`);
  console.log(`  Participant Count: ${firstMarket.participantCount}`);
  
  // Check if all percentages are 50%
  const isStuckAt50 = firstMarket.optionPercentages?.every(p => p === 50);
  if (isStuckAt50) {
    console.log('❌ CONFIRMED: Sliders are stuck at 50/50');
    console.log('  This is likely due to totalVolume being 0 or optionPools being empty');
    
    // Try to force sync volumes
    console.log('\n🔧 Attempting to force sync market volumes...');
    const forceSyncTest = await testApiEndpoint('/api/markets/force-sync', 'POST');
    
    if (forceSyncTest.success) {
      console.log('✅ Force sync successful, re-checking markets...');
      await sleep(2000);
      
      const retestMarkets = await testApiEndpoint('/api/markets');
      if (retestMarkets.success && retestMarkets.data.length > 0) {
        const retestMarket = retestMarkets.data[0];
        console.log(`  New Total Volume: ${retestMarket.totalVolume}`);
        console.log(`  New Percentages: ${JSON.stringify(retestMarket.optionPercentages)}`);
        
        const stillStuck = retestMarket.optionPercentages?.every(p => p === 50);
        if (!stillStuck) {
          console.log('✅ SUCCESS: Slider percentages now working correctly!');
          return true;
        } else {
          console.log('❌ Still stuck at 50/50 after force sync');
        }
      }
    }
  } else {
    console.log('✅ Percentages look normal (not stuck at 50/50)');
  }
  
  return !isStuckAt50;
}

async function debugBug2_UsernameUpdate() {
  console.log('\n🐛 Bug 2: Debugging Username Update Issues');
  console.log('=========================================');
  
  // Test if the username endpoint exists and returns correct content-type
  const testWallet = '11111111111111111111111111111111'; // Dummy wallet address
  const usernameTest = await testApiEndpoint(`/api/users/${testWallet}/username`, 'PUT', {
    username: 'test'
  });
  
  if (!usernameTest.success) {
    if (usernameTest.error === 'HTML_INSTEAD_OF_JSON') {
      console.log('❌ CONFIRMED: Username endpoint returning HTML instead of JSON');
      console.log('  This suggests the API server is not running or misconfigured');
      console.log('  Possible causes:');
      console.log('    - Backend server not running');
      console.log('    - Wrong API URL in frontend environment');
      console.log('    - Reverse proxy serving static files instead of API');
      console.log('    - CORS issues causing fallback to static server');
      
      // Check if it's a 404 serving static files
      if (usernameTest.content.includes('404') || usernameTest.content.includes('Not Found')) {
        console.log('  Diagnosis: 404 error being served as HTML (likely static file server)');
      }
      
      return false;
    } else if (usernameTest.error === 'NETWORK_ERROR') {
      console.log('❌ CONFIRMED: Cannot connect to API server');
      console.log(`  API URL: ${API_URL}`);
      console.log('  Check if backend server is running and accessible');
      return false;
    }
  } else {
    // Even if we get a proper error response, the format is correct
    console.log('✅ Username endpoint responding with proper JSON format');
    if (usernameTest.status === 403 || usernameTest.status === 401) {
      console.log('  (Expected 403/401 error due to dummy wallet address)');
    }
    return true;
  }
  
  return false;
}

async function debugBug3_BurnFunctionality() {
  console.log('\n🐛 Bug 3: Debugging Burn Functionality');
  console.log('======================================');
  
  // Check if backend is properly starting burn event processor
  console.log('🔍 Checking backend server configuration...');
  
      const serverPath = path.join(__dirname, 'backend/server.js');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('burnEventProcessor')) {
      console.log('✅ Burn event processor is configured in server.js');
    } else {
      console.log('❌ Burn event processor NOT found in server.js');
      console.log('  This explains why app burns are not working');
      return false;
    }
    
    if (serverContent.includes('BurnEventProcessor')) {
      console.log('✅ BurnEventProcessor class is imported');
    } else {
      console.log('❌ BurnEventProcessor class is NOT imported');
      return false;
    }
  } else {
    console.log('❌ Cannot find server.js file to check burn processor setup');
    return false;
  }
  
  // Check if burn service files exist
      const burnServicePath = path.join(__dirname, 'backend/services/burnEventProcessor.js');
  if (fs.existsSync(burnServicePath)) {
    console.log('✅ burnEventProcessor.js service file exists');
  } else {
    console.log('❌ burnEventProcessor.js service file NOT found');
    return false;
  }
  
      const believeServicePath = path.join(__dirname, 'backend/services/believeAppService.js');
  if (fs.existsSync(believeServicePath)) {
    console.log('✅ believeAppService.js service file exists');
  } else {
    console.log('❌ believeAppService.js service file NOT found');
    return false;
  }
  
  console.log('✅ Burn functionality components are properly configured');
  return true;
}

async function generateReport() {
  console.log('\n📋 Production Issues Report');
  console.log('===========================');
  
  const bug1Fixed = await debugBug1_VolumeAndSliders();
  const bug2Fixed = await debugBug2_UsernameUpdate();
  const bug3Fixed = await debugBug3_BurnFunctionality();
  
  console.log('\n🎯 Summary:');
  console.log(`  Bug 1 (Volume/Sliders): ${bug1Fixed ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
  console.log(`  Bug 2 (Username Save): ${bug2Fixed ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
  console.log(`  Bug 3 (App Burns): ${bug3Fixed ? '✅ CONFIGURED' : '❌ NEEDS ATTENTION'}`);
  
  if (!bug1Fixed) {
    console.log('\n🔧 Bug 1 Recommended Actions:');
    console.log('  1. Run the force-sync endpoint to populate market volumes');
    console.log('  2. Check blockchain sync service is running');
    console.log('  3. Verify market creation includes proper initial volumes');
  }
  
  if (!bug2Fixed) {
    console.log('\n🔧 Bug 2 Recommended Actions:');
    console.log('  1. Verify backend server is running and accessible');
    console.log('  2. Check VITE_API_URL environment variable in frontend');
    console.log('  3. Ensure reverse proxy correctly routes /api/* to backend');
    console.log('  4. Check CORS configuration');
  }
  
  if (!bug3Fixed) {
    console.log('\n🔧 Bug 3 Recommended Actions:');
    console.log('  1. Restart backend server to initialize burn event processor');
    console.log('  2. Check environment variables for Believe App integration');
    console.log('  3. Verify blockchain connection for event monitoring');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('  1. Deploy the fixes made to the codebase');
  console.log('  2. Restart the backend server');
  console.log('  3. Test the issues manually in production');
  console.log('  4. Monitor logs for any new errors');
}

// Run the debug script
generateReport().catch(error => {
  console.error('❌ Debug script failed:', error);
  process.exit(1);
}); 