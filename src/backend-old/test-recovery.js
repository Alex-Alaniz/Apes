const BlockchainMarketRecovery = require('./scripts/recover-blockchain-markets');

async function testRecovery() {
  console.log('🧪 Testing blockchain market recovery...\n');
  
  try {
    const recovery = new BlockchainMarketRecovery();
    
    // Test initialization
    console.log('1️⃣ Testing initialization...');
    await recovery.initialize();
    
    // Test blockchain fetch
    console.log('\n2️⃣ Testing blockchain market fetch...');
    const blockchainMarkets = await recovery.fetchAllBlockchainMarkets();
    console.log(`Found ${blockchainMarkets.length} markets on blockchain`);
    
    // Test database fetch
    console.log('\n3️⃣ Testing database market fetch...');
    const databaseMarkets = await recovery.fetchDatabaseMarkets();
    console.log(`Found ${databaseMarkets.length} markets in database`);
    
    // Test missing market detection
    console.log('\n4️⃣ Testing missing market detection...');
    const missingMarkets = await recovery.findMissingMarkets();
    
    if (missingMarkets.length > 0) {
      console.log('\n5️⃣ Found missing markets - would you like to import them? (This is just a test, skipping actual import)');
      console.log('Missing markets:');
      missingMarkets.forEach((market, index) => {
        console.log(`  ${index + 1}. ${market.market_address}`);
        console.log(`     Question: ${market.question}`);
        console.log(`     Creator: ${market.creator}`);
        console.log(`     Volume: ${market.total_volume} APES`);
        console.log('');
      });
    } else {
      console.log('✅ No missing markets found - database is in sync!');
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\nTo actually run the recovery, use:');
    console.log('  node scripts/recover-blockchain-markets.js');
    console.log('Or call the API endpoint:');
    console.log('  POST /api/markets/recover-blockchain');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testRecovery(); 