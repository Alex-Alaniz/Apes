const { Connection, PublicKey } = require('@solana/web3.js');
const db = require('../config/database');

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('7aGnUvCmpKuYc5wSVdZxG7UNULQWv8qoBa8UhVRxLJLE');

class BlockchainMarketRecovery {
  constructor() {
    this.connection = new Connection(RPC_URL);
  }

  async initialize() {
    try {
      // Test connection
      const version = await this.connection.getVersion();
      console.log('✅ Blockchain connection initialized, Solana version:', version.solanaCore);
    } catch (error) {
      console.error('❌ Failed to initialize blockchain connection:', error);
      throw error;
    }
  }

  async fetchAllBlockchainMarkets() {
    console.log('🔍 Fetching all markets from blockchain...');
    
    try {
      // Get all program accounts (this gets all accounts owned by our program)
      const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            dataSize: 1000, // Approximate size of market account (adjust as needed)
          }
        ]
      });
      
      console.log(`📊 Found ${accounts.length} program accounts on blockchain`);
      
      // For now, let's just return the public keys and mock data
      // In a real implementation, you'd decode the account data
      return accounts.map(({ pubkey, account }) => {
        // This is simplified - in reality you'd decode the account data
        // to get the actual market information
        return {
          market_address: pubkey.toString(),
          creator: 'Unknown', // Would decode from account data
          question: `Market ${pubkey.toString().substring(0, 8)}...`, // Would decode from account data
          options: ['Option A', 'Option B'], // Would decode from account data
          status: 'Active',
          resolution_date: null,
          resolved_option: null,
          creator_fee_rate: 200,
          min_bet: '10',
          total_volume: '0',
          option_volumes: [0, 0],
          created_at: new Date()
        };
      });
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

      console.log(`\n🤔 Found ${missingMarkets.length} accounts on blockchain not in database.`);
      console.log('📝 Note: These might include non-market accounts or test accounts.');
      console.log('🔧 For production, we would decode account data to verify they are actual markets.\n');

      // For demo purposes, let's just show what we found without importing
      missingMarkets.forEach((market, index) => {
        console.log(`${index + 1}. Account: ${market.market_address}`);
        console.log(`   This would be analyzed and imported if it's a valid market\n`);
      });

      console.log(`\n🎯 Recovery Summary:`);
      console.log(`📊 Found ${missingMarkets.length} blockchain accounts not in database`);
      console.log(`🔧 Next step: Decode account data to identify actual markets`);
      console.log(`💾 Then import verified market accounts to database`);

      return { success: true, imported: 0, skipped: 0, total: missingMarkets.length };
    } catch (error) {
      console.error('❌ Recovery process failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Script execution
async function main() {
  console.log('🔄 Starting blockchain market recovery script...\n');
  
  const recovery = new BlockchainMarketRecovery();
  const result = await recovery.recoverAllMissingMarkets();
  
  if (result.success) {
    console.log('\n🎉 Recovery analysis completed successfully!');
    console.log('🔧 To import missing markets, enhance the script to decode account data.');
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