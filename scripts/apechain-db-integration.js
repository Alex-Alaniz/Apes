#!/usr/bin/env node

const { Pool } = require('pg');
const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './src/frontend/.env' });

// ApeChain Configuration
const APECHAIN_CONFIG = {
  RPC_URL: process.env.APECHAIN_RPC_URL || 'https://rpc.apechain.com',
  MARKET_CONTRACT: process.env.APECHAIN_MARKET_CONTRACT || '0x...',
  ABI: [
    {
      "inputs": [{"internalType": "uint256", "name": "_marketId", "type": "uint256"}],
      "name": "getMarketInfo",
      "outputs": [
        {"internalType": "string", "name": "question", "type": "string"},
        {"internalType": "uint256", "name": "endTime", "type": "uint256"},
        {"internalType": "bool", "name": "resolved", "type": "bool"},
        {"internalType": "uint256", "name": "winningOptionIndex", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

class PolymarketToSolanaIntegration {
  constructor() {
    // PostgreSQL connection
    this.pgPool = new Pool({
      connectionString: process.env.POLYMARKET_DB_URL || 'postgresql://postgres:password@localhost:5432/polymarket',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // ApeChain connection
    this.apeProvider = new ethers.providers.JsonRpcProvider(APECHAIN_CONFIG.RPC_URL);
    this.marketContract = new ethers.Contract(
      APECHAIN_CONFIG.MARKET_CONTRACT,
      APECHAIN_CONFIG.ABI,
      this.apeProvider
    );
    
    // Solana connection
    this.connection = null;
    this.provider = null;
    this.program = null;
    this.tokenMint = null;
  }

  /**
   * Initialize Solana connection and program
   */
  async initializeSolana() {
    console.log('🔧 Initializing Solana connection...');
    
    this.connection = new Connection(
      process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    
    // Load wallet
    const walletPath = process.env.SOLANA_WALLET_PATH || path.join(process.env.HOME, '.config/solana/id.json');
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );
    
    // Create provider
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: async (tx) => {
        tx.sign(walletKeypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.sign(walletKeypair));
        return txs;
      }
    };
    
    this.provider = new AnchorProvider(this.connection, wallet, {
      preflightCommitment: 'confirmed',
    });
    
    // Load program
    const idl = JSON.parse(fs.readFileSync('./src/smart_contracts/market_system/target/idl/market_system.json', 'utf8'));
    const programId = new PublicKey(process.env.VITE_PROGRAM_ID || idl.metadata.address);
    this.program = new Program(idl, programId, this.provider);
    
    // Set token mint
    this.tokenMint = new PublicKey(process.env.VITE_APES_TOKEN_MINT || 'APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe');
    
    console.log('✅ Solana initialized');
    console.log(`   Wallet: ${walletKeypair.publicKey.toString()}`);
    console.log(`   Program: ${programId.toString()}`);
  }

  /**
   * Fetch markets from Polymarket database
   */
  async fetchMarketsFromDB(limit = 10, offset = 0) {
    console.log('\n📥 Fetching markets from Polymarket database...');
    
    const query = `
      SELECT 
        m.apechain_market_id,
        m.poly_id,
        m.question,
        m.category,
        m.options,
        m.created_at,
        m.updated_at,
        -- Assets
        json_build_object(
          'banner', m.banner_url,
          'icon', m.icon_url
        ) as assets,
        -- Options metadata
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'label', om.label,
                'icon', om.icon_url,
                'index', om.option_index
              ) ORDER BY om.option_index
            )
            FROM market_option_metadata om
            WHERE om.market_id = m.id
          ),
          '[]'::json
        ) as options_metadata
      FROM markets m
      WHERE 
        m.apechain_market_id IS NOT NULL
        AND m.status != 'cancelled'
        AND m.solana_address IS NULL  -- Not yet created on Solana
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await this.pgPool.query(query, [limit, offset]);
      console.log(`✅ Found ${result.rows.length} markets in database`);
      
      // Transform the data
      return result.rows.map(row => ({
        apechain_market_id: row.apechain_market_id,
        poly_id: row.poly_id,
        question: row.question,
        category: row.category || 'general',
        options: row.options || [],
        assets: row.assets || { banner: null, icon: null },
        options_metadata: row.options_metadata || [],
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      throw error;
    }
  }

  /**
   * Check market status on ApeChain
   */
  async checkApeChainStatus(marketId) {
    console.log(`\n🔍 Checking ApeChain status for market ${marketId}...`);
    
    try {
      const marketInfo = await this.marketContract.getMarketInfo(marketId);
      
      const status = {
        question: marketInfo.question,
        endTime: marketInfo.endTime.toNumber(),
        resolved: marketInfo.resolved,
        winningOptionIndex: marketInfo.winningOptionIndex.toNumber()
      };
      
      console.log(`   Question: ${status.question}`);
      console.log(`   End Time: ${new Date(status.endTime * 1000).toLocaleString()}`);
      console.log(`   Resolved: ${status.resolved}`);
      if (status.resolved) {
        console.log(`   Winning Option: ${status.winningOptionIndex}`);
      }
      
      return status;
    } catch (error) {
      console.error(`❌ Failed to check ApeChain status:`, error.message);
      return null;
    }
  }

  /**
   * Create market on Solana
   */
  async createSolanaMarket(dbMarket, apeChainInfo) {
    console.log(`\n🚀 Creating Solana market: "${dbMarket.question}"`);
    
    try {
      // Generate market keypair
      const marketKeypair = Keypair.generate();
      
      // Use endTime from ApeChain
      const resolutionDate = new BN(apeChainInfo.endTime);
      
      // Prepare options (max 4 for now)
      const options = dbMarket.options.slice(0, 4);
      while (options.length < 4) {
        options.push(''); // Pad with empty strings
      }
      
      // Market parameters
      const minBet = new BN(1_000_000); // 1 APES (6 decimals)
      const creatorFeeRate = 100; // 1%
      
      console.log('📝 Market details:');
      console.log(`   ID: ${marketKeypair.publicKey.toString()}`);
      console.log(`   Options: ${options.filter(o => o).join(', ')}`);
      console.log(`   End: ${new Date(apeChainInfo.endTime * 1000).toLocaleString()}`);
      
      // Create market transaction
      const tx = await this.program.methods
        .createMarket(
          dbMarket.question,
          dbMarket.question, // Use question as description
          dbMarket.category,
          options,
          resolutionDate,
          minBet,
          creatorFeeRate
        )
        .accounts({
          market: marketKeypair.publicKey,
          creator: this.provider.wallet.publicKey,
          tokenMint: this.tokenMint,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([marketKeypair])
        .rpc();
      
      console.log(`✅ Market created! TX: ${tx}`);
      
      // Update database with Solana address
      await this.updateMarketInDB(dbMarket, marketKeypair.publicKey.toString(), tx);
      
      // Save to our backend
      await this.saveMarketToBackend(dbMarket, marketKeypair.publicKey.toString());
      
      return {
        success: true,
        marketAddress: marketKeypair.publicKey.toString(),
        transaction: tx
      };
    } catch (error) {
      console.error(`❌ Failed to create market:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update market in Polymarket DB with Solana address
   */
  async updateMarketInDB(dbMarket, solanaAddress, txHash) {
    const query = `
      UPDATE markets 
      SET 
        solana_address = $1,
        solana_tx_hash = $2,
        solana_created_at = NOW()
      WHERE poly_id = $3
    `;
    
    try {
      await this.pgPool.query(query, [solanaAddress, txHash, dbMarket.poly_id]);
      console.log('💾 Updated Polymarket DB with Solana address');
    } catch (error) {
      console.error('⚠️  Failed to update DB:', error.message);
    }
  }

  /**
   * Save market to our backend
   */
  async saveMarketToBackend(dbMarket, solanaAddress) {
    try {
      const payload = {
        market_address: solanaAddress,
        poly_id: dbMarket.poly_id,
        apechain_market_id: dbMarket.apechain_market_id,
        question: dbMarket.question,
        category: dbMarket.category,
        options: dbMarket.options,
        assets: dbMarket.assets,
        options_metadata: dbMarket.options_metadata,
        status: 'Active'
      };
      
      // POST to our backend
      const response = await fetch('http://localhost:5001/api/markets/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('💾 Market saved to our backend');
      } else {
        console.log('⚠️  Backend save returned:', response.status);
      }
    } catch (error) {
      console.error('⚠️  Failed to save to backend:', error.message);
    }
  }

  /**
   * Main processing loop
   */
  async processMarkets(options = {}) {
    const { limit = 5, batchSize = 10, maxRetries = 3 } = options;
    
    console.log('🎯 ApeChain to Solana Market Migration\n');
    console.log(`Processing up to ${limit} markets...`);
    
    // Initialize connections
    await this.initializeSolana();
    
    const results = {
      successful: [],
      skipped: [],
      failed: []
    };
    
    let offset = 0;
    let processedCount = 0;
    
    while (processedCount < limit) {
      // Fetch batch from DB
      const dbMarkets = await this.fetchMarketsFromDB(
        Math.min(batchSize, limit - processedCount),
        offset
      );
      
      if (dbMarkets.length === 0) {
        console.log('\n📭 No more markets to process');
        break;
      }
      
      // Process each market
      for (const dbMarket of dbMarkets) {
        if (processedCount >= limit) break;
        processedCount++;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[${processedCount}/${limit}] Processing: ${dbMarket.question}`);
        console.log(`${'='.repeat(60)}`);
        
        // Check ApeChain status with retries
        let apeChainInfo = null;
        let retries = 0;
        
        while (retries < maxRetries && !apeChainInfo) {
          apeChainInfo = await this.checkApeChainStatus(dbMarket.apechain_market_id);
          if (!apeChainInfo) {
            retries++;
            if (retries < maxRetries) {
              console.log(`⚠️  Retry ${retries}/${maxRetries} for ApeChain check...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!apeChainInfo) {
          results.failed.push({
            ...dbMarket,
            reason: 'Failed to fetch ApeChain status after retries'
          });
          continue;
        }
        
        // Skip if resolved
        if (apeChainInfo.resolved) {
          console.log('⏭️  Skipping - Market is resolved on ApeChain');
          results.skipped.push({
            ...dbMarket,
            reason: 'Resolved on ApeChain',
            winningOption: apeChainInfo.winningOptionIndex
          });
          continue;
        }
        
        // Create on Solana
        const result = await this.createSolanaMarket(dbMarket, apeChainInfo);
        
        if (result.success) {
          results.successful.push({
            ...dbMarket,
            solanaAddress: result.marketAddress,
            transaction: result.transaction
          });
        } else {
          results.failed.push({
            ...dbMarket,
            reason: result.error
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      offset += batchSize;
    }
    
    // Print summary
    this.printSummary(results);
    
    // Close connections
    await this.pgPool.end();
    
    return results;
  }

  /**
   * Print processing summary
   */
  printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`⏭️  Skipped (resolved): ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Created Markets:');
      results.successful.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Solana: ${market.solanaAddress}`);
        console.log(`   TX: ${market.transaction}`);
        console.log(`   Poly ID: ${market.poly_id}`);
        console.log(`   ApeChain ID: ${market.apechain_market_id}`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Markets (Resolved):');
      results.skipped.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Winner: Option ${market.winningOption}`);
        console.log(`   ApeChain ID: ${market.apechain_market_id}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Markets:');
      results.failed.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Reason: ${market.reason}`);
        console.log(`   ApeChain ID: ${market.apechain_market_id}`);
      });
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/apechain-db-integration.js [options]

Options:
  --help         Show this help message
  --limit N      Process N markets (default: 5)
  --batch N      Fetch N markets per DB query (default: 10)
  --dry-run      Check markets without creating on Solana

Environment Variables:
  POLYMARKET_DB_URL        PostgreSQL connection string
  APECHAIN_RPC_URL         ApeChain RPC endpoint
  APECHAIN_MARKET_CONTRACT ApeChain market contract address
  VITE_SOLANA_RPC_URL      Solana RPC endpoint
  VITE_PROGRAM_ID          Market program ID
  VITE_APES_TOKEN_MINT     APES token mint
  SOLANA_WALLET_PATH       Path to wallet keypair

Example:
  node scripts/apechain-db-integration.js --limit 10 --batch 5
`);
    process.exit(0);
  }
  
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 5;
  
  const batchIndex = args.indexOf('--batch');
  const batchSize = batchIndex !== -1 ? parseInt(args[batchIndex + 1]) : 10;
  
  const integrator = new PolymarketToSolanaIntegration();
  
  try {
    await integrator.processMarkets({ limit, batchSize });
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute
main().catch(console.error); 