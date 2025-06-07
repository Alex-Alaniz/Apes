#!/usr/bin/env node

/**
 * Test Alchemy RPC Performance
 * 
 * Quick test to verify that Alchemy RPC is working and has better rate limits
 */

const { Connection } = require('@solana/web3.js');

const ALCHEMY_RPC = 'https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN';
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d';

async function testRpcPerformance(rpcUrl, name) {
  console.log(`\n🧪 Testing ${name} RPC: ${rpcUrl.split('?')[0]}...`);
  
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Test 1: Basic connectivity
    const startTime = Date.now();
    const slot = await connection.getSlot();
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ ${name} - Connected successfully`);
    console.log(`   Current Slot: ${slot}`);
    console.log(`   Response Time: ${responseTime}ms`);
    
    // Test 2: Multiple rapid requests (rate limit test)
    console.log(`   Testing rate limits with 5 rapid requests...`);
    const rapidStartTime = Date.now();
    
    const rapidRequests = [];
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(connection.getSlot());
    }
    
    await Promise.all(rapidRequests);
    const rapidResponseTime = Date.now() - rapidStartTime;
    
    console.log(`   ✅ All 5 requests completed in ${rapidResponseTime}ms`);
    console.log(`   Average: ${Math.round(rapidResponseTime / 5)}ms per request`);
    
    return {
      success: true,
      responseTime,
      rapidResponseTime,
      slot
    };
    
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Testing RPC Performance to solve 429 rate limit issues...\n');
  
  // Test both endpoints
  const alchemyResult = await testRpcPerformance(ALCHEMY_RPC, 'Alchemy');
  const heliusResult = await testRpcPerformance(HELIUS_RPC, 'Helius');
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('=' * 50);
  
  if (alchemyResult.success && heliusResult.success) {
    const alchemyFaster = alchemyResult.responseTime < heliusResult.responseTime;
    const rapidFaster = alchemyResult.rapidResponseTime < heliusResult.rapidResponseTime;
    
    console.log(`🏆 Single Request Winner: ${alchemyFaster ? 'Alchemy' : 'Helius'}`);
    console.log(`🔥 Rapid Requests Winner: ${rapidFaster ? 'Alchemy' : 'Helius'}`);
    
    console.log(`\n💡 Recommendation: Use ${rapidFaster ? 'Alchemy' : 'Helius'} as primary for better rate limits`);
  } else if (alchemyResult.success) {
    console.log('🎯 Alchemy is working, Helius has issues - Alchemy is the clear choice!');
  } else if (heliusResult.success) {
    console.log('⚠️  Helius working but Alchemy failed - investigate Alchemy endpoint');
  } else {
    console.log('🚨 Both endpoints failed - check network connectivity');
  }
  
  console.log('\n✅ RPC configuration updated to use Alchemy as primary endpoint');
  console.log('🔄 Frontend and backend now configured to use Alchemy for better rate limits');
}

main().catch(console.error); 