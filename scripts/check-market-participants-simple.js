const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

// APES Program
const PROGRAM_ID = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
const MARKET_ADDRESS = '4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr';

async function checkMarketParticipants() {
  try {
    console.log(`\n🔍 Checking participants for market: ${MARKET_ADDRESS}\n`);
    
    // Connect to mainnet
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const marketPubkey = new PublicKey(MARKET_ADDRESS);
    
    // First, let's check if the market account exists
    console.log('📊 Fetching market account info...');
    const marketInfo = await connection.getAccountInfo(marketPubkey);
    
    if (!marketInfo) {
      console.log('❌ Market account not found on blockchain');
      return;
    }
    
    console.log(`✅ Market account found:`, {
      owner: marketInfo.owner.toString(),
      lamports: marketInfo.lamports,
      dataLength: marketInfo.data.length,
      executable: marketInfo.executable
    });
    
    // Check if owned by APES program
    if (!marketInfo.owner.equals(PROGRAM_ID)) {
      console.log(`⚠️  Market is not owned by APES program. Owner: ${marketInfo.owner.toString()}`);
    }
    
    // Fetch all prediction accounts for this market
    console.log('\n🔍 Searching for prediction accounts...\n');
    
    // We'll search for accounts owned by the program with the market address in their data
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 57, // Expected size of Prediction account
        },
      ],
    });
    
    console.log(`📊 Found ${accounts.length} total prediction accounts from the program`);
    
    // Filter for predictions related to our market
    const marketPredictions = [];
    
    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data;
        
        // Skip discriminator (8 bytes) and user pubkey (32 bytes) to get market pubkey
        const marketPubkeyBytes = data.slice(40, 72);
        const predictionMarket = new PublicKey(marketPubkeyBytes);
        
        if (predictionMarket.equals(marketPubkey)) {
          // This prediction is for our market
          let offset = 8; // Skip discriminator
          
          // Read user pubkey (32 bytes)
          const userPubkey = new PublicKey(data.slice(offset, offset + 32));
          offset += 32;
          
          // Skip market pubkey (32 bytes) - we already know it
          offset += 32;
          
          // Read option index (1 byte)
          const optionIndex = data[offset];
          offset += 1;
          
          // Read amount (8 bytes, little-endian)
          const amountBytes = data.slice(offset, offset + 8);
          const amount = Number(Buffer.from(amountBytes).readBigUInt64LE()) / 1e6; // Convert to APES
          offset += 8;
          
          // Read timestamp (8 bytes, little-endian)
          const timestampBytes = data.slice(offset, offset + 8);
          const timestamp = Number(Buffer.from(timestampBytes).readBigInt64LE());
          offset += 8;
          
          // Read claimed status (1 byte)
          const claimed = data[offset] === 1;
          
          marketPredictions.push({
            pubkey: pubkey.toString(),
            user: userPubkey.toString(),
            optionIndex,
            amount,
            timestamp: new Date(timestamp * 1000),
            claimed
          });
        }
      } catch (error) {
        // Skip invalid accounts
      }
    }
    
    console.log(`\n📊 Found ${marketPredictions.length} predictions for this market\n`);
    
    // Analyze participants
    const uniqueUsers = new Set();
    const optionStats = {};
    let totalVolume = 0;
    let claimedCount = 0;
    let unclaimedCount = 0;
    
    marketPredictions.forEach(pred => {
      uniqueUsers.add(pred.user);
      totalVolume += pred.amount;
      
      if (pred.claimed) {
        claimedCount++;
      } else {
        unclaimedCount++;
      }
      
      if (!optionStats[pred.optionIndex]) {
        optionStats[pred.optionIndex] = {
          count: 0,
          volume: 0,
          users: new Set(),
          claimed: 0,
          unclaimed: 0
        };
      }
      
      optionStats[pred.optionIndex].count++;
      optionStats[pred.optionIndex].volume += pred.amount;
      optionStats[pred.optionIndex].users.add(pred.user);
      
      if (pred.claimed) {
        optionStats[pred.optionIndex].claimed++;
      } else {
        optionStats[pred.optionIndex].unclaimed++;
      }
    });
    
    console.log('📊 Summary:');
    console.log(`   Total Unique Participants: ${uniqueUsers.size}`);
    console.log(`   Total Predictions: ${marketPredictions.length}`);
    console.log(`   Total Volume: ${totalVolume.toFixed(2)} APES`);
    console.log(`   Claimed Predictions: ${claimedCount}`);
    console.log(`   Unclaimed Predictions: ${unclaimedCount}\n`);
    
    console.log('📊 Breakdown by Option:');
    console.log('━'.repeat(60));
    
    Object.entries(optionStats).forEach(([optionIndex, stats]) => {
      console.log(`Option ${optionIndex}:`);
      console.log(`  - Unique Users: ${stats.users.size}`);
      console.log(`  - Total Bets: ${stats.count}`);
      console.log(`  - Volume: ${stats.volume.toFixed(2)} APES`);
      console.log(`  - Claimed: ${stats.claimed}`);
      console.log(`  - Unclaimed: ${stats.unclaimed}`);
      console.log('');
    });
    
    // List unclaimed predictions
    const unclaimedPredictions = marketPredictions.filter(p => !p.claimed);
    
    if (unclaimedPredictions.length > 0) {
      console.log(`\n⚠️  ${unclaimedPredictions.length} Unclaimed Predictions:`);
      console.log('━'.repeat(100));
      
      unclaimedPredictions.forEach((pred, index) => {
        console.log(`${index + 1}. User: ${pred.user}`);
        console.log(`   Option: ${pred.optionIndex}`);
        console.log(`   Amount: ${pred.amount.toFixed(2)} APES`);
        console.log(`   Placed: ${pred.timestamp.toLocaleString()}`);
        console.log(`   PDA: ${pred.pubkey}`);
        console.log('');
      });
      
      console.log('💡 Note: Some unclaimed predictions may be from losing options.');
      console.log('   To determine pending claims, the market resolution status and winning option are needed.');
    } else {
      console.log('\n✅ All predictions have been claimed!');
    }
    
  } catch (error) {
    console.error('Error checking market participants:', error);
  }
}

// Run the check
checkMarketParticipants(); 