const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const db = require('../config/database');

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('7aGnUvCmpKuYc5wSVdZxG7UNULQWv8qoBa8UhVRxLJLE');

// Simplified IDL for market account structure
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

class BlockchainMarketRecovery {
  constructor() {
    this.connection = new Connection(RPC_URL);
    this.program = null;
  }

  async initialize() {
    try {
      // Create a dummy provider (we only need to read, not sign)
      const provider = new AnchorProvider(
        this.connection,
        { publicKey: PublicKey.default }, // Dummy wallet for reading
        { commitment: 'confirmed' }
      );
      
      this.program = new Program(MARKET_IDL, PROGRAM_ID, provider);
      console.log('✅ Blockchain connection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain connection:', error);
      throw error;
    }
  }

  async fetchAllBlockchainMarkets() {
    console.log('🔍 Fetching all markets from blockchain...');
    
    try {
      // Fetch all market accounts from the program
      const markets = await this.program.account.market.all();
      console.log(`📊 Found ${markets.length} markets on blockchain`);
      
      return markets.map(({ publicKey, account }) => ({
        market_address: publicKey.toString(),
        creator: account.creator.toString(),
        question: account.question,
        options: account.options,
        status: this.getStatusString(account.status),
        resolution_date: account.resolutionDate ? new Date(account.resolutionDate.toNumber() * 1000) : null,
        resolved_option: account.resolvedOption,
        creator_fee_rate: account.creatorFeeRate,
        min_bet: account.minBetAmount.toString(),
        total_volume: account.totalVolume.toString(),
        option_volumes: account.optionPools.map(pool => pool.toString()),
        created_at: new Date() // We don't have creation time from blockchain
      }));
    } catch (error) {
      console.error('❌ Error fetching blockchain markets:', error);
      return [];
    }
  }

  async fetchDatabaseMarkets() {
    console.log('🔍 Fetching all markets from database...');
    
    try {
      const result = await db.query('SELECT market_address FROM markets');
      const dbMarkets = result.rows.map(row => row.market_address);
      console.log(`📊 Found ${dbMarkets.length} markets in database`);
      return dbMarkets;
    } catch (error) {
      console.error('❌ Error fetching database markets:', error);
      return [];
    }
  }

  async findMissingMarkets() {
    const blockchainMarkets = await this.fetchAllBlockchainMarkets();
    const databaseMarkets = await this.fetchDatabaseMarkets();
    
    const missing = blockchainMarkets.filter(
      blockchain => !databaseMarkets.includes(blockchain.market_address)
    );
    
    console.log(`🔍 Found ${missing.length} markets missing from database:`);
    missing.forEach((market, index) => {
      console.log(`${index + 1}. ${market.market_address} - ${market.question?.substring(0, 50)}`);
    });
    
    return missing;
  }

  async importMarketToDatabase(market) {
    console.log(`💾 Importing market ${market.market_address} to database...`);
    
    try {
      const insertQuery = `
        INSERT INTO markets (
          market_address,
          creator,
          question,
          description,
          category,
          resolution_date,
          status,
          min_bet,
          resolved_option,
          options,
          option_volumes,
          total_volume,
          market_type,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (market_address) DO UPDATE SET
          total_volume = EXCLUDED.total_volume,
          option_volumes = EXCLUDED.option_volumes,
          status = EXCLUDED.status,
          resolved_option = EXCLUDED.resolved_option
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        market.market_address,
        market.creator,
        market.question,
        market.question, // Use question as description
        'General', // Default category
        market.resolution_date,
        market.status,
        parseInt(market.min_bet) || 10,
        market.resolved_option,
        market.options,
        market.option_volumes.map(vol => parseInt(vol)),
        parseFloat(market.total_volume) || 0,
        'binary', // Default market type
      ]);

      console.log(`✅ Successfully imported market: ${market.market_address}`);
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Failed to import market ${market.market_address}:`, error);
      throw error;
    }
  }

  async recoverAllMissingMarkets() {
    console.log('🚀 Starting blockchain market recovery...');
    
    try {
      await this.initialize();
      const missingMarkets = await this.findMissingMarkets();
      
      if (missingMarkets.length === 0) {
        console.log('✅ No missing markets found - database is in sync!');
        return { success: true, imported: 0, skipped: 0 };
      }

      let imported = 0;
      let skipped = 0;

      for (const market of missingMarkets) {
        try {
          await this.importMarketToDatabase(market);
          imported++;
        } catch (error) {
          console.error(`❌ Failed to import ${market.market_address}:`, error.message);
          skipped++;
        }
      }

      console.log(`\n🎯 Recovery Summary:`);
      console.log(`✅ Successfully imported: ${imported} markets`);
      console.log(`❌ Failed to import: ${skipped} markets`);
      console.log(`📊 Total processed: ${missingMarkets.length} markets`);

      return { success: true, imported, skipped, total: missingMarkets.length };
    } catch (error) {
      console.error('❌ Recovery process failed:', error);
      return { success: false, error: error.message };
    }
  }

  getStatusString(status) {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Resolved';
      case 2: return 'Cancelled';
      default: return 'Unknown';
    }
  }
}

// Script execution
async function main() {
  console.log('🔄 Starting blockchain market recovery script...\n');
  
  const recovery = new BlockchainMarketRecovery();
  const result = await recovery.recoverAllMissingMarkets();
  
  if (result.success) {
    console.log('\n🎉 Recovery completed successfully!');
    if (result.imported > 0) {
      console.log('🔄 Consider refreshing your frontend to see the newly imported markets.');
    }
  } else {
    console.error('\n💥 Recovery failed:', result.error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Export for use as module or run as script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = BlockchainMarketRecovery; 