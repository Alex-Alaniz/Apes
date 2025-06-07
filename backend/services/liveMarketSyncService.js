/**
 * Live Market Sync Service
 * 
 * Provides real-time market volume data directly from the blockchain
 * for maximum user transparency and trust. No periodic syncing needed.
 */

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

const config = NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG['mainnet']; // Default to mainnet
const PROGRAM_ID = config.programId;
const RPC_ENDPOINT = config.rpcUrl;
const TOKEN_DECIMALS = config.tokenDecimals;

console.log(`🔧 Network Detection: NETWORK="${NETWORK}", Config Found: ${!!NETWORK_CONFIG[NETWORK]}`);

class LiveMarketSyncService {
  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.cache = new Map(); // In-memory cache for recent data
    this.cacheExpiry = 30000; // 30 seconds cache
    console.log(`🔴 Live Market Sync Service initialized for ${NETWORK} network`);
    console.log(`📡 RPC: ${RPC_ENDPOINT}`);
    console.log(`🎯 Program ID: ${PROGRAM_ID}`);
  }

  /**
   * Get live market data directly from blockchain
   * @param {string} marketAddress - Market public key
   * @returns {Promise<Object>} Live market data with volumes and participant count
   */
  async getLiveMarketData(marketAddress) {
    try {
      const cacheKey = `market_${marketAddress}`;
      
      // Check cache first (30-second cache to reduce RPC calls)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          console.log(`📋 Using cached data for ${marketAddress}`);
          return cached.data;
        }
      }

      console.log(`🔴 Fetching LIVE data for market: ${marketAddress}`);
      
      if (!PROGRAM_ID) {
        throw new Error('Program ID not configured');
      }

      const marketPubkey = new PublicKey(marketAddress);
      
      // Fetch market account data directly from blockchain
      const accountInfo = await this.connection.getAccountInfo(marketPubkey);
      
      if (!accountInfo) {
        throw new Error(`Market account not found: ${marketAddress}`);
      }

      // Deserialize market data
      const marketData = this.deserializeMarketAccount(accountInfo.data);
      
      // Get live participant count by fetching all predictions for this market
      const participantCount = await this.getLiveParticipantCount(marketAddress);
      
      // Calculate option volumes from blockchain data
      const optionPools = [];
      const poolProperties = ['option1Pool', 'option2Pool', 'option3Pool', 'option4Pool'];
      
      for (let i = 0; i < marketData.optionCount; i++) {
        const poolValue = marketData[poolProperties[i]] || new BN(0);
        const poolVolume = this.convertToUI(poolValue);
        optionPools.push(poolVolume);
      }
      
      const totalVolume = optionPools.reduce((sum, vol) => sum + vol, 0);
      
      // Calculate percentages
      const optionPercentages = optionPools.map(pool => 
        totalVolume > 0 ? (pool / totalVolume) * 100 : 0
      );

      const liveData = {
        marketAddress,
        optionPools,
        totalVolume,
        participantCount,
        optionPercentages,
        question: marketData.question,
        options: marketData.options,
        status: marketData.status,
        winningOption: marketData.winningOption,
        lastUpdated: new Date().toISOString(),
        dataSource: 'live_blockchain'
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: liveData,
        timestamp: Date.now()
      });

      console.log(`✅ Live data fetched for ${marketAddress}:`, {
        totalVolume: totalVolume.toFixed(2),
        participants: participantCount,
        status: marketData.status,
        optionPools: optionPools.map(p => p.toFixed(2))
      });

      return liveData;
      
    } catch (error) {
      console.error(`❌ Error fetching live market data for ${marketAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get live participant count by counting unique prediction accounts
   * @param {string} marketAddress - Market address
   * @returns {Promise<number>} Number of unique participants
   */
  async getLiveParticipantCount(marketAddress) {
    try {
      if (!PROGRAM_ID) {
        return 0;
      }

      const programId = new PublicKey(PROGRAM_ID);
      const marketPubkey = new PublicKey(marketAddress);

      // Get all prediction accounts for this market
      const predictionAccounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // Skip discriminator + user pubkey to get to market pubkey
              bytes: marketPubkey.toBase58(),
            },
          },
        ],
      });

      // Count unique users
      const uniqueUsers = new Set();
      predictionAccounts.forEach(({ account }) => {
        try {
          // Extract user pubkey from account data (first 32 bytes after discriminator)
          const userPubkeyBytes = account.data.slice(8, 40);
          const userPubkey = new PublicKey(userPubkeyBytes).toString();
          uniqueUsers.add(userPubkey);
        } catch (error) {
          // Skip invalid accounts
        }
      });

      return uniqueUsers.size;
    } catch (error) {
      console.error(`Error getting live participant count for ${marketAddress}:`, error);
      return 0;
    }
  }

  /**
   * Deserialize market account data
   * @param {Buffer} data - Account data buffer
   * @returns {Object} Deserialized market data
   */
  deserializeMarketAccount(data) {
    let offset = 8; // Skip discriminator

    // Helper functions
    const readPubkey = () => {
      const bytes = data.slice(offset, offset + 32);
      offset += 32;
      return new PublicKey(bytes);
    };

    const readU64 = () => {
      const bytes = data.slice(offset, offset + 8);
      offset += 8;
      return new BN(bytes, 'le');
    };

    const readU8 = () => {
      const byte = data[offset];
      offset += 1;
      return byte;
    };

    const readU16 = () => {
      const bytes = data.slice(offset, offset + 2);
      offset += 2;
      return bytes[0] | (bytes[1] << 8);
    };

    const readFixedString = (length) => {
      const bytes = data.slice(offset, offset + length);
      offset += length;
      return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
    };

    try {
      // Read market struct based on actual on-chain layout
      const market = {
        authority: readPubkey(),
        creator: readPubkey(),
        marketType: readU8(),
        question: readFixedString(200),
        questionLen: readU16(),
        option1: readFixedString(50),
        option2: readFixedString(50),
        option3: readFixedString(50),
        option4: readFixedString(50),
        optionCount: readU8(),
        resolutionDate: readU64(),
        creatorFeeRate: readU64(),
        minBetAmount: readU64(),
        tokenMint: readPubkey(),
        status: readU8(),
        winningOption: (() => {
          const discriminator = readU8();
          return discriminator === 0 ? null : readU8();
        })(),
        option1Pool: readU64(),
        option2Pool: readU64(),
        option3Pool: readU64(),
        option4Pool: readU64(),
        totalPool: readU64(),
        marketId: readFixedString(32),
        category: readFixedString(20),
      };

      // Build options array
      const options = [];
      if (market.option1) options.push(market.option1);
      if (market.option2 && market.optionCount >= 2) options.push(market.option2);
      if (market.option3 && market.optionCount >= 3) options.push(market.option3);
      if (market.option4 && market.optionCount >= 4) options.push(market.option4);

      return {
        ...market,
        options,
        status: market.status === 0 ? 'Active' : market.status === 1 ? 'Resolved' : 'Cancelled'
      };
    } catch (error) {
      console.error('❌ Error deserializing market data:', error);
      throw error;
    }
  }

  /**
   * Convert BN units to UI amount
   * @param {BN} amount - Amount in units
   * @returns {number} Amount in UI format
   */
  convertToUI(amount) {
    return amount.toNumber() / Math.pow(10, TOKEN_DECIMALS);
  }

  /**
   * Check if a market is resolved on blockchain and sync status to database
   * @param {string} marketAddress - Market address to check
   * @returns {Promise<Object>} Resolution status and details
   */
  async syncMarketResolutionStatus(marketAddress) {
    try {
      console.log(`🔍 Checking resolution status for market: ${marketAddress}`);
      
      if (!PROGRAM_ID) {
        throw new Error('Program ID not configured');
      }

      const marketPubkey = new PublicKey(marketAddress);
      
      // Fetch market account data directly from blockchain
      const accountInfo = await this.connection.getAccountInfo(marketPubkey);
      
      if (!accountInfo) {
        throw new Error(`Market account not found: ${marketAddress}`);
      }

      // Deserialize market data to check status
      const marketData = this.deserializeMarketAccount(accountInfo.data);
      
      console.log(`📊 Blockchain status for ${marketAddress}:`, {
        status: marketData.status,
        winningOption: marketData.winningOption,
        question: marketData.question?.substring(0, 50)
      });

      // Check if market is resolved on blockchain
      const isResolvedOnChain = marketData.status === 'Resolved';
      const winningOption = marketData.winningOption;

      if (isResolvedOnChain) {
        console.log(`✅ Market ${marketAddress} is RESOLVED on blockchain with winning option: ${winningOption}`);
        
        // Update database with resolved status
        const updateQuery = `
          UPDATE markets 
          SET 
            status = 'Resolved',
            resolved_option = $1,
            updated_at = NOW()
          WHERE market_address = $2
          RETURNING market_address, status, resolved_option, question
        `;
        
        const result = await db.query(updateQuery, [winningOption, marketAddress]);
        
        if (result.rows.length > 0) {
          const updatedMarket = result.rows[0];
          console.log(`🎯 Successfully updated database for resolved market:`, {
            market_address: updatedMarket.market_address,
            status: updatedMarket.status,
            resolved_option: updatedMarket.resolved_option,
            question: updatedMarket.question?.substring(0, 50)
          });
          
          // Clear cache for this market to force fresh data
          this.clearCache(marketAddress);
          
          return {
            success: true,
            wasResolved: true,
            marketAddress,
            winningOption,
            previousStatus: 'Active',
            newStatus: 'Resolved',
            updatedInDatabase: true
          };
        } else {
          console.warn(`⚠️ Market ${marketAddress} not found in database`);
          return {
            success: false,
            error: 'Market not found in database',
            wasResolved: true,
            winningOption
          };
        }
      } else {
        console.log(`📊 Market ${marketAddress} is still ACTIVE on blockchain`);
        return {
          success: true,
          wasResolved: false,
          marketAddress,
          currentStatus: marketData.status,
          winningOption: null
        };
      }
      
    } catch (error) {
      console.error(`❌ Error checking resolution status for ${marketAddress}:`, error);
      return {
        success: false,
        error: error.message,
        marketAddress
      };
    }
  }

  /**
   * Clear cache for specific market or all markets
   * @param {string} marketAddress - Optional market address, clears all if not provided
   */
  clearCache(marketAddress = null) {
    if (marketAddress) {
      this.cache.delete(`market_${marketAddress}`);
      console.log(`🗑️ Cleared cache for market ${marketAddress}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ Cleared all market cache`);
    }
  }
}

module.exports = new LiveMarketSyncService(); 