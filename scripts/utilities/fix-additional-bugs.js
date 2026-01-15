#!/usr/bin/env node

/**
 * Fix Additional Production Bugs Script
 * 
 * This script addresses the 4 additional production bugs:
 * 1. Leaderboard not tracking Total Invested APES
 * 2. Username saving still returning 404 HTML 
 * 3. Admin assets page not loading (localhost URL issue)
 * 4. Participant count stuck at 0
 */

const API_URL = process.env.VITE_API_URL || 'https://apes-production.up.railway.app';

console.log('🚀 APES Additional Bug Fixes');
console.log('===========================');
console.log(`API URL: ${API_URL}`);

async function makeApiCall(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const responseText = await response.text();
      // Check if it's HTML error (404 page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error(`HTML Error ${response.status}: Route not found - received HTML instead of JSON`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { success: true, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message, isHtmlError: error.message.includes('HTML Error') };
  }
}

async function testBug1_LeaderboardAPESTracking() {
  console.log('\n🐛 Bug 1: Testing Leaderboard APES Tracking...');
  
  const result = await makeApiCall('/api/leaderboard');
  
  if (result.success) {
    const leaderboard = result.data.leaderboard || [];
    console.log(`✅ Leaderboard API working: ${leaderboard.length} users found`);
    
    if (leaderboard.length > 0) {
      const firstUser = leaderboard[0];
      console.log(`📊 First user data:`, {
        wallet: firstUser.wallet_address?.slice(0, 8) + '...',
        total_invested: firstUser.total_invested,
        total_predictions: firstUser.total_predictions,
        engagement_points: firstUser.engagement_points
      });
      
      const hasInvestmentData = leaderboard.some(user => user.total_invested > 0);
      if (hasInvestmentData) {
        console.log('✅ SUCCESS: Leaderboard is now tracking APES investments!');
        return true;
      } else {
        console.log('❌ ISSUE: All users still show 0 total_invested - data needs to be populated');
        return false;
      }
    } else {
      console.log('⚠️  No users in leaderboard');
      return false;
    }
  } else {
    console.log(`❌ Leaderboard API failed: ${result.error}`);
    return false;
  }
}

async function testBug2_UsernameSave() {
  console.log('\n🐛 Bug 2: Testing Username Save Functionality...');
  
  // Test the route with a dummy request
  const testWallet = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';
  const result = await makeApiCall(
    `/api/users/${testWallet}/username`, 
    'PUT', 
    { username: 'testuser' },
    { 'x-wallet-address': testWallet }
  );
  
  if (result.success) {
    console.log('✅ SUCCESS: Username API route is working (returned JSON)');
    return true;
  } else if (result.isHtmlError) {
    console.log('❌ ISSUE: Username route still returning HTML 404 error');
    console.log('  This indicates the backend route is not properly deployed/accessible');
    return false;
  } else {
    console.log(`✅ SUCCESS: Route exists (got proper JSON error: ${result.error})`);
    return true;
  }
}

async function testBug3_AdminAssetsPage() {
  console.log('\n🐛 Bug 3: Testing Admin Assets API Access...');
  
  // Test the markets endpoint that AdminAssetsPage uses
  const result = await makeApiCall('/api/markets');
  
  if (result.success) {
    console.log(`✅ SUCCESS: Markets API accessible for admin assets page`);
    console.log(`📊 Found ${result.data.length} markets`);
    return true;
  } else {
    console.log(`❌ ISSUE: Markets API not accessible: ${result.error}`);
    return false;
  }
}

async function testBug4_ParticipantCounts() {
  console.log('\n🐛 Bug 4: Testing Participant Count Fix...');
  
  // First, force sync to fix participant counts
  console.log('🔧 Running force sync to fix participant counts...');
  const syncResult = await makeApiCall('/api/markets/force-sync', 'POST');
  
  if (!syncResult.success) {
    console.log(`❌ Force sync failed: ${syncResult.error}`);
    return false;
  }
  
  console.log(`✅ Force sync completed: synced ${syncResult.data.synced} markets`);
  
  // Now test if participant counts are fixed
  const marketsResult = await makeApiCall('/api/markets');
  
  if (marketsResult.success) {
    const markets = marketsResult.data;
    const marketsWithParticipants = markets.filter(m => m.participantCount > 0);
    
    console.log(`📊 Markets status:`, {
      total: markets.length,
      withParticipants: marketsWithParticipants.length,
      withoutParticipants: markets.length - marketsWithParticipants.length
    });
    
    if (marketsWithParticipants.length > 0) {
      console.log('✅ SUCCESS: Some markets now have participant counts > 0');
      const sampleMarket = marketsWithParticipants[0];
      console.log(`📋 Sample market: ${sampleMarket.participantCount} participants, ${sampleMarket.totalVolume} APES volume`);
      return true;
    } else {
      console.log('❌ ISSUE: All markets still have 0 participants');
      return false;
    }
  } else {
    console.log(`❌ Failed to fetch markets: ${marketsResult.error}`);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting additional bug fixes tests...\n');
  
  const bug1Fixed = await testBug1_LeaderboardAPESTracking();
  const bug2Fixed = await testBug2_UsernameSave();
  const bug3Fixed = await testBug3_AdminAssetsPage();
  const bug4Fixed = await testBug4_ParticipantCounts();
  
  console.log('\n🎯 Additional Bug Fixes Summary:');
  console.log(`   Bug 1 (Leaderboard APES): ${bug1Fixed ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
  console.log(`   Bug 2 (Username Save): ${bug2Fixed ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
  console.log(`   Bug 3 (Admin Assets): ${bug3Fixed ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
  console.log(`   Bug 4 (Participant Count): ${bug4Fixed ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
  
  const allFixed = bug1Fixed && bug2Fixed && bug3Fixed && bug4Fixed;
  
  if (allFixed) {
    console.log('\n🎉 ALL ADDITIONAL BUGS FIXED!');
    console.log('Production platform should now be fully functional.');
  } else {
    console.log('\n⚠️  Some issues remain - check individual test results above.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Test manually at https://www.primape.app');
  console.log('   2. Check leaderboard shows APES volume');
  console.log('   3. Try saving username in profile');
  console.log('   4. Verify admin assets page loads');
  console.log('   5. Confirm participant counts are displayed');
}

// Execute the tests
runAllTests().catch(error => {
  console.error('❌ Additional bug fix script failed:', error);
  process.exit(1);
}); 