const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/frontend/src/idl/market_system.json'), 'utf8'));

async function checkExistingPredictions() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
  
  // Create a dummy provider just to read accounts
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs
  };
  const provider = new AnchorProvider(connection, dummyWallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);
  
  try {
    console.log('🔍 Analyzing all existing predictions\n');
    
    // Fetch all predictions
    const predictions = await program.account.prediction.all();
    
    console.log(`Found ${predictions.length} total predictions\n`);
    
    // Group predictions by market
    const predictionsByMarket = {};
    predictions.forEach(({ publicKey, account }) => {
      const market = account.market.toString();
      if (!predictionsByMarket[market]) {
        predictionsByMarket[market] = [];
      }
      predictionsByMarket[market].push({
        predictionPubkey: publicKey.toString(),
        user: account.user.toString(),
        amount: account.amount.toString(),
        optionIndex: account.optionIndex,
        claimed: account.claimed
      });
    });
    
    // Analyze each market
    console.log('📊 Predictions by Market:\n');
    Object.entries(predictionsByMarket).forEach(([market, marketPredictions]) => {
      console.log(`Market: ${market}`);
      console.log(`  Total predictions: ${marketPredictions.length}`);
      
      // Show all users who have bet on this market
      const uniqueUsers = new Set(marketPredictions.map(p => p.user));
      console.log(`  Unique users: ${uniqueUsers.size}`);
      
      if (marketPredictions.length > 1) {
        console.log('  📌 Multiple predictions on this market:');
        marketPredictions.forEach(pred => {
          console.log(`    - User: ${pred.user.substring(0, 8)}...`);
          console.log(`      Amount: ${pred.amount} | Option: ${pred.optionIndex} | Claimed: ${pred.claimed}`);
        });
      }
      console.log('');
    });
    
    // Check if ANY market has multiple users
    let foundMultipleUsers = false;
    Object.entries(predictionsByMarket).forEach(([market, marketPredictions]) => {
      const uniqueUsers = new Set(marketPredictions.map(p => p.user));
      if (uniqueUsers.size > 1) {
        foundMultipleUsers = true;
        console.log(`✅ Market ${market.substring(0, 8)}... has ${uniqueUsers.size} different users!`);
      }
    });
    
    if (!foundMultipleUsers) {
      console.log('❌ NO market has multiple different users betting on it');
      console.log('   This suggests there might be an issue preventing different users from betting on the same market');
    }
    
    // List all unique users who have placed any prediction
    const allUsers = new Set();
    predictions.forEach(({ account }) => {
      allUsers.add(account.user.toString());
    });
    
    console.log('\n👥 All users who have placed predictions:');
    Array.from(allUsers).forEach(user => {
      console.log(`  - ${user}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExistingPredictions(); 