const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const IDL = require('../src/smart_contracts/market_system/target/idl/market_system.json');

// APES Program
const PROGRAM_ID = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
const MARKET_ADDRESS = '4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr';

async function checkMarketParticipants() {
  try {
    console.log(`\n🔍 Checking participants for market: ${MARKET_ADDRESS}\n`);
    
    // Connect to mainnet
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const provider = new AnchorProvider(
      connection,
      { publicKey: PublicKey.default, signTransaction: async () => null, signAllTransactions: async () => null },
      { commitment: 'confirmed' }
    );
    
    const program = new Program(IDL, PROGRAM_ID, provider);
    
    // Fetch the market account
    const marketPubkey = new PublicKey(MARKET_ADDRESS);
    let marketAccount;
    
    try {
      marketAccount = await program.account.market.fetch(marketPubkey);
      console.log('📊 Market Details:');
      console.log(`   Question: ${marketAccount.question}`);
      console.log(`   Status: ${marketAccount.status}`);
      console.log(`   Total Pool: ${(marketAccount.totalPool.toNumber() / 1e6).toFixed(2)} APES`);
      
      // Display options and pools
      console.log(`\n   Options:`);
      const options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
      const pools = [
        marketAccount.option1Pool,
        marketAccount.option2Pool,
        marketAccount.option3Pool,
        marketAccount.option4Pool
      ];
      
      for (let i = 0; i < marketAccount.optionCount; i++) {
        const pool = pools[i].toNumber() / 1e6;
        console.log(`     ${i}: ${options[i]} - ${pool.toFixed(2)} APES`);
      }
      
      if (marketAccount.status.resolved) {
        console.log(`\n   🏆 Winning Option: ${marketAccount.winningOption}`);
      }
      console.log('');
      
    } catch (error) {
      console.log('❌ Could not fetch market from blockchain:', error.message);
      return;
    }
    
    // Fetch all prediction accounts for this market
    console.log('🔍 Searching for prediction accounts...\n');
    
    const predictionAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 57, // Size of Prediction account
        },
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator + user pubkey
            bytes: marketPubkey.toBase58(),
          },
        },
      ],
    });
    
    console.log(`📊 Found ${predictionAccounts.length} prediction accounts\n`);
    
    // Parse and analyze predictions
    const participants = new Map();
    const pendingClaims = [];
    const claimedRewards = [];
    let totalPendingValue = 0;
    let totalClaimedValue = 0;
    
    for (const { pubkey, account } of predictionAccounts) {
      try {
        // Parse prediction data
        const data = account.data;
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
        const amount = Buffer.from(amountBytes).readBigUInt64LE() / BigInt(1e6); // Convert to APES
        offset += 8;
        
        // Read timestamp (8 bytes, little-endian)
        const timestampBytes = data.slice(offset, offset + 8);
        const timestamp = Number(Buffer.from(timestampBytes).readBigInt64LE());
        offset += 8;
        
        // Read claimed status (1 byte)
        const claimed = data[offset] === 1;
        
        const walletAddress = userPubkey.toString();
        const key = `${walletAddress}-${optionIndex}`;
        
        const prediction = {
          wallet_address: walletAddress,
          option_index: optionIndex,
          amount: Number(amount),
          timestamp: new Date(timestamp * 1000),
          claimed: claimed,
          pubkey: pubkey.toString()
        };
        
        participants.set(key, prediction);
        
        // Check if this is a pending claim
        if (marketAccount.status.resolved && marketAccount.winningOption === optionIndex && !claimed) {
          pendingClaims.push(prediction);
          totalPendingValue += prediction.amount;
        } else if (claimed) {
          claimedRewards.push(prediction);
          totalClaimedValue += prediction.amount;
        }
        
      } catch (parseError) {
        console.log(`⚠️  Error parsing prediction account ${pubkey.toString()}:`, parseError.message);
      }
    }
    
    // Calculate unique participants
    const uniqueWallets = new Set();
    participants.forEach(p => uniqueWallets.add(p.wallet_address));
    
    console.log('📊 Summary:');
    console.log(`   Total Unique Participants: ${uniqueWallets.size}`);
    console.log(`   Total Predictions: ${participants.size}`);
    console.log(`   Pending Claims: ${pendingClaims.length}`);
    console.log(`   Claimed Rewards: ${claimedRewards.length}`);
    console.log(`   Total Pending Value: ${totalPendingValue.toFixed(2)} APES`);
    console.log(`   Total Claimed Value: ${totalClaimedValue.toFixed(2)} APES\n`);
    
    if (pendingClaims.length > 0) {
      console.log('⚠️  Users with Pending Claims:');
      console.log('━'.repeat(100));
      pendingClaims.forEach((claim, index) => {
        console.log(`${index + 1}. Wallet: ${claim.wallet_address}`);
        console.log(`   Option: ${claim.option_index}`);
        console.log(`   Amount Bet: ${claim.amount.toFixed(2)} APES`);
        console.log(`   Predicted At: ${claim.timestamp.toLocaleString()}`);
        console.log(`   Prediction PDA: ${claim.pubkey}`);
        console.log('');
      });
    } else {
      console.log('✅ No pending claims found - all winners have claimed their rewards!\n');
    }
    
    // Show participant breakdown by option
    console.log('📊 Participants by Option:');
    console.log('━'.repeat(60));
    const optionStats = {};
    
    participants.forEach(p => {
      const optionKey = p.option_index;
      if (!optionStats[optionKey]) {
        optionStats[optionKey] = {
          count: 0,
          totalAmount: 0,
          wallets: new Set()
        };
      }
      optionStats[optionKey].count++;
      optionStats[optionKey].totalAmount += p.amount;
      optionStats[optionKey].wallets.add(p.wallet_address);
    });
    
    Object.entries(optionStats).forEach(([index, stats]) => {
      const isWinner = marketAccount.status.resolved && marketAccount.winningOption == index;
      console.log(`Option ${index} ${isWinner ? '🏆 (WINNER)' : ''}`);
      console.log(`  - Unique Participants: ${stats.wallets.size}`);
      console.log(`  - Total Predictions: ${stats.count}`);
      console.log(`  - Total Volume: ${stats.totalAmount.toFixed(2)} APES`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking market participants:', error);
  }
}

// Run the check
checkMarketParticipants(); 