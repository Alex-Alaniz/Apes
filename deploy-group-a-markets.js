const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const { createMarket } = require('./backend/scripts/create-market');
const { Client } = require('pg');
require('dotenv').config();

// Group A Teams
const GROUP_A_TEAMS = ['Inter Miami', 'Porto', 'Palmeiras', 'Al Ahly'];

// Group A Matches (Round Robin - each team plays every other team once)
const GROUP_A_MATCHES = [
  { home: 'Inter Miami', away: 'Porto', date: '2025-06-15', time: '14:00' },
  { home: 'Palmeiras', away: 'Al Ahly', date: '2025-06-15', time: '18:00' },
  { home: 'Inter Miami', away: 'Palmeiras', date: '2025-06-19', time: '14:00' },
  { home: 'Porto', away: 'Al Ahly', date: '2025-06-19', time: '18:00' },
  { home: 'Inter Miami', away: 'Al Ahly', date: '2025-06-23', time: '14:00' },
  { home: 'Porto', away: 'Palmeiras', date: '2025-06-23', time: '18:00' }
];

async function deployGroupAMarkets() {
  console.log('🚀 Starting Group A market deployment...\n');
  
  // Setup database connection
  const dbClient = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');
    
    // Setup Solana connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.WALLET_PRIVATE_KEY))
    );
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed'
    });
    
    console.log('💳 Deployer wallet:', wallet.publicKey.toString());
    console.log('🌐 Network:', process.env.SOLANA_RPC_URL || 'mainnet-beta');
    console.log('\n📋 Group A Matches to deploy:\n');
    
    GROUP_A_MATCHES.forEach((match, i) => {
      console.log(`${i + 1}. ${match.home} vs ${match.away} - ${match.date} at ${match.time}`);
    });
    
    console.log('\nPress Enter to continue or Ctrl+C to cancel...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    
    const deployedMarkets = [];
    
    for (const [index, match] of GROUP_A_MATCHES.entries()) {
      console.log(`\n🎯 Deploying market ${index + 1}/${GROUP_A_MATCHES.length}`);
      console.log(`   ${match.home} vs ${match.away}`);
      
      try {
        // Create market on blockchain
        const marketData = {
          title: `${match.home} vs ${match.away}`,
          description: `FIFA Club World Cup 2025 - Group A: Predict the winner of ${match.home} vs ${match.away}`,
          category: 'Sports',
          subcategory: 'Football',
          eventDate: new Date(`${match.date}T${match.time}:00Z`).toISOString(),
          options: [match.home, match.away, 'Draw'],
          creator: wallet.publicKey.toString(),
          tournament_id: 1 // FIFA Club World Cup 2025
        };
        
        console.log('   Creating market on blockchain...');
        const result = await createMarket(provider, marketData);
        
        if (result.success) {
          console.log(`   ✅ Market created at: ${result.marketPubkey}`);
          
          // Save to database
          await dbClient.query(`
            INSERT INTO market_creators (
              wallet_address, 
              market_address, 
              tournament_id,
              status,
              metadata
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            wallet.publicKey.toString(),
            result.marketPubkey,
            1, // tournament_id
            'active',
            JSON.stringify(marketData)
          ]);
          
          deployedMarkets.push({
            ...marketData,
            marketAddress: result.marketPubkey,
            transactionSignature: result.signature
          });
          
          console.log('   ✅ Saved to database');
        } else {
          console.error(`   ❌ Failed to create market: ${result.error}`);
        }
        
        // Add delay between deployments
        if (index < GROUP_A_MATCHES.length - 1) {
          console.log('   ⏳ Waiting 5 seconds before next deployment...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`   ❌ Error deploying market: ${error.message}`);
      }
    }
    
    console.log('\n📊 Deployment Summary:');
    console.log(`   Total markets deployed: ${deployedMarkets.length}/${GROUP_A_MATCHES.length}`);
    
    if (deployedMarkets.length > 0) {
      console.log('\n✅ Successfully deployed markets:');
      deployedMarkets.forEach((market, i) => {
        console.log(`   ${i + 1}. ${market.title}`);
        console.log(`      Address: ${market.marketAddress}`);
        console.log(`      Tx: ${market.transactionSignature}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await dbClient.end();
    console.log('\n🏁 Deployment process completed');
  }
}

// Run if called directly
if (require.main === module) {
  deployGroupAMarkets().catch(console.error);
}

module.exports = { deployGroupAMarkets }; 