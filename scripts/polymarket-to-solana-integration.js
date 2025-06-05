#!/usr/bin/env node

const { Pool } = require('pg');
const { ethers } = require('ethers');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './src/frontend/.env' });

// Database Configuration
const POLYMARKET_DB_URL = process.env.POLYMARKET_DB_URL || 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';

// ApeChain Configuration
const APECHAIN_CONFIG = {
  RPC_URL: process.env.APECHAIN_RPC_URL || 'https://rpc.apechain.com/rpc',
  MARKET_CONTRACT: process.env.APECHAIN_MARKET_CONTRACT || '0x...', // Need actual contract address
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
      connectionString: POLYMARKET_DB_URL,
      ssl: { rejectUnauthorized: false }
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
    
    // Track deployed markets
    this.deployedMarkets = new Set();
  }

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
   * Check if market already exists on Solana (in our backend)
   */
  async checkSolanaDeployment(polyId) {
    try {
      const response = await fetch(`http://localhost:5001/api/markets/by-poly-id/${polyId}`);
      if (response.ok) {
        const data = await response.json();
        return data && data.market_address;
      }
    } catch (error) {
      // Ignore errors, assume not deployed
    }
    return false;
  }

  /**
   * Fetch deployable markets from Polymarket database
   */
  async fetchDeployableMarkets(limit = 10, offset = 0) {
    console.log('\n📥 Fetching deployable markets from Polymarket database...');
    
    const query = `
      SELECT 
        m.poly_id,
        m.market_id as apechain_market_id,
        m.question,
        m.category,
        m.banner,
        m.icon,
        m.end_time,
        m.market_type,
        m.status,
        m.deployed_at,
        -- Get options as JSON array
        COALESCE(
          json_agg(
            json_build_object(
              'label', mo.label,
              'icon', mo.icon,
              'option_poly_id', mo.option_poly_id
            ) ORDER BY mo.id
          ) FILTER (WHERE mo.id IS NOT NULL),
          '[]'::json
        ) as options
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE 
        m.market_id IS NOT NULL  -- Has ApeChain ID
        AND m.status = 'live'     -- Deployed to ApeChain
        AND m.end_time > NOW()    -- Still active
        AND m.question IS NOT NULL
      GROUP BY m.poly_id
      ORDER BY m.end_time ASC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await this.pgPool.query(query, [limit, offset]);
      console.log(`✅ Found ${result.rows.length} deployable markets`);
      
      // Transform the data
      return result.rows.map(row => ({
        poly_id: row.poly_id,
        apechain_market_id: row.apechain_market_id,
        question: row.question,
        category: row.category || 'general',
        options: row.options || [],
        assets: {
          banner: row.banner,
          icon: row.icon || row.banner // Use banner as fallback for icon
        },
        end_time: row.end_time,
        market_type: row.market_type,
        status: row.status,
        deployed_at: row.deployed_at
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
    
    // For testing without actual ApeChain contract
    if (APECHAIN_CONFIG.MARKET_CONTRACT === '0x...') {
      console.log('⚠️  Using simulated ApeChain response (no contract configured)');
      
      // Simulate that markets with even IDs are resolved
      const isResolved = parseInt(marketId) % 2 === 0;
      
      return {
        question: "Simulated question",
        endTime: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
        resolved: isResolved,
        winningOptionIndex: isResolved ? 0 : 0
      };
    }
    
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
      
      // Use endTime from database (already validated)
      const endTimeSeconds = Math.floor(new Date(dbMarket.end_time).getTime() / 1000);
      const resolutionDate = new BN(endTimeSeconds);
      
      // Prepare options (max 4 for now due to Solana contract limitation)
      const optionLabels = dbMarket.options.map(o => o.label).slice(0, 4);
      while (optionLabels.length < 4) {
        optionLabels.push(''); // Pad with empty strings
      }
      
      // Market parameters
      const minBet = new BN(1_000_000); // 1 APES (6 decimals)
      const creatorFeeRate = 100; // 1%
      
      console.log('📝 Market details:');
      console.log(`   ID: ${marketKeypair.publicKey.toString()}`);
      console.log(`   ApeChain ID: ${dbMarket.apechain_market_id}`);
      console.log(`   Options: ${optionLabels.filter(o => o).join(', ')}`);
      console.log(`   End: ${new Date(endTimeSeconds * 1000).toLocaleString()}`);
      console.log(`   Banner: ${dbMarket.assets.banner ? '✓' : '✗'}`);
      console.log(`   Category: ${dbMarket.category}`);
      
      // Create market transaction
      const tx = await this.program.methods
        .createMarket(
          dbMarket.question,
          dbMarket.question, // Use question as description
          dbMarket.category,
          optionLabels,
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
      
      // Save to our backend
      await this.saveMarketToBackend(dbMarket, marketKeypair.publicKey.toString(), tx);
      
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
   * Save market to our backend with full metadata
   */
  async saveMarketToBackend(dbMarket, solanaAddress, txHash) {
    try {
      const payload = {
        market_address: solanaAddress,
        poly_id: dbMarket.poly_id,
        apechain_market_id: dbMarket.apechain_market_id.toString(),
        question: dbMarket.question,
        category: dbMarket.category,
        options: dbMarket.options.map(o => o.label),
        assets: dbMarket.assets,
        options_metadata: dbMarket.options,
        status: 'Active',
        end_time: dbMarket.end_time,
        transaction_hash: txHash
      };
      
      // POST to our backend
      const response = await fetch('http://localhost:5001/api/markets/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('💾 Market saved to backend');
        console.log(`   Poly ID: ${dbMarket.poly_id}`);
        console.log(`   ApeChain ID: ${dbMarket.apechain_market_id}`);
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
    const { limit = 5, batchSize = 10, skipApeChainCheck = false } = options;
    
    console.log('🎯 Polymarket to Solana Market Migration\n');
    console.log(`Processing up to ${limit} markets...`);
    if (skipApeChainCheck) {
      console.log('⚠️  Skipping ApeChain verification (--skip-apechain flag)');
    }
    
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
      const dbMarkets = await this.fetchDeployableMarkets(
        Math.min(batchSize, limit - processedCount),
        offset
      );
      
      if (dbMarkets.length === 0) {
        console.log('\n📭 No more deployable markets found');
        break;
      }
      
      // Process each market
      for (const dbMarket of dbMarkets) {
        if (processedCount >= limit) break;
        processedCount++;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[${processedCount}/${limit}] Processing: ${dbMarket.question}`);
        console.log(`${'='.repeat(60)}`);
        
        // Check if already deployed to Solana
        const existingAddress = await this.checkSolanaDeployment(dbMarket.poly_id);
        if (existingAddress) {
          console.log('⏭️  Skipping - Already deployed to Solana');
          console.log(`   Address: ${existingAddress}`);
          results.skipped.push({
            ...dbMarket,
            reason: 'Already on Solana',
            solanaAddress: existingAddress
          });
          continue;
        }
        
        // Check ApeChain status (unless skipped)
        let apeChainInfo = null;
        if (!skipApeChainCheck) {
          apeChainInfo = await this.checkApeChainStatus(dbMarket.apechain_market_id);
          
          if (!apeChainInfo) {
            results.failed.push({
              ...dbMarket,
              reason: 'Failed to fetch ApeChain status'
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
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Created Markets:');
      results.successful.forEach((market, i) => {
        console.log(`\n${i + 1}. ${market.question}`);
        console.log(`   Solana: ${market.solanaAddress}`);
        console.log(`   TX: ${market.transaction}`);
        console.log(`   Poly ID: ${market.poly_id}`);
        console.log(`   ApeChain ID: ${market.apechain_market_id}`);
        console.log(`   Options: ${market.options.map(o => o.label).join(', ')}`);
        console.log(`   End Time: ${new Date(market.end_time).toLocaleString()}`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Markets:');
      const grouped = {};
      results.skipped.forEach(market => {
        if (!grouped[market.reason]) grouped[market.reason] = [];
        grouped[market.reason].push(market);
      });
      
      Object.entries(grouped).forEach(([reason, markets]) => {
        console.log(`\n   ${reason} (${markets.length}):`);
        markets.forEach((market, i) => {
          console.log(`   ${i + 1}. ${market.question}`);
          if (market.solanaAddress) {
            console.log(`      Solana: ${market.solanaAddress}`);
          }
        });
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
    
    console.log('\n📊 Database Stats:');
    console.log(`   Total markets processed: ${results.successful.length + results.skipped.length + results.failed.length}`);
    console.log(`   Success rate: ${((results.successful.length / (results.successful.length + results.failed.length)) * 100).toFixed(1)}%`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/polymarket-to-solana-integration.js [options]

Options:
  --help              Show this help message
  --limit N           Process N markets (default: 5)
  --batch N           Fetch N markets per DB query (default: 10)
  --skip-apechain     Skip ApeChain verification (for testing)

Environment Variables:
  POLYMARKET_DB_URL        PostgreSQL connection (uses embedded default)
  APECHAIN_RPC_URL         ApeChain RPC endpoint
  APECHAIN_MARKET_CONTRACT ApeChain market contract address
  VITE_SOLANA_RPC_URL      Solana RPC endpoint
  VITE_PROGRAM_ID          Market program ID
  VITE_APES_TOKEN_MINT     APES token mint
  SOLANA_WALLET_PATH       Path to wallet keypair

Example:
  # Process 3 markets
  node scripts/polymarket-to-solana-integration.js --limit 3
  
  # Test without ApeChain verification
  node scripts/polymarket-to-solana-integration.js --limit 5 --skip-apechain

Database Info:
  Using Polymarket Pipeline database at Neon
  Tables: markets, market_options
  Filters: status='live', market_id IS NOT NULL, end_time > NOW()
`);
    process.exit(0);
  }
  
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 5;
  
  const batchIndex = args.indexOf('--batch');
  const batchSize = batchIndex !== -1 ? parseInt(args[batchIndex + 1]) : 10;
  
  const skipApeChainCheck = args.includes('--skip-apechain');
  
  const integrator = new PolymarketToSolanaIntegration();
  
  try {
    await integrator.processMarkets({ limit, batchSize, skipApeChainCheck });
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute
main().catch(console.error); 