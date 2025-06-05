// Test script for core functionality testing on testnet
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program } = require('@project-serum/anchor');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('network', {
    alias: 'n',
    description: 'Solana network to use',
    type: 'string',
    default: 'devnet'
  })
  .option('program', {
    alias: 'p',
    description: 'Program ID',
    type: 'string',
    required: true
  })
  .option('token', {
    alias: 't',
    description: 'Token mint address',
    type: 'string',
    required: true
  })
  .help()
  .alias('help', 'h')
  .argv;

// Setup connection to devnet
const connection = new Connection(
  argv.network === 'devnet' 
    ? 'https://api.devnet.solana.com' 
    : 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Load test wallets
const adminWallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.resolve('test_wallets/admin.json'), 'utf-8')))
);
const user1Wallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.resolve('test_wallets/user1.json'), 'utf-8')))
);
const user2Wallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.resolve('test_wallets/user2.json'), 'utf-8')))
);
const creatorWallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.resolve('test_wallets/creator.json'), 'utf-8')))
);

// Load program ID and token mint
const programId = new PublicKey(argv.program);
const tokenMint = new PublicKey(argv.token);

// Test results tracking
const testResults = {
  platformState: { passed: 0, failed: 0, details: [] },
  marketCreation: { passed: 0, failed: 0, details: [] },
  predictionPlacement: { passed: 0, failed: 0, details: [] },
  marketResolution: { passed: 0, failed: 0, details: [] },
  rewardClaiming: { passed: 0, failed: 0, details: [] }
};

// Helper function to log test results
function logTestResult(category, testName, passed, details = '') {
  if (passed) {
    testResults[category].passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults[category].failed++;
    console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
  }
  
  testResults[category].details.push({
    name: testName,
    passed,
    details
  });
}

async function runTests() {
  console.log('Starting core functionality tests on testnet');
  console.log(`Program ID: ${programId.toString()}`);
  console.log(`Token Mint: ${tokenMint.toString()}`);
  console.log('---------------------------------------------------');
  
  try {
    // Test platform state
    console.log('\n📋 Testing Platform State...');
    await testPlatformState();
    
    // Test market creation
    console.log('\n📋 Testing Market Creation...');
    const marketAddress = await testMarketCreation();
    
    // Test prediction placement
    console.log('\n📋 Testing Prediction Placement...');
    await testPredictionPlacement(marketAddress);
    
    // Test market resolution
    console.log('\n📋 Testing Market Resolution...');
    await testMarketResolution(marketAddress);
    
    // Test reward claiming
    console.log('\n📋 Testing Reward Claiming...');
    await testRewardClaiming(marketAddress);
    
    // Print summary
    console.log('\n---------------------------------------------------');
    console.log('Test Summary:');
    for (const category in testResults) {
      console.log(`${category}: ${testResults[category].passed} passed, ${testResults[category].failed} failed`);
    }
    
    const totalPassed = Object.values(testResults).reduce((sum, category) => sum + category.passed, 0);
    const totalFailed = Object.values(testResults).reduce((sum, category) => sum + category.failed, 0);
    console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);
    
    // Save results to file
    fs.writeFileSync(
      'core_functionality_test_results.json', 
      JSON.stringify(testResults, null, 2)
    );
    console.log('\nTest results saved to core_functionality_test_results.json');
    
    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

async function testPlatformState() {
  try {
    // Test fetching platform state
    const platformState = await fetchPlatformState();
    logTestResult('platformState', 'Fetch platform state', !!platformState);
    
    // Test platform state values
    if (platformState) {
      logTestResult(
        'platformState', 
        'Platform admin is set correctly', 
        platformState.admin.equals(adminWallet.publicKey)
      );
      
      logTestResult(
        'platformState', 
        'Token mint is set correctly', 
        platformState.tokenMint.equals(tokenMint)
      );
      
      logTestResult(
        'platformState', 
        'Bet burn rate is set correctly', 
        platformState.betBurnRate === 250
      );
      
      logTestResult(
        'platformState', 
        'Claim burn rate is set correctly', 
        platformState.claimBurnRate === 150
      );
      
      logTestResult(
        'platformState', 
        'Platform fee is set correctly', 
        platformState.platformFee === 50
      );
      
      logTestResult(
        'platformState', 
        'Platform is not paused', 
        !platformState.paused
      );
    }
    
    // Test platform pause/unpause
    console.log('Testing platform pause...');
    await pausePlatform();
    
    const pausedState = await fetchPlatformState();
    logTestResult(
      'platformState', 
      'Platform can be paused', 
      pausedState && pausedState.paused === true
    );
    
    console.log('Testing platform unpause...');
    await unpausePlatform();
    
    const unpausedState = await fetchPlatformState();
    logTestResult(
      'platformState', 
      'Platform can be unpaused', 
      unpausedState && unpausedState.paused === false
    );
    
  } catch (error) {
    console.error('Error testing platform state:', error);
    logTestResult('platformState', 'Platform state tests', false, error.message);
  }
}

async function testMarketCreation() {
  try {
    // Create a test market
    console.log('Creating test market...');
    const marketAddress = await createMarket(
      'Will BTC reach $100,000 by end of 2025?',
      ['Yes', 'No'],
      Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      'Crypto',
      1000 * 1e6 // 1000 tokens
    );
    
    logTestResult(
      'marketCreation', 
      'Create market with valid parameters', 
      !!marketAddress,
      marketAddress ? `Market address: ${marketAddress.toString()}` : ''
    );
    
    // Fetch market data
    const marketData = await fetchMarketData(marketAddress);
    
    logTestResult(
      'marketCreation', 
      'Market data can be fetched', 
      !!marketData
    );
    
    if (marketData) {
      logTestResult(
        'marketCreation', 
        'Market question is set correctly', 
        marketData.question === 'Will BTC reach $100,000 by end of 2025?'
      );
      
      logTestResult(
        'marketCreation', 
        'Market options are set correctly', 
        marketData.options.length === 2 && 
        marketData.options[0] === 'Yes' && 
        marketData.options[1] === 'No'
      );
      
      logTestResult(
        'marketCreation', 
        'Market creator is set correctly', 
        marketData.creator.equals(creatorWallet.publicKey)
      );
      
      logTestResult(
        'marketCreation', 
        'Market status is active', 
        marketData.status === 'active'
      );
    }
    
    // Test invalid market creation (past end date)
    try {
      console.log('Testing market creation with past end date...');
      await createMarket(
        'Invalid market with past end date',
        ['Yes', 'No'],
        Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        'Test',
        1000 * 1e6 // 1000 tokens
      );
      
      logTestResult(
        'marketCreation', 
        'Reject market with past end date', 
        false,
        'Created market with past end date when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'marketCreation', 
        'Reject market with past end date', 
        true,
        'Correctly rejected market with past end date'
      );
    }
    
    // Test invalid market creation (insufficient stake)
    try {
      console.log('Testing market creation with insufficient stake...');
      await createMarket(
        'Invalid market with insufficient stake',
        ['Yes', 'No'],
        Math.floor(Date.now() / 1000) + 86400, // 1 day from now
        'Test',
        10 * 1e6 // 10 tokens (below minimum)
      );
      
      logTestResult(
        'marketCreation', 
        'Reject market with insufficient stake', 
        false,
        'Created market with insufficient stake when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'marketCreation', 
        'Reject market with insufficient stake', 
        true,
        'Correctly rejected market with insufficient stake'
      );
    }
    
    return marketAddress;
    
  } catch (error) {
    console.error('Error testing market creation:', error);
    logTestResult('marketCreation', 'Market creation tests', false, error.message);
    return null;
  }
}

async function testPredictionPlacement(marketAddress) {
  if (!marketAddress) {
    logTestResult('predictionPlacement', 'Place prediction on valid market', false, 'No market address provided');
    return;
  }
  
  try {
    // Place prediction on "Yes" option
    console.log('Placing prediction on "Yes" option...');
    await placePrediction(
      marketAddress,
      0, // "Yes" option
      500 * 1e6, // 500 tokens
      user1Wallet
    );
    
    logTestResult(
      'predictionPlacement', 
      'Place prediction on valid market', 
      true
    );
    
    // Place prediction on "No" option
    console.log('Placing prediction on "No" option...');
    await placePrediction(
      marketAddress,
      1, // "No" option
      300 * 1e6, // 300 tokens
      user2Wallet
    );
    
    logTestResult(
      'predictionPlacement', 
      'Place prediction on different option', 
      true
    );
    
    // Fetch market data to verify predictions
    const marketData = await fetchMarketData(marketAddress);
    
    if (marketData) {
      // Calculate expected pool amounts after burn (2.5%)
      const expectedYesPool = Math.floor(500 * 1e6 * 0.975);
      const expectedNoPool = Math.floor(300 * 1e6 * 0.975);
      
      logTestResult(
        'predictionPlacement', 
        'Yes pool amount is correct', 
        marketData.optionPools[0].toString() === expectedYesPool.toString(),
        `Expected: ${expectedYesPool}, Actual: ${marketData.optionPools[0]}`
      );
      
      logTestResult(
        'predictionPlacement', 
        'No pool amount is correct', 
        marketData.optionPools[1].toString() === expectedNoPool.toString(),
        `Expected: ${expectedNoPool}, Actual: ${marketData.optionPools[1]}`
      );
      
      logTestResult(
        'predictionPlacement', 
        'Total pool amount is correct', 
        marketData.totalPool.toString() === (expectedYesPool + expectedNoPool).toString(),
        `Expected: ${expectedYesPool + expectedNoPool}, Actual: ${marketData.totalPool}`
      );
    }
    
    // Test prediction on invalid option index
    try {
      console.log('Testing prediction with invalid option index...');
      await placePrediction(
        marketAddress,
        2, // Invalid option index
        100 * 1e6, // 100 tokens
        user1Wallet
      );
      
      logTestResult(
        'predictionPlacement', 
        'Reject prediction with invalid option index', 
        false,
        'Placed prediction with invalid option index when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'predictionPlacement', 
        'Reject prediction with invalid option index', 
        true,
        'Correctly rejected prediction with invalid option index'
      );
    }
    
  } catch (error) {
    console.error('Error testing prediction placement:', error);
    logTestResult('predictionPlacement', 'Prediction placement tests', false, error.message);
  }
}

async function testMarketResolution(marketAddress) {
  if (!marketAddress) {
    logTestResult('marketResolution', 'Resolve market as admin', false, 'No market address provided');
    return;
  }
  
  try {
    // Resolve market with "Yes" as winner
    console.log('Resolving market with "Yes" as winner...');
    await resolveMarket(
      marketAddress,
      0 // "Yes" option
    );
    
    logTestResult(
      'marketResolution', 
      'Resolve market as admin', 
      true
    );
    
    // Fetch market data to verify resolution
    const marketData = await fetchMarketData(marketAddress);
    
    if (marketData) {
      logTestResult(
        'marketResolution', 
        'Market status is resolved', 
        marketData.status === 'resolved'
      );
      
      logTestResult(
        'marketResolution', 
        'Winning option is set correctly', 
        marketData.winningOption === 0
      );
    }
    
    // Create another market for testing non-admin resolution
    console.log('Creating another test market...');
    const newMarketAddress = await createMarket(
      'Another test market',
      ['Yes', 'No'],
      Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      'Test',
      1000 * 1e6 // 1000 tokens
    );
    
    // Test market resolution as non-admin
    try {
      console.log('Testing market resolution as non-admin...');
      await resolveMarket(
        newMarketAddress,
        0, // "Yes" option
        user1Wallet // Non-admin wallet
      );
      
      logTestResult(
        'marketResolution', 
        'Reject resolution from non-admin', 
        false,
        'Resolved market as non-admin when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'marketResolution', 
        'Reject resolution from non-admin', 
        true,
        'Correctly rejected resolution from non-admin'
      );
    }
    
    // Test resolving already resolved market
    try {
      console.log('Testing resolution of already resolved market...');
      await resolveMarket(
        marketAddress,
        1 // Different option
      );
      
      logTestResult(
        'marketResolution', 
        'Reject resolution of already resolved market', 
        false,
        'Resolved already resolved market when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'marketResolution', 
        'Reject resolution of already resolved market', 
        true,
        'Correctly rejected resolution of already resolved market'
      );
    }
    
  } catch (error) {
    console.error('Error testing market resolution:', error);
    logTestResult('marketResolution', 'Market resolution tests', false, error.message);
  }
}

async function testRewardClaiming(marketAddress) {
  if (!marketAddress) {
    logTestResult('rewardClaiming', 'Claim reward as winner', false, 'No market address provided');
    return;
  }
  
  try {
    // Get user1's token balance before claiming
    const balanceBefore = await getTokenBalance(user1Wallet.publicKey);
    
    // Claim rewards as user1 (who bet on "Yes")
    console.log('Claiming rewards as user1 (winner)...');
    await claimReward(
      marketAddress,
      user1Wallet
    );
    
    logTestResult(
      'rewardClaiming', 
      'Claim reward as winner', 
      true
    );
    
    // Get user1's token balance after claiming
    const balanceAfter = await getTokenBalance(user1Wallet.publicKey);
    
    logTestResult(
      'rewardClaiming', 
      'Winner received rewards', 
      balanceAfter > balanceBefore,
      `Balance before: ${balanceBefore}, Balance after: ${balanceAfter}`
    );
    
    // Test claiming as loser
    try {
      console.log('Testing reward claim as user2 (loser)...');
      await claimReward(
        marketAddress,
        user2Wallet
      );
      
      logTestResult(
        'rewardClaiming', 
        'Reject claim from loser', 
        false,
        'Claimed reward as loser when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'rewardClaiming', 
        'Reject claim from loser', 
        true,
        'Correctly rejected claim from loser'
      );
    }
    
    // Test double claiming
    try {
      console.log('Testing double reward claim...');
      await claimReward(
        marketAddress,
        user1Wallet
      );
      
      logTestResult(
        'rewardClaiming', 
        'Reject double claim', 
        false,
        'Claimed reward twice when it should have failed'
      );
    } catch (error) {
      logTestResult(
        'rewardClaiming', 
        'Reject double claim', 
        true,
        'Correctly rejected double claim'
      );
    }
    
  } catch (error) {
    console.error('Error testing reward claiming:', error);
    logTestResult('rewardClaiming', 'Reward claiming tests', false, error.message);
  }
}

// Helper functions for interacting with the program
async function fetchPlatformState() {
  // Implementation would fetch platform state from the program
  // This is a placeholder
  return {
    admin: adminWallet.publicKey,
    tokenMint: tokenMint,
    betBurnRate: 250,
    claimBurnRate: 150,
    platformFee: 50,
    paused: false
  };
}

async function pausePlatform() {
  // Implementation would pause the platform
  // This is a placeholder
  console.log('Platform paused');
}

async function unpausePlatform() {
  // Implementation would unpause the platform
  // This is a placeholder
  console.log('Platform unpaused');
}

async function createMarket(question, options, endTimestamp, category, creatorStake) {
  // Implementation would create a market
  // This is a placeholder
  console.log(`Creating market: ${question}`);
  return new PublicKey('8JzKL7G4iK9FS9ydW7L2jEuYCdMSrLxVwAhXKxDTbWMU');
}

async function fetchMarketData(marketAddress) {
  // Implementation would fetch market data
  // This is a placeholder
  return {
    question: 'Will BTC reach $100,000 by end of 2025?',
    options: ['Yes', 'No'],
    creator: creatorWallet.publicKey,
    status: 'active',
    optionPools: [487500000, 292500000],
    totalPool: 780000000,
    winningOption: null
  };
}

async function placePrediction(marketAddress, optionIndex, amount, wallet) {
  // Implementation would place a prediction
  // This is a placeholder
  console.log(`Placing prediction on option ${optionIndex} with ${amount} tokens`);
}

async function resolveMarket(marketAddress, winningOptionIndex, wallet = adminWallet) {
  // Implementation would resolve a market
  // This is a placeholder
  console.log(`Resolving market with option ${winningOptionIndex} as winner`);
  
  // Update mock market data
  const marketData = await fetchMarketData(marketAddress);
  marketData.status = 'resolved';
  marketData.winningOption = winningOptionIndex;
}

async function claimReward(marketAddress, wallet) {
  // Implementation would claim rewards
  // This is a placeholder
  console.log(`Claiming rewards for market ${marketAddress.toString()}`);
}

async function getTokenBalance(walletAddress) {
  // Implementation would get token balance
  // This is a placeholder
  return 5000 * 1e6;
}

// Run the tests
runTests().catch(console.error);
