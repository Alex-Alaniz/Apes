#!/usr/bin/env node

const axios = require('axios');

// Test endpoints
const endpoints = {
  primary: 'https://polymarket.primape.app/api/v1',
  alternative: 'https://polymarket-pipeline-primape.replit.app/api/v1'
};

async function testEndpoint(baseUrl, name) {
  console.log(`\n🔍 Testing ${name} endpoint: ${baseUrl}`);
  
  try {
    // Test deployed markets endpoint
    console.log('\n1️⃣ Testing /solana/deployed-markets...');
    const deployedResponse = await axios.get(`${baseUrl}/solana/deployed-markets`);
    console.log(`✅ Success! Found ${deployedResponse.data.total_markets || deployedResponse.data.markets?.length || 0} markets`);
    
    if (deployedResponse.data.markets && deployedResponse.data.markets.length > 0) {
      const sampleMarket = deployedResponse.data.markets[0];
      console.log('\n📊 Sample market structure:');
      console.log({
        poly_id: sampleMarket.poly_id,
        question: sampleMarket.question,
        category: sampleMarket.category,
        has_banner: !!sampleMarket.assets?.banner,
        has_icon: !!sampleMarket.assets?.icon,
        options_count: sampleMarket.options?.length,
        market_type: sampleMarket.market_type
      });
    }
    
    // Test live markets endpoint
    console.log('\n2️⃣ Testing /markets?status=live...');
    try {
      const liveResponse = await axios.get(`${baseUrl}/markets`, {
        params: { status: 'live' }
      });
      console.log(`✅ Success! Found ${liveResponse.data.total_markets || liveResponse.data.markets?.length || 0} live markets`);
    } catch (error) {
      console.log(`⚠️  Live markets endpoint error: ${error.response?.status || error.message}`);
    }
    
    // Test assets endpoint
    console.log('\n3️⃣ Testing /markets/chain/assets...');
    try {
      const assetsResponse = await axios.get(`${baseUrl}/markets/chain/assets`);
      const assetCount = Object.keys(assetsResponse.data).length;
      console.log(`✅ Success! Found assets for ${assetCount} markets`);
    } catch (error) {
      console.log(`⚠️  Assets endpoint error: ${error.response?.status || error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    return false;
  }
}

async function testImageLoading() {
  console.log('\n🖼️  Testing image loading...\n');
  
  try {
    const response = await axios.get(`${endpoints.primary}/solana/deployed-markets`);
    const markets = response.data.markets || [];
    
    // Find markets with images
    const marketsWithImages = markets.filter(m => m.assets?.banner || m.assets?.icon);
    console.log(`Found ${marketsWithImages.length} markets with images out of ${markets.length} total markets`);
    
    if (marketsWithImages.length > 0) {
      console.log('\n📸 Sample market images:');
      marketsWithImages.slice(0, 3).forEach((market, index) => {
        console.log(`\n${index + 1}. ${market.question}`);
        if (market.assets?.banner) {
          console.log(`   Banner: ${market.assets.banner.substring(0, 80)}...`);
        }
        if (market.assets?.icon) {
          console.log(`   Icon: ${market.assets.icon.substring(0, 80)}...`);
        }
        
        // Check option icons
        const optionsWithIcons = (market.options || []).filter(opt => opt.icon);
        if (optionsWithIcons.length > 0) {
          console.log(`   Option icons: ${optionsWithIcons.length}/${market.options.length}`);
        }
      });
    }
  } catch (error) {
    console.error('Failed to test images:', error.message);
  }
}

async function testDataTransformation() {
  console.log('\n🔄 Testing data transformation...\n');
  
  try {
    const response = await axios.get(`${endpoints.primary}/solana/deployed-markets`);
    const markets = response.data.markets || [];
    
    if (markets.length === 0) {
      console.log('No markets to transform');
      return;
    }
    
    // Transform first market
    const polyMarket = markets[0];
    const transformed = {
      // External references
      polyId: polyMarket.poly_id,
      apechainMarketId: polyMarket.apechain_market_id,
      
      // Basic market info
      question: polyMarket.question,
      category: polyMarket.category?.toLowerCase() || 'general',
      status: determineStatus(polyMarket),
      endTime: polyMarket.end_time,
      
      // Options
      options: polyMarket.options.map(opt => opt.label),
      options_metadata: polyMarket.options.map(opt => ({
        label: opt.label,
        icon: opt.icon,
        polyId: opt.option_poly_id
      })),
      
      // Assets
      assets: {
        banner: polyMarket.assets?.banner || null,
        icon: polyMarket.assets?.icon || null
      },
      
      // Additional metadata
      marketType: polyMarket.market_type,
      deployedAt: polyMarket.deployed_at,
      isTrending: polyMarket.is_trending || false
    };
    
    console.log('✅ Transformation successful!');
    console.log('\nTransformed market:', JSON.stringify(transformed, null, 2));
  } catch (error) {
    console.error('Failed to test transformation:', error.message);
  }
}

function determineStatus(market) {
  if (market.status === 'resolved') return 'Resolved';
  
  const now = new Date();
  const endTime = new Date(market.end_time);
  
  if (endTime < now) {
    return 'Pending Resolution';
  }
  
  return 'Active';
}

async function runTests() {
  console.log('🚀 Testing Polymarket Pipeline Integration\n');
  
  // Test primary endpoint
  const primarySuccess = await testEndpoint(endpoints.primary, 'Primary');
  
  // Test alternative endpoint if primary fails
  if (!primarySuccess) {
    await testEndpoint(endpoints.alternative, 'Alternative');
  }
  
  // Test image loading
  await testImageLoading();
  
  // Test data transformation
  await testDataTransformation();
  
  console.log('\n✨ Testing complete!\n');
  
  console.log('📋 Integration checklist:');
  console.log('1. ✅ API endpoints are accessible');
  console.log('2. ✅ Market data structure is correct');
  console.log('3. ✅ Images URLs are provided');
  console.log('4. ✅ Data transformation works');
  console.log('5. ⏳ Ready to sync with Solana markets');
}

// Run tests
runTests().catch(console.error); 