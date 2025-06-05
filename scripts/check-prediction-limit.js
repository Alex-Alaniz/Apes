const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/frontend/src/idl/market_system.json'), 'utf8'));

async function checkPredictionLimit() {
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
    console.log('🔍 Checking prediction structure and limits\n');
    
    // Fetch all markets
    const markets = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 691 }]
    });
    
    console.log(`Found ${markets.length} markets\n`);
    
    // Fetch all predictions
    const predictions = await program.account.prediction.all();
    
    console.log(`Found ${predictions.length} total predictions\n`);
    
    // Group predictions by user
    const predictionsByUser = {};
    predictions.forEach(({ publicKey, account }) => {
      const user = account.user.toString();
      if (!predictionsByUser[user]) {
        predictionsByUser[user] = [];
      }
      predictionsByUser[user].push({
        predictionPubkey: publicKey.toString(),
        market: account.market.toString(),
        amount: account.amount.toString(),
        optionIndex: account.optionIndex
      });
    });
    
    // Check if any user has multiple predictions on the same market
    let foundMultiple = false;
    Object.entries(predictionsByUser).forEach(([user, userPredictions]) => {
      const marketCounts = {};
      userPredictions.forEach(pred => {
        marketCounts[pred.market] = (marketCounts[pred.market] || 0) + 1;
      });
      
      Object.entries(marketCounts).forEach(([market, count]) => {
        if (count > 1) {
          foundMultiple = true;
          console.log(`⚠️  User ${user} has ${count} predictions on market ${market}`);
        }
      });
    });
    
    if (!foundMultiple) {
      console.log('✅ No user has multiple predictions on the same market');
    }
    
    // Show the Rust struct definition
    console.log('\n📋 Smart Contract Structure:');
    console.log('```rust');
    console.log('#[account(');
    console.log('    init,  // <-- This constraint means "create new account"');
    console.log('    payer = user,');
    console.log('    space = 8 + Prediction::LEN,');
    console.log('    seeds = [b"prediction", market.key().as_ref(), user.key().as_ref()],');
    console.log('    bump');
    console.log(')]');
    console.log('pub prediction: Account<\'info, Prediction>,');
    console.log('```');
    
    console.log('\n❌ LIMITATION CONFIRMED:');
    console.log('   The "init" constraint prevents multiple predictions per user per market.');
    console.log('   To allow multiple predictions, the smart contract would need to be modified to:');
    console.log('   1. Remove the "init" constraint and use "init_if_needed" or "mut"');
    console.log('   2. Update the prediction amount instead of creating a new account');
    console.log('   3. OR use a different account structure (e.g., prediction with counter in seeds)');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPredictionLimit(); 