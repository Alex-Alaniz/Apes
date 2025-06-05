#!/usr/bin/env node

const axios = require('axios');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './src/frontend/.env' });

// Configuration
const POLYMARKET_API = 'https://polymarket.primape.app/api/v1';
const BACKEND_API = 'http://localhost:5001/api';

class SolanaMarketCreator {
  constructor() {
    this.connection = new Connection(
      process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.provider = null;
    this.program = null;
    this.tokenMint = null;
  }

  async initialize() {
    console.log('🔧 Initializing Solana connection...');
    
    // Load wallet keypair (for automation - in production use a secure wallet)
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
    
    console.log('✅ Initialized with:');
    console.log(`   Wallet: ${walletKeypair.publicKey.toString()}`);
    console.log(`   Program: ${programId.toString()}`);
    console.log(`   Token: ${this.tokenMint.toString()}`);
    console.log(`   Network: ${this.connection.rpcEndpoint}`);
  }

  async fetchValidatedMarkets() {
    console.log('\n📥 Fetching validated markets from Polymarket...');
    
    try {
      // Try validated endpoint first
      try {
        const response = await axios.get(`${POLYMARKET_API}/solana/deployed-markets?validate=true`);
        console.log(`✅ Found ${response.data.markets?.length || 0} validated active markets`);
        return response.data.markets || [];
      } catch (error) {
        console.log('⚠️  Validation endpoint unavailable, using standard endpoint...');
        // Fall back to standard endpoint
        const response = await axios.get(`${POLYMARKET_API}/solana/deployed-markets`);
        const markets = response.data.markets || [];
        
        // Filter for active markets manually
        const activeMarkets = markets.filter(market => {
          const endTime = new Date(market.end_time);
          const now = new Date();
          return market.status === 'live' && endTime > now;
        });
        
        console.log(`✅ Found ${activeMarkets.length} active markets (${markets.length - activeMarkets.length} filtered out)`);
        return activeMarkets;
      }
    } catch (error) {
      console.error('❌ Failed to fetch markets:', error.message);
      return [];
    }
  }

  async checkExistingMarkets() {
    console.log('\n🔍 Checking existing Solana markets...');
    
    try {
      // Get all markets from backend
      const response = await axios.get(`${BACKEND_API}/markets`);
      const existingMarkets = response.data || [];
      
      // Create a map of poly_id to market
      const polyIdMap = {};
      existingMarkets.forEach(market => {
        if (market.poly_id) {
          polyIdMap[market.poly_id] = market;
        }
      });
      
      console.log(`✅ Found ${existingMarkets.length} existing markets`);
      return polyIdMap;
    } catch (error) {
      console.error('⚠️  Could not fetch existing markets:', error.message);
      return {};
    }
  }

  async createMarket(polymarketData) {
    console.log(`\n🚀 Creating market: "${polymarketData.question}"`);
    
    try {
      // Generate market keypair
      const marketKeypair = Keypair.generate();
      
      // Convert end time to Unix timestamp
      const resolutionDate = Math.floor(new Date(polymarketData.end_time).getTime() / 1000);
      
      // Prepare options (max 4 for now)
      const options = polymarketData.options.slice(0, 4).map(opt => opt.label);
      while (options.length < 4) {
        options.push(''); // Pad with empty strings
      }
      
      // Market parameters
      const minBet = new BN(1_000_000); // 1 APES (6 decimals)
      const creatorFeeRate = 100; // 1%
      
      console.log('📝 Market details:');
      console.log(`   ID: ${marketKeypair.publicKey.toString()}`);
      console.log(`   Options: ${options.filter(o => o).join(', ')}`);
      console.log(`   End: ${new Date(resolutionDate * 1000).toLocaleString()}`);
      
      // Create market transaction
      const tx = await this.program.methods
        .createMarket(
          polymarketData.question,
          polymarketData.question, // Use question as description for now
          polymarketData.category || 'general',
          options,
          new BN(resolutionDate),
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
      
      // Save to backend database
      await this.saveMarketToDatabase(polymarketData, marketKeypair.publicKey.toString());
      
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

  async saveMarketToDatabase(polymarketData, solanaMarketAddress) {
    try {
      const response = await axios.post(`${BACKEND_API}/markets/create-from-poly/${polymarketData.poly_id}`, {
        solanaMarketAddress
      });
      console.log('💾 Saved to database');
    } catch (error) {
      console.error('⚠️  Failed to save to database:', error.message);
    }
  }

  async createBatchMarkets(markets, limit = 5) {
    console.log(`\n📦 Creating batch of ${Math.min(markets.length, limit)} markets...\n`);
    
    const results = {
      successful: [],
      failed: []
    };
    
    // Check existing markets
    const existingMarkets = await this.checkExistingMarkets();
    
    // Filter out already created markets
    const newMarkets = markets.filter(market => !existingMarkets[market.poly_id]);
    console.log(`📊 ${markets.length - newMarkets.length} markets already exist on Solana`);
    
    if (newMarkets.length === 0) {
      console.log('✅ All markets are already created!');
      return results;
    }
    
    // Process markets
    const marketsToCreate = newMarkets.slice(0, limit);
    
    for (let i = 0; i < marketsToCreate.length; i++) {
      const market = marketsToCreate[i];
      console.log(`\n[${i + 1}/${marketsToCreate.length}] Processing...`);
      
      const result = await this.createMarket(market);
      
      if (result.success) {
        results.successful.push({
          ...market,
          solanaAddress: result.marketAddress,
          transaction: result.transaction
        });
      } else {
        results.failed.push({
          ...market,
          error: result.error
        });
      }
      
      // Small delay between creations
      if (i < marketsToCreate.length - 1) {
        console.log('⏳ Waiting 2 seconds before next market...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}

async function main() {
  console.log('🎯 Solana Market Creation from Polymarket Pipeline\n');
  
  const creator = new SolanaMarketCreator();
  
  try {
    // Initialize
    await creator.initialize();
    
    // Fetch markets
    const markets = await creator.fetchValidatedMarkets();
    
    if (markets.length === 0) {
      console.log('\n❌ No markets available to create');
      return;
    }
    
    // Show market summary
    console.log('\n📊 Market Summary:');
    const byCategory = {};
    markets.forEach(m => {
      const cat = m.category || 'general';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} markets`);
    });
    
    // Create markets (limit to 5 for testing)
    const results = await creator.createBatchMarkets(markets, 5);
    
    // Summary
    console.log('\n📈 CREATION SUMMARY:');
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Created Markets:');
      results.successful.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Address: ${market.solanaAddress}`);
        console.log(`   TX: ${market.transaction}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Markets:');
      results.failed.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`);
        console.log(`   Error: ${market.error}`);
      });
    }
    
    console.log('\n✨ Market creation complete!');
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
  }
}

// Command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scripts/create-solana-markets.js [options]

Options:
  --help    Show this help message
  --dry-run Test without creating markets

Environment Variables:
  VITE_SOLANA_RPC_URL      Solana RPC endpoint
  VITE_PROGRAM_ID          Market program ID
  VITE_APES_TOKEN_MINT     APES token mint address
  SOLANA_WALLET_PATH       Path to wallet keypair JSON
`);
  process.exit(0);
}

// Run the script
main().catch(console.error); 