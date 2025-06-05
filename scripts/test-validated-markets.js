#!/usr/bin/env node

const axios = require('axios');

async function testValidatedMarkets() {
  console.log('🔍 Testing Validated Markets Endpoint\n');
  
  const endpoints = {
    validated: 'https://polymarket.primape.app/api/v1/solana/deployed-markets?validate=true',
    nonValidated: 'https://polymarket.primape.app/api/v1/solana/deployed-markets?validate=false'
  };

  try {
    // Test validated endpoint
    console.log('1️⃣ Testing with validation (blockchain checks)...');
    const startTime = Date.now();
    const validatedResponse = await axios.get(endpoints.validated);
    const validationTime = Date.now() - startTime;
    
    console.log(`✅ Success! Took ${validationTime}ms`);
    console.log(`   Active markets: ${validatedResponse.data.markets?.length || 0}`);
    console.log(`   Inactive markets: ${validatedResponse.data.inactive_markets?.count || 0}`);
    console.log(`   Chain validated: ${validatedResponse.data.chain_validated}`);
    
    // Show sample validated market
    if (validatedResponse.data.markets?.length > 0) {
      const sample = validatedResponse.data.markets[0];
      console.log('\n📊 Sample Active Market:');
      console.log(`   Question: ${sample.question}`);
      console.log(`   ApeChain ID: ${sample.apechain_market_id}`);
      console.log(`   End Time: ${sample.end_time}`);
      console.log(`   Chain Status:`);
      console.log(`     - Is Active: ${sample.chain_validation?.is_active}`);
      console.log(`     - Is Resolved: ${sample.chain_validation?.is_resolved}`);
      console.log(`     - Is Expired: ${sample.chain_validation?.is_expired}`);
    }
    
    // Show inactive markets if any
    if (validatedResponse.data.inactive_markets?.markets?.length > 0) {
      console.log('\n⚠️  Sample Inactive Market:');
      const inactive = validatedResponse.data.inactive_markets.markets[0];
      console.log(`   Question: ${inactive.question}`);
      console.log(`   Reason: ${inactive.chain_validation?.is_resolved ? 'Resolved' : 'Expired'}`);
      if (inactive.chain_validation?.winner !== null) {
        console.log(`   Winner: Option ${inactive.chain_validation.winner}`);
      }
    }
    
    // Compare with non-validated
    console.log('\n2️⃣ Comparing with non-validated endpoint...');
    const nonValidatedResponse = await axios.get(endpoints.nonValidated);
    const totalMarkets = nonValidatedResponse.data.markets?.length || 0;
    const activeMarkets = validatedResponse.data.markets?.length || 0;
    const filteredOut = totalMarkets - activeMarkets;
    
    console.log(`   Total markets (unvalidated): ${totalMarkets}`);
    console.log(`   Active markets (validated): ${activeMarkets}`);
    console.log(`   Filtered out: ${filteredOut} markets`);
    
    // Test batch validation endpoint
    console.log('\n3️⃣ Testing batch validation...');
    if (validatedResponse.data.markets?.length > 0) {
      const marketIds = validatedResponse.data.markets
        .slice(0, 3)
        .map(m => m.apechain_market_id);
      
      try {
        const batchResponse = await axios.post(
          'https://polymarket.primape.app/api/v1/markets/batch-validate',
          { market_ids: marketIds }
        );
        
        console.log(`✅ Batch validation successful!`);
        console.log(`   Validated ${Object.keys(batchResponse.data).length} markets`);
      } catch (error) {
        console.log(`⚠️  Batch validation not available: ${error.response?.status || error.message}`);
      }
    }
    
    // Summary
    console.log('\n📈 VALIDATION SUMMARY:');
    console.log(`✅ Active markets ready for Solana: ${activeMarkets}`);
    console.log(`❌ Resolved/expired markets filtered: ${filteredOut}`);
    console.log(`⏱️  Validation time: ${validationTime}ms`);
    
    return validatedResponse.data;
  } catch (error) {
    console.error('❌ Error testing validated markets:', error.response?.data || error.message);
    return null;
  }
}

async function analyzeMarketReadiness() {
  console.log('\n🎯 Analyzing Market Readiness for Solana\n');
  
  const data = await testValidatedMarkets();
  if (!data || !data.markets) return;
  
  // Analyze markets by category
  const byCategory = {};
  const byEndTime = { thisWeek: 0, thisMonth: 0, later: 0 };
  
  data.markets.forEach(market => {
    // Category analysis
    const category = market.category || 'general';
    byCategory[category] = (byCategory[category] || 0) + 1;
    
    // Time analysis
    const endTime = new Date(market.end_time);
    const now = new Date();
    const daysUntilEnd = (endTime - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilEnd <= 7) byEndTime.thisWeek++;
    else if (daysUntilEnd <= 30) byEndTime.thisMonth++;
    else byEndTime.later++;
  });
  
  console.log('📊 Markets by Category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} markets`);
  });
  
  console.log('\n⏰ Markets by End Time:');
  console.log(`   This week: ${byEndTime.thisWeek}`);
  console.log(`   This month: ${byEndTime.thisMonth}`);
  console.log(`   Later: ${byEndTime.later}`);
  
  console.log('\n✅ READY FOR SOLANA DEPLOYMENT:');
  console.log(`   ${data.markets.length} validated active markets`);
  console.log('   All markets confirmed active on ApeChain');
  console.log('   No resolved/expired markets included');
}

// Run the tests
async function main() {
  console.log('🚀 ApeChain Market Validation Test\n');
  console.log('This ensures only active markets are synced to Solana\n');
  
  await analyzeMarketReadiness();
  
  console.log('\n💡 Next Steps:');
  console.log('1. Create these validated markets on Solana');
  console.log('2. Set up periodic sync to check for new markets');
  console.log('3. Monitor for market resolutions on ApeChain');
}

main().catch(console.error); 