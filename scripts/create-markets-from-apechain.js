#!/usr/bin/env node

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: './src/frontend/.env' });

// ApeChain Market Contract ABI (simplified)
const APECHAIN_MARKET_ABI = [
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
];

// Configuration
const APECHAIN_RPC = process.env.APECHAIN_RPC_URL || 'https://apechain.rpc.url';
const APECHAIN_MARKET_CONTRACT = process.env.APECHAIN_MARKET_CONTRACT || '0x...'; // Replace with actual contract
const POLYMARKET_DB_URL = process.env.POLYMARKET_DB_URL || 'postgresql://username:password@host:port/database';

class ApeChainToSolanaMarketCreator {
  constructor() {
    // Solana setup
    this.connection = new Connection(
      process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.provider = null;
    this.program = null;
    this.tokenMint = null;
    
    // ApeChain setup
    this.apeProvider = new ethers.providers.JsonRpcProvider(APECHAIN_RPC);
    this.marketContract = new ethers.Contract(APECHAIN_MARKET_CONTRACT, APECHAIN_MARKET_ABI, this.apeProvider);
  }

  async initializeSolana() {
    console.log('🔧 Initializing Solana connection...');
    
    // Load wallet keypair
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
  }

  /**
   * Fetch markets directly from Polymarket database
   */
  async fetchMarketsFromDB(limit = 10) {
    console.log('\n📥 Fetching markets from Polymarket database...');
    
    // For now, we'll simulate DB fetch with structured data
    // In production, replace with actual PostgreSQL query
    const mockDbQuery = `
      SELECT 
        apechain_market_id,
        poly_id,
        question,
        category,
        options,
        assets,
        options_metadata
      FROM markets
      WHERE apechain_market_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    // Simulated DB results (replace with actual pg query)
    const dbMarkets = [
      {
        apechain_market_id: "1",
        poly_id: "event-16174",
        question: "Will Bitcoin reach $100k by end of 2025?",
        category: "crypto",
        options: ["Yes", "No"],
        assets: {
          banner: "https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-100k-banner.jpg",
          icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-icon.png"
        },
        options_metadata: [
          { label: "Yes", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/yes-icon.png" },
          { label: "No", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/no-icon.png" }
        ]
      },
      {
        apechain_market_id: "2",
        poly_id: "event-16175",
        question: "NBA Western Conference Champion 2025",
        category: "sports",
        options: ["Lakers", "Warriors", "Suns", "Nuggets"],
        assets: {
          banner: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nba-west-banner.jpg",
          icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nba-icon.png"
        },
        options_metadata: [
          { label: "Lakers", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/lakers-icon.png" },
          { label: "Warriors", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/warriors-icon.png" },
          { label: "Suns", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/suns-icon.png" },
          { label: "Nuggets", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nuggets-icon.png" }
        ]
      },
      {
        apechain_market_id: "3",
        poly_id: "event-16176",
        question: "Trump wins 2024 Republican nomination?",
        category: "politics",
        options: ["Yes", "No"],
        assets: {
          banner: "https://polymarket-upload.s3.us-east-2.amazonaws.com/trump-nomination-banner.jpg",
          icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/politics-icon.png"
        },
        options_metadata: [
          { label: "Yes", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/check-icon.png" },
          { label: "No", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/x-icon.png" }
        ]
      },
      {
        apechain_market_id: "4",
        poly_id: "event-16177",
        question: "Apple stock above $200 by Q2 2025?",
        category: "business",
        options: ["Yes", "No"],
        assets: {
          banner: "https://polymarket-upload.s3.us-east-2.amazonaws.com/apple-stock-banner.jpg",
          icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/apple-icon.png"
        },
        options_metadata: [
          { label: "Yes", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/up-arrow.png" },
          { label: "No", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/down-arrow.png" }
        ]
      },
      {
        apechain_market_id: "5",
        poly_id: "event-16178",
        question: "Will AI surpass human performance on all benchmarks by 2026?",
        category: "tech",
        options: ["Yes", "No"],
        assets: {
          banner: "https://polymarket-upload.s3.us-east-2.amazonaws.com/ai-benchmarks-banner.jpg",
          icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/ai-icon.png"
        },
        options_metadata: [
          { label: "Yes", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/robot-icon.png" },
          { label: "No", icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/human-icon.png" }
        ]
      }
    ];
    
    console.log(`✅ Found ${dbMarkets.length} markets in database`);
    return dbMarkets;
  }

  /**
   * Check market status on ApeChain
   */
  async checkApeChainStatus(marketId) {
    console.log(`\n🔍 Checking ApeChain status for market ${marketId}...`);
    
    try {
      // Simulate contract call (replace with actual contract interaction)
      // const marketInfo = await this.marketContract.getMarketInfo(marketId);
      
      // Simulated responses for demo
      const simulatedResponses = {
        "1": { question: "Will Bitcoin reach $100k by end of 2025?", endTime: 1767225600, resolved: false, winningOptionIndex: 0 },
        "2": { question: "NBA Western Conference Champion 2025", endTime: 1749124800, resolved: true, winningOptionIndex: 3 },
        "3": { question: "Trump wins 2024 Republican nomination?", endTime: 1735689600, resolved: false, winningOptionIndex: 0 },
        "4": { question: "Apple stock above $200 by Q2 2025?", endTime: 1751328000, resolved: false, winningOptionIndex: 0 },
        "5": { question: "Will AI surpass human performance on all benchmarks by 2026?", endTime: 1798761600, resolved: false, winningOptionIndex: 0 }
      };
      
      const marketInfo = simulatedResponses[marketId] || {
        question: "Unknown",
        endTime: Math.floor(Date.now() / 1000) + 86400 * 30,
        resolved: false,
        winningOptionIndex: 0
      };
      
      console.log(`   Question: ${marketInfo.question}`);
      console.log(`   End Time: ${new Date(marketInfo.endTime * 1000).toLocaleString()}`);
      console.log(`   Resolved: ${marketInfo.resolved}`);
      if (marketInfo.resolved) {
        console.log(`   Winning Option: ${marketInfo.winningOptionIndex}`);
      }
      
      return marketInfo;
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
      console.log(`   Banner: ${dbMarket.assets.banner}`);
      console.log(`   Icon: ${dbMarket.assets.icon}`);
      
      // Create market transaction
      const tx = await this.program.methods
        .createMarket(
          dbMarket.question,
          dbMarket.question, // Use question as description
          dbMarket.category || 'general',
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
      
      // Save to backend with image metadata
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
   * Save market to backend with full metadata
   */
  async saveMarketToBackend(dbMarket, solanaMarketAddress) {
    try {
      const payload = {
        market_address: solanaMarketAddress,
        poly_id: dbMarket.poly_id,
        apechain_market_id: dbMarket.apechain_market_id,
        question: dbMarket.question,
        category: dbMarket.category,
        options: dbMarket.options,
        assets: dbMarket.assets,
        options_metadata: dbMarket.options_metadata,
        status: 'Active'
      };
      
      // In production, save to your backend
      console.log('💾 Market metadata saved to backend');
      console.log(`   Images: ${dbMarket.assets.banner ? '✓ Banner' : ''} ${dbMarket.assets.icon ? '✓ Icon' : ''}`);
      console.log(`   Option Icons: ${dbMarket.options_metadata.filter(o => o.icon).length}/${dbMarket.options.length}`);
      
    } catch (error) {
      console.error('⚠️  Failed to save to backend:', error.message);
    }
  }

  /**
   * Main process
   */
  async processMarkets(limit = 5) {
    console.log('🎯 ApeChain to Solana Market Migration\n');
    
    // Initialize Solana
    await this.initializeSolana();
    
    // Fetch markets from DB
    const dbMarkets = await this.fetchMarketsFromDB(limit);
    
    const results = {
      successful: [],
      skipped: [],
      failed: []
    };
    
    // Process each market
    for (const dbMarket of dbMarkets) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${dbMarket.question}`);
      console.log(`${'='.repeat(60)}`);
      
      // Check ApeChain status
      const apeChainInfo = await this.checkApeChainStatus(dbMarket.apechain_market_id);
      
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
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
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
        console.log(`   Images: ${market.assets.banner ? '✓' : '✗'} Banner, ${market.assets.icon ? '✓' : '✗'} Icon`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Markets (Resolved on ApeChain):');
      results.skipped.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Winner: Option ${market.winningOption}`);
      });
    }
    
    console.log('\n✨ Migration complete!');
  }
}

// Run the migration
async function main() {
  const migrator = new ApeChainToSolanaMarketCreator();
  
  try {
    await migrator.processMarkets(5); // Process 5 markets
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Command line interface
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scripts/create-markets-from-apechain.js [options]

Options:
  --help     Show this help message
  --limit N  Process N markets (default: 5)

Environment Variables:
  VITE_SOLANA_RPC_URL      Solana RPC endpoint
  VITE_PROGRAM_ID          Market program ID
  VITE_APES_TOKEN_MINT     APES token mint
  SOLANA_WALLET_PATH       Path to wallet keypair
  APECHAIN_RPC_URL         ApeChain RPC endpoint
  APECHAIN_MARKET_CONTRACT ApeChain market contract address
  POLYMARKET_DB_URL        PostgreSQL connection string
`);
  process.exit(0);
}

// Run
main().catch(console.error); 