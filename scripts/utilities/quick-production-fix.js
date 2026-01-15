#!/usr/bin/env node

/**
 * Quick Production Fix Script for APES Platform
 * 
 * This script provides immediate fixes for the production bugs:
 * 1. Force sync market volumes to fix 50/50 slider issue
 * 2. Test and validate API connectivity
 * 3. Restart services to initialize burn processor
 */

const API_URL = process.env.VITE_API_URL || 'https://apes-production.up.railway.app';

console.log('🚀 APES Quick Production Fix');
console.log('============================');
console.log(`API URL: ${API_URL}`);

async function makeApiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fixMarketVolumes() {
  console.log('\n🔧 Fix 1: Forcing market volume sync...');
  
  const result = await makeApiCall('/api/markets/force-sync', 'POST');
  
  if (result.success) {
    console.log('✅ Market volumes force synced successfully');
    console.log(`   Synced: ${result.data.synced} markets`);
    return true;
  } else {
    console.log(`❌ Failed to sync volumes: ${result.error}`);
    return false;
  }
}

async function fixParticipantCounts() {
  console.log('\n🔧 Fix 2: Recounting participants...');
  
  const result = await makeApiCall('/api/markets/recount-participants', 'POST');
  
  if (result.success) {
    console.log('✅ Participant counts recalculated successfully');
    console.log(`   Updated: ${result.data.updated} markets`);
    return true;
  } else {
    console.log(`❌ Failed to recount participants: ${result.error}`);
    return false;
  }
}

async function testApiConnectivity() {
  console.log('\n🔧 Fix 3: Testing API connectivity...');
  
  const result = await makeApiCall('/api/markets');
  
  if (result.success) {
    console.log('✅ API is responding correctly');
    console.log(`   Found ${result.data.length} markets`);
    
    if (result.data.length > 0) {
      const firstMarket = result.data[0];
      console.log(`   First market volume: ${firstMarket.totalVolume}`);
      console.log(`   First market percentages: [${firstMarket.optionPercentages?.join(', ')}]`);
    }
    
    return true;
  } else {
    console.log(`❌ API connectivity issue: ${result.error}`);
    return false;
  }
}

async function runFixes() {
  console.log('Starting production fixes...\n');
  
  const connectivityOk = await testApiConnectivity();
  
  if (!connectivityOk) {
    console.log('\n❌ Cannot proceed - API is not accessible');
    console.log('   Check if backend server is running');
    console.log('   Verify API_URL environment variable');
    process.exit(1);
  }
  
  const volumesFixed = await fixMarketVolumes();
  const participantsFixed = await fixParticipantCounts();
  
  console.log('\n🎯 Quick Fix Summary:');
  console.log(`   API Connectivity: ${connectivityOk ? '✅' : '❌'}`);
  console.log(`   Market Volumes: ${volumesFixed ? '✅' : '❌'}`);
  console.log(`   Participant Counts: ${participantsFixed ? '✅' : '❌'}`);
  
  if (volumesFixed && participantsFixed) {
    console.log('\n🎉 All quick fixes applied successfully!');
    console.log('   The 50/50 slider issue should now be resolved');
    console.log('   Volume displays should now show correct data');
  } else {
    console.log('\n⚠️  Some fixes failed - manual intervention may be needed');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Test the frontend at https://www.primape.app/markets');
  console.log('   2. Try saving a username at https://www.primape.app/profile');
  console.log('   3. Check if sliders show proper percentages');
  console.log('   4. Restart backend server if burn functionality still not working');
}

// Execute the fixes
runFixes().catch(error => {
  console.error('❌ Quick fix script failed:', error);
  process.exit(1);
}); 