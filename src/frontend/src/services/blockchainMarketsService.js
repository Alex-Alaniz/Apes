import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PROGRAM_ID, getRpcUrl } from '../config/solana';

// Simplified IDL for reading market accounts
const MARKET_IDL = {
  version: "0.1.0",
  name: "market_system",
  instructions: [],
  accounts: [
    {
      name: "market",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "question", type: "string" },
          { name: "options", type: { vec: "string" } },
          { name: "status", type: "u8" },
          { name: "resolutionDate", type: "i64" },
          { name: "resolvedOption", type: { option: "u8" } },
          { name: "creatorFeeRate", type: "u16" },
          { name: "minBetAmount", type: "u64" },
          { name: "totalVolume", type: "u64" },
          { name: "optionPools", type: { vec: "u64" } }
        ]
      }
    }
  ]
};

class BlockchainMarketsService {
  constructor() {
    this.connection = new Connection(getRpcUrl());
    this.program = null;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache
  }

  async initialize() {
    try {
      // Create a read-only provider (no wallet needed for reading)
      const provider = new AnchorProvider(
        this.connection,
        { publicKey: PublicKey.default }, // Dummy wallet for reading
        { commitment: 'confirmed' }
      );
      
      this.program = new Program(MARKET_IDL, new PublicKey(PROGRAM_ID), provider);
      console.log('✅ Blockchain markets service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain markets service:', error);
      // Fall back to RPC-only mode
      return false;
    }
  }

  async fetchMarketsFromBlockchain() {
    const cacheKey = 'blockchain_markets';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('📋 Using cached blockchain markets');
      return cached.data;
    }

    try {
      console.log('🔍 Fetching markets directly from blockchain...');
      
      let markets = [];
      
      if (this.program) {
        // Method 1: Use Anchor program (preferred)
        try {
          const marketAccounts = await this.program.account.market.all();
          console.log(`📊 Found ${marketAccounts.length} markets via Anchor`);
          
          markets = marketAccounts.map(({ publicKey, account }) => this.transformMarketAccount(publicKey, account));
        } catch (anchorError) {
          console.warn('Anchor fetch failed, falling back to RPC:', anchorError);
          markets = await this.fetchViaRPC();
        }
      } else {
        // Method 2: Fallback to direct RPC calls
        markets = await this.fetchViaRPC();
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: markets,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully fetched ${markets.length} markets from blockchain`);
      return markets;
      
    } catch (error) {
      console.error('❌ Error fetching markets from blockchain:', error);
      return [];
    }
  }

  async fetchViaRPC() {
    try {
      console.log('🔍 Fetching markets via direct RPC...');
      
      // Get all program accounts
      const accounts = await this.connection.getProgramAccounts(new PublicKey(PROGRAM_ID), {
        filters: [
          {
            dataSize: 1000, // Approximate size filter for market accounts
          }
        ]
      });

      console.log(`📊 Found ${accounts.length} program accounts via RPC`);

      // For RPC mode, we create basic market objects
      // In production, you'd decode the account data properly
      return accounts.map(({ pubkey, account }) => ({
        market_address: pubkey.toString(),
        creator: 'Unknown', // Would decode from account data
        question: `Blockchain Market ${pubkey.toString().substring(0, 8)}...`,
        options: ['Option A', 'Option B'],
        status: 'Active',
        total_volume: 0,
        option_volumes: [0, 0],
        resolution_date: null,
        resolved_option: null,
        min_bet: 10,
        source: 'blockchain_rpc',
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ RPC fetch failed:', error);
      return [];
    }
  }

  transformMarketAccount(publicKey, account) {
    // Transform blockchain account data to frontend format
    const optionPercentages = [];
    const totalVolume = account.totalVolume?.toNumber() || 0;
    const optionPools = account.optionPools?.map(pool => pool.toNumber()) || [];
    
    if (totalVolume > 0 && optionPools.length > 0) {
      optionPools.forEach(volume => {
        optionPercentages.push((volume / totalVolume) * 100);
      });
    } else {
      account.options?.forEach(() => optionPercentages.push(50));
    }

    return {
      market_address: publicKey.toString(),
      creator: account.creator?.toString() || 'Unknown',
      question: account.question || `Market ${publicKey.toString().substring(0, 8)}...`,
      options: account.options || ['Option A', 'Option B'],
      status: this.getStatusString(account.status),
      total_volume: totalVolume,
      option_volumes: optionPools,
      option_percentages: optionPercentages,
      resolution_date: account.resolutionDate ? new Date(account.resolutionDate.toNumber() * 1000).toISOString() : null,
      resolved_option: account.resolvedOption,
      min_bet: account.minBetAmount?.toNumber() || 10,
      creator_fee_rate: account.creatorFeeRate || 200,
      source: 'blockchain_anchor',
      
      // Transform to frontend expected format
      publicKey: publicKey.toString(),
      totalVolume: totalVolume,
      optionPools: optionPools,
      optionPercentages: optionPercentages,
      optionProbabilities: optionPercentages,
      endTime: account.resolutionDate ? new Date(account.resolutionDate.toNumber() * 1000).toISOString() : null,
      winningOption: account.resolvedOption,
      minBetAmount: account.minBetAmount?.toNumber() || 10,
      creatorFeeRate: (account.creatorFeeRate || 200) / 100, // Convert basis points to percentage
      participantCount: 0, // Would need to calculate from prediction accounts
      optionCount: account.options?.length || 2,
      category: 'General', // Default category
      description: account.question || '',
      assets: {}, // No assets from blockchain
      created_at: new Date().toISOString()
    };
  }

  getStatusString(status) {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Resolved';
      case 2: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  async fetchMarketsWithFallback() {
    try {
      // Primary: Try blockchain-first approach
      const blockchainMarkets = await this.fetchMarketsFromBlockchain();
      
      if (blockchainMarkets.length > 0) {
        console.log(`✅ Using ${blockchainMarkets.length} markets from blockchain`);
        
        // Enhance with database metadata if available (use working endpoint)
        try {
          const apiUrl = window.location.origin;
          const response = await fetch(`${apiUrl}/api/markets/debug/all`);
          if (response.ok) {
            const debugData = await response.json();
            const dbMarkets = debugData.markets || [];
            
            // Merge blockchain data with database metadata
            const mergedMarkets = blockchainMarkets.map(blockchainMarket => {
              const dbMarket = dbMarkets.find(db => db.market_address === blockchainMarket.market_address);
              if (dbMarket) {
                return {
                  ...blockchainMarket,
                  // Keep blockchain data but enhance with database metadata
                  category: dbMarket.category || blockchainMarket.category,
                  description: dbMarket.description || blockchainMarket.description,
                  assets: dbMarket.assets || blockchainMarket.assets,
                  options_metadata: dbMarket.options_metadata || []
                };
              }
              return blockchainMarket;
            });
            
            console.log(`✨ Enhanced ${mergedMarkets.length} markets with database metadata`);
            return mergedMarkets;
          } else {
            console.log('📊 Using blockchain data without database enhancement');
            return blockchainMarkets;
          }
        } catch (dbError) {
          console.log('📊 Using blockchain data only (database metadata unavailable)');
          return blockchainMarkets;
        }
      } else {
        console.log('🔄 No blockchain markets found, fetching from database...');
        
        // Fallback: Use database with working endpoint
        try {
          const apiUrl = window.location.origin;
          const response = await fetch(`${apiUrl}/api/markets/debug/all`);
          if (response.ok) {
            const debugData = await response.json();
            const dbMarkets = debugData.markets || [];
            
            // Transform debug format to standard format
            const standardMarkets = dbMarkets.map(market => ({
              ...market,
              publicKey: market.market_address,
              totalVolume: parseFloat(market.total_volume || 0),
              optionPools: market.option_volumes || [],
              optionPercentages: this.calculatePercentages(market.option_volumes, market.total_volume),
              optionProbabilities: this.calculatePercentages(market.option_volumes, market.total_volume),
              endTime: market.resolution_date,
              winningOption: market.resolved_option,
              minBetAmount: parseFloat(market.min_bet || 10),
              creatorFeeRate: 2.5,
              participantCount: parseInt(market.participant_count || 0),
              optionCount: market.options?.length || 2,
              description: market.description || market.question,
              resolutionDate: market.resolution_date,
              creator: market.creator || 'Unknown'
            }));
            
            console.log(`📋 Using ${standardMarkets.length} markets from database`);
            return standardMarkets;
          }
        } catch (dbError) {
          console.error('❌ Database fetch also failed:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error in fetchMarketsWithFallback:', error);
      
      // Final fallback: try the standard endpoint one more time
      try {
        const apiUrl = window.location.origin;
        const response = await fetch(`${apiUrl}/api/markets/debug/all`);
        if (response.ok) {
          const debugData = await response.json();
          const dbMarkets = debugData.markets || [];
          console.log(`🔄 Emergency fallback: loaded ${dbMarkets.length} markets`);
          return dbMarkets;
        }
      } catch (emergencyError) {
        console.error('❌ Emergency fallback failed:', emergencyError);
      }
      
      return [];
    }
  }

  calculatePercentages(optionVolumes, totalVolume) {
    if (!optionVolumes || !totalVolume || totalVolume === 0) {
      return [50, 50]; // Default even split
    }
    
    return optionVolumes.map(volume => (volume / totalVolume) * 100);
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Blockchain markets cache cleared');
  }
}

// Create singleton instance
const blockchainMarketsService = new BlockchainMarketsService();

export default blockchainMarketsService; 