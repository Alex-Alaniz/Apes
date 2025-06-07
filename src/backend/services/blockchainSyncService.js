// Blockchain sync service - monitors on-chain markets
// This is a placeholder implementation

const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const db = require('../config/database');

// Configuration based on network
const NETWORK = process.env.VITE_SOLANA_NETWORK || process.env.SOLANA_NETWORK || 'devnet';

const NETWORK_CONFIG = {
  devnet: {
    programId: "F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y",
    rpcUrl: "https://api.devnet.solana.com",
    tokenDecimals: 6
  },
  mainnet: {
    programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS",
    rpcUrl: process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d",
    tokenDecimals: 9
  }
};

const config = NETWORK_CONFIG[NETWORK];
const PROGRAM_ID = config.programId;
const RPC_ENDPOINT = config.rpcUrl;
const TOKEN_DECIMALS = config.tokenDecimals;

class BlockchainSyncService {
  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.isRunning = false;
    this.syncInterval = null;
    console.log(`🔧 Blockchain Sync Service initialized for ${NETWORK} network`);
    console.log(`📡 RPC: ${RPC_ENDPOINT}`);
    console.log(`🎯 Program ID: ${PROGRAM_ID}`);
  }

  async start() {
    if (this.isRunning) {
      console.log('Blockchain sync service: Already running');
      return;
    }

    console.log('Blockchain sync service: Starting...');
    this.isRunning = true;

    // Run initial sync
    await this.syncAllUserPositions();

    // Set up periodic sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncAllUserPositions().catch(error => {
        console.error('Blockchain sync service: Error during periodic sync:', error);
      });
    }, 5 * 60 * 1000);

    console.log('Blockchain sync service: Started with 5-minute sync interval');
  }

  async stop() {
    console.log('Blockchain sync service: Stopping...');
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('Blockchain sync service: Stopped');
  }

  async syncAllUserPositions() {
    try {
      console.log('🔄 Syncing all user positions from blockchain...');
      
      if (!PROGRAM_ID) {
        console.warn('⚠️ Program ID not configured, skipping blockchain sync');
        return;
      }

      const programId = new PublicKey(PROGRAM_ID);
      
      // Try to get all prediction accounts from the blockchain
      // We'll use multiple strategies to find prediction accounts
      let predictionAccounts = [];
      
      try {
        // Strategy 1: Try to get accounts by dataSize (prediction accounts)
        // Prediction accounts are typically smaller than market accounts
        console.log('🔍 Searching for prediction accounts...');
        const accountsBySize = await this.connection.getProgramAccounts(programId, {
          filters: [
            {
              dataSize: 113 // Adjust this based on your actual prediction account size
            }
          ]
        });
        
        console.log(`📊 Found ${accountsBySize.length} accounts with dataSize 113`);
        predictionAccounts = predictionAccounts.concat(accountsBySize);
        
        // Strategy 2: Try different datasizes that might be prediction accounts
        for (const size of [80, 96, 105, 120, 128]) {
          try {
            const accounts = await this.connection.getProgramAccounts(programId, {
              filters: [{ dataSize: size }]
            });
            console.log(`📊 Found ${accounts.length} accounts with dataSize ${size}`);
            predictionAccounts = predictionAccounts.concat(accounts);
          } catch (error) {
            console.log(`⚠️ No accounts found with dataSize ${size}`);
          }
        }
        
        // Remove duplicates
        const uniqueAccounts = predictionAccounts.filter((account, index, self) => 
          index === self.findIndex(a => a.pubkey.toString() === account.pubkey.toString())
        );
        
        predictionAccounts = uniqueAccounts;
        
      } catch (error) {
        console.error('❌ Error fetching prediction accounts:', error);
        console.log('🔄 Trying fallback approach...');
        
        // Fallback: Get all program accounts and filter manually
        try {
          const allAccounts = await this.connection.getProgramAccounts(programId);
          console.log(`📊 Found ${allAccounts.length} total program accounts`);
          
          // Filter out market accounts (they're usually larger)
          predictionAccounts = allAccounts.filter(({ account }) => 
            account.data.length < 400 // Markets are typically larger
          );
          console.log(`📊 Filtered to ${predictionAccounts.length} potential prediction accounts`);
        } catch (fallbackError) {
          console.error('❌ Fallback approach also failed:', fallbackError);
          return;
        }
      }

      console.log(`📊 Processing ${predictionAccounts.length} potential prediction accounts`);

      // Process each prediction account
      let syncedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const { pubkey, account } of predictionAccounts) {
        try {
          const processed = await this.processPredictionAccount(pubkey, account);
          if (processed) {
            syncedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing account ${pubkey.toString()}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Blockchain sync completed: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);
      
      // Update user stats after sync
      if (syncedCount > 0) {
        await this.updateUserStats();
      }
      
    } catch (error) {
      console.error('❌ Error in syncAllUserPositions:', error);
    }
  }

  async processPredictionAccount(pubkey, account) {
    try {
      // Parse prediction account data - we need to handle this carefully
      const data = account.data;
      
      // Check if this looks like a prediction account
      if (data.length < 50) {
        return false; // Too small to be a prediction account
      }
      
      let offset = 8; // Skip discriminator

      // Helper functions to read data
      const readPubkey = () => {
        if (offset + 32 > data.length) throw new Error('Not enough data for pubkey');
        const bytes = data.slice(offset, offset + 32);
        offset += 32;
        return new PublicKey(bytes);
      };

      const readU64 = () => {
        if (offset + 8 > data.length) throw new Error('Not enough data for u64');
        const bytes = data.slice(offset, offset + 8);
        offset += 8;
        return new BN(bytes, 'le');
      };

      const readU8 = () => {
        if (offset + 1 > data.length) throw new Error('Not enough data for u8');
        const byte = data[offset];
        offset += 1;
        return byte;
      };

      const readBool = () => {
        if (offset + 1 > data.length) throw new Error('Not enough data for bool');
        const byte = data[offset];
        offset += 1;
        return byte !== 0;
      };

      // Try to parse prediction data (this might fail for non-prediction accounts)
      let userPubkey, marketPubkey, amount, optionIndex, timestamp, claimed;
      
      try {
        // Attempt to read the prediction struct
        // Note: The exact structure depends on your Rust program definition
        // You might need to adjust this based on your actual struct layout
        
        // Skip first 8 bytes (discriminator)
        offset = 8;
        
        // Try different parsing strategies
        userPubkey = readPubkey();     // user: Pubkey
        marketPubkey = readPubkey();   // market: Pubkey  
        amount = readU64();            // amount: u64
        optionIndex = readU8();        // option_index: u8
        timestamp = readU64();         // timestamp: i64 (as u64)
        claimed = readBool();          // claimed: bool
        
        // Validate that this looks like real data
        if (amount.toNumber() <= 0 || optionIndex > 10) {
          return false; // Probably not a valid prediction
        }
        
      } catch (parseError) {
        // This account doesn't match our expected structure
        return false;
      }

      // Convert amount from units to UI
      const amountUi = amount.toNumber() / Math.pow(10, TOKEN_DECIMALS);
      
      // Basic validation
      if (amountUi <= 0 || amountUi > 1000000) { // Sanity check
        return false;
      }

      // Get market information
      const marketInfo = await this.getMarketInfo(marketPubkey);
      if (!marketInfo) {
        // Create a basic market info if we can't find it
        marketInfo = {
          question: 'Unknown Market',
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          winningOption: null,
          status: 'Active',
          optionPools: [0, 0, 0, 0]
        };
      }

      // Check if this prediction already exists in database
      const existingPrediction = await db.query(
        'SELECT id FROM prediction_history WHERE wallet_address = $1 AND market_pubkey = $2 AND option_index = $3',
        [userPubkey.toString(), marketPubkey.toString(), optionIndex]
      );

      if (existingPrediction.rows.length > 0) {
        // Update existing record
        await db.query(
          `UPDATE prediction_history 
           SET amount = $1, claimed = $2, is_winner = $3, payout_amount = $4
           WHERE wallet_address = $5 AND market_pubkey = $6 AND option_index = $7`,
          [
            amountUi,
            claimed,
            marketInfo.winningOption === optionIndex,
            claimed && marketInfo.winningOption === optionIndex ? this.calculatePayout(amountUi, optionIndex, marketInfo) : null,
            userPubkey.toString(),
            marketPubkey.toString(),
            optionIndex
          ]
        );
      } else {
        // Insert new record
        await db.query(
          `INSERT INTO prediction_history 
           (wallet_address, market_pubkey, market_question, option_index, option_text, 
            amount, predicted_at, is_winner, payout_amount, claimed, transaction_signature)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userPubkey.toString(),
            marketPubkey.toString(),
            marketInfo.question,
            optionIndex,
            marketInfo.options[optionIndex] || `Option ${optionIndex + 1}`,
            amountUi,
            new Date(timestamp.toNumber() * 1000),
            marketInfo.winningOption === optionIndex,
            claimed && marketInfo.winningOption === optionIndex ? this.calculatePayout(amountUi, optionIndex, marketInfo) : null,
            claimed,
            null // We don't have transaction signature from account data
          ]
        );
  }

      // Ensure user exists in users table
      await this.ensureUserExists(userPubkey.toString());
      
      return true; // Successfully processed

    } catch (error) {
      // Don't log every parsing error as it's expected for non-prediction accounts
      if (!error.message.includes('Not enough data')) {
        console.error('Error processing account:', error.message);
      }
      return false;
    }
  }

  async getMarketInfo(marketPubkey) {
    try {
      // First try to get from database cache
      const cachedMarket = await db.query(
        'SELECT * FROM markets_cache WHERE market_pubkey = $1',
        [marketPubkey.toString()]
      );

      if (cachedMarket.rows.length > 0) {
        const market = cachedMarket.rows[0];
        return {
          question: market.question,
          options: market.options,
          winningOption: market.winning_option,
          status: market.status,
          optionPools: market.option_pools
        };
      }

      // If not in cache, fetch from blockchain (simplified version)
      // You might want to implement full market deserialization here
      console.warn(`Market ${marketPubkey.toString()} not found in cache`);
      return null;
    } catch (error) {
      console.error('Error getting market info:', error);
      return null;
    }
  }

  calculatePayout(amount, optionIndex, marketInfo) {
    // Simplified payout calculation
    // You might want to implement the exact same logic as your frontend
    if (!marketInfo.optionPools || marketInfo.winningOption !== optionIndex) {
      return 0;
    }

    try {
      const totalPool = marketInfo.optionPools.reduce((sum, pool) => sum + pool, 0);
      const winningPool = marketInfo.optionPools[optionIndex];
      
      if (winningPool === 0) return 0;
      
      const userShare = amount / winningPool;
      const grossWinnings = userShare * totalPool;
      
      // Apply fees (3.5% total)
      const fees = grossWinnings * 0.035;
      const netWinnings = grossWinnings - fees;
      
      return Math.max(0, netWinnings);
    } catch (error) {
      console.error('Error calculating payout:', error);
      return 0;
    }
  }

  async ensureUserExists(walletAddress) {
    try {
      await db.query(
        `INSERT INTO users (wallet_address, created_at) 
         VALUES ($1, CURRENT_TIMESTAMP) 
         ON CONFLICT (wallet_address) DO NOTHING`,
        [walletAddress]
      );
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  async updateUserStats() {
    try {
      console.log('📊 Updating user stats from prediction history...');
      
      await db.query(`
        INSERT INTO user_stats (
          wallet_address, 
          total_predictions, 
          total_invested, 
          winning_predictions, 
          total_profit,
          win_rate,
          updated_at
        )
        SELECT 
          wallet_address,
          COUNT(*) as total_predictions,
          SUM(amount) as total_invested,
          COUNT(*) FILTER (WHERE is_winner = true AND claimed = true) as winning_predictions,
          COALESCE(SUM(CASE 
            WHEN is_winner = true AND claimed = true THEN (payout_amount - amount)
            WHEN is_winner = false THEN -amount
            ELSE 0 
          END), 0) as total_profit,
          CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(*) FILTER (WHERE is_winner = true)::DECIMAL / COUNT(*)) * 100
            ELSE 0 
          END as win_rate,
          CURRENT_TIMESTAMP
        FROM prediction_history
        GROUP BY wallet_address
        ON CONFLICT (wallet_address) DO UPDATE SET
          total_predictions = EXCLUDED.total_predictions,
          total_invested = EXCLUDED.total_invested,
          winning_predictions = EXCLUDED.winning_predictions,
          total_profit = EXCLUDED.total_profit,
          win_rate = EXCLUDED.win_rate,
          updated_at = EXCLUDED.updated_at
      `);
      
      console.log('✅ User stats updated successfully');
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
    }
  }

  // Manual sync method for API endpoint
  async syncUserPositions(walletAddress = null) {
    try {
      if (walletAddress) {
        console.log(`🔄 Syncing positions for specific user: ${walletAddress}`);
        // Implement user-specific sync if needed
        await this.syncAllUserPositions(); // For now, sync all
      } else {
        await this.syncAllUserPositions();
      }
      return true;
    } catch (error) {
      console.error('Error in manual sync:', error);
      return false;
    }
  }
}

module.exports = new BlockchainSyncService(); 