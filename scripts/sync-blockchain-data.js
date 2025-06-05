#!/usr/bin/env node

const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { Wallet } = require('@coral-xyz/anchor');
const { Keypair } = require('@solana/web3.js');
const fetch = require('node-fetch');

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || 'FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// Load IDL
const idl = require('../src/frontend/src/idl/market_system.json');

// Utility functions
function unitsToUi(units, decimals) {
  return Number(units) / Math.pow(10, decimals);
}

class BlockchainSyncService {
  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.program = null;
    this.decimals = 6; // APES token decimals
  }

  async initialize() {
    try {
      // Create a dummy wallet for read-only operations
      const dummyKeypair = Keypair.generate();
      const wallet = new Wallet(dummyKeypair);
      
      const provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });
      this.program = new Program(idl, PROGRAM_ID, provider);
      
      console.log('✅ Blockchain sync service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain sync service:', error);
      throw error;
    }
  }

  // Deserialize market data from raw account data
  deserializeMarket(publicKey, accountData) {
    const data = accountData.data;
    let offset = 8; // Skip discriminator

    // Helper functions
    const readBytes = (length) => {
      const bytes = data.slice(offset, offset + length);
      offset += length;
      return bytes;
    };

    const readFixedString = (length) => {
      const bytes = readBytes(length);
      return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
    };

    const readU64 = () => {
      const bytes = readBytes(8);
      return new BN(bytes, 'le');
    };

    const readU8 = () => {
      const bytes = readBytes(1);
      return bytes[0];
    };

    const readPubkey = () => {
      const bytes = readBytes(32);
      return new PublicKey(bytes);
    };

    // Read market data
    try {
      const authority = readPubkey();
      const creator = readPubkey();
      const marketType = readU8();
      const question = readFixedString(200);
      const questionLen = readBytes(2); // u16
      const option1 = readFixedString(50);
      const option2 = readFixedString(50);
      const option3 = readFixedString(50);
      const option4 = readFixedString(50);
      const optionCount = readU8();
      const resolutionDate = readU64();
      const creatorFeeRate = readU64();
      const minBetAmount = readU64();
      const tokenMint = readPubkey();
      const status = readU8();
      const winningOption = readU8(); // Handle Option<u8>
      const option1Pool = readU64();
      const option2Pool = readU64();
      const option3Pool = readU64();
      const option4Pool = readU64();
      const totalPool = readU64();

      return {
        publicKey: publicKey.toString(),
        authority: authority.toString(),
        creator: creator.toString(),
        question,
        optionCount,
        option1Pool: unitsToUi(option1Pool, this.decimals),
        option2Pool: unitsToUi(option2Pool, this.decimals),
        option3Pool: unitsToUi(option3Pool, this.decimals),
        option4Pool: unitsToUi(option4Pool, this.decimals),
        totalPool: unitsToUi(totalPool, this.decimals),
        status,
        winningOption: winningOption === 255 ? null : winningOption
      };
    } catch (error) {
      console.error('Error deserializing market:', error);
      return null;
    }
  }

  async fetchAllMarkets() {
    try {
      console.log('📡 Fetching all markets from blockchain...');
      
      const accounts = await this.connection.getProgramAccounts(new PublicKey(PROGRAM_ID), {
        filters: [
          {
            dataSize: 691 // Known size of Market accounts
          }
        ]
      });

      console.log(`Found ${accounts.length} markets on blockchain`);

      const markets = [];
      for (const { pubkey, account } of accounts) {
        const marketData = this.deserializeMarket(pubkey, account);
        if (marketData) {
          markets.push(marketData);
        }
      }

      return markets;
    } catch (error) {
      console.error('Error fetching markets from blockchain:', error);
      return [];
    }
  }

  async countParticipants(marketPubkey) {
    try {
      console.log(`🔢 Counting participants for market: ${marketPubkey}`);
      
      if (!this.program) {
        console.warn('Program not initialized');
        return 0;
      }

      // Fetch all predictions for this market
      const predictions = await this.program.account.prediction.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator 
            bytes: marketPubkey,
          },
        },
      ]);

      // Count unique users
      const uniqueUsers = new Set();
      predictions.forEach(({ account }) => {
        uniqueUsers.add(account.user.toString());
      });

      const participantCount = uniqueUsers.size;
      console.log(`  Found ${participantCount} unique participants`);
      
      return participantCount;
    } catch (error) {
      console.error(`Error counting participants for ${marketPubkey}:`, error);
      return 0;
    }
  }

  async syncMarketWithBackend(marketData) {
    try {
      // Calculate option pools array
      const optionPools = [];
      for (let i = 0; i < marketData.optionCount; i++) {
        const poolProperty = `option${i + 1}Pool`;
        optionPools.push(marketData[poolProperty] || 0);
      }

      // Count participants
      const participantCount = await this.countParticipants(marketData.publicKey);

      console.log(`🔄 Syncing market ${marketData.publicKey}:`, {
        question: marketData.question.substring(0, 40) + '...',
        totalVolume: marketData.totalPool,
        optionPools,
        participantCount
      });

      // Send to backend sync endpoint
      const response = await fetch(`${BACKEND_URL}/api/markets/sync-volumes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketAddress: marketData.publicKey,
          optionPools: optionPools,
          totalVolume: marketData.totalPool,
          participantCount: participantCount
        })
      });

      if (response.ok) {
        console.log(`✅ Successfully synced market ${marketData.publicKey}`);
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ Failed to sync market ${marketData.publicKey}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Error syncing market ${marketData.publicKey}:`, error);
      return false;
    }
  }

  async syncAllMarkets() {
    try {
      console.log('🚀 Starting blockchain data sync...');
      
      const markets = await this.fetchAllMarkets();
      console.log(`Found ${markets.length} markets to sync`);

      let syncedCount = 0;
      for (const market of markets) {
        const success = await this.syncMarketWithBackend(market);
        if (success) {
          syncedCount++;
        }
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Sync completed: ${syncedCount}/${markets.length} markets synced successfully`);
      
      return { total: markets.length, synced: syncedCount };
    } catch (error) {
      console.error('❌ Error during sync:', error);
      throw error;
    }
  }

  async runMigration() {
    try {
      console.log('🔧 Running database migration...');
      
      const response = await fetch(`${BACKEND_URL}/api/admin/run-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z' // Admin wallet
        },
        body: JSON.stringify({
          migration: 'add_participant_count'
        })
      });

      if (response.ok) {
        console.log('✅ Migration completed successfully');
      } else {
        console.warn('⚠️  Migration endpoint not available, continuing with sync...');
      }
    } catch (error) {
      console.warn('⚠️  Could not run migration, continuing with sync:', error.message);
    }
  }
}

// Main execution
async function main() {
  const syncService = new BlockchainSyncService();
  
  try {
    await syncService.initialize();
    
    // Run migration first
    await syncService.runMigration();
    
    // Then sync all market data
    const result = await syncService.syncAllMarkets();
    
    console.log('\n🎉 Blockchain data sync completed!');
    console.log(`   Total markets processed: ${result.total}`);
    console.log(`   Successfully synced: ${result.synced}`);
    console.log('\n💡 Your market data should now be consistent!');
    console.log('   - Market volumes reflect current blockchain state');
    console.log('   - Participant counts are accurate');
    console.log('   - User positions should align with market volumes');
    
  } catch (error) {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = BlockchainSyncService; 