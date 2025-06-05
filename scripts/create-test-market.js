#!/usr/bin/env node

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Configuration
const PROGRAM_ID = '3YKvue3bF7AjGm9J7P1q7cXKHfzfiMKXCNx4P9sdwBRA';
const RPC_URL = 'https://api.devnet.solana.com';
const TOKEN_DECIMALS = 6;

// Test market configurations
const TEST_MARKETS = [
  {
    question: "Will the Believe API burn exactly 1 APES token (not 1 million)?",
    options: ["Yes ✅", "No ❌"],
    endTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    minBet: 1,
    creatorFee: 2.5
  },
  {
    question: "Which burn amount is correct for predictions?",
    options: ["1 APES", "1,000,000 APES", "100 APES"],
    endTime: Date.now() + (48 * 60 * 60 * 1000), // 48 hours from now
    minBet: 1,
    creatorFee: 2.5
  },
  {
    question: "Is the browser cache cleared and using new code?",
    options: ["Yes, hard refreshed!", "No, still cached"],
    endTime: Date.now() + (12 * 60 * 60 * 1000), // 12 hours from now
    minBet: 0.5,
    creatorFee: 2.5
  }
];

async function createTestMarkets() {
  console.log('🔮 Creating Test Markets for Believe API Testing\n');
  
  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found at:', walletPath);
    console.log('Please run: solana-keygen new');
    return;
  }
  
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  console.log('Wallet:', walletKeypair.publicKey.toString());
  
  // Connect
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');
  
  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    console.log('Get devnet SOL: https://faucet.solana.com/');
    return;
  }
  
  console.log('📝 Markets to create:');
  TEST_MARKETS.forEach((market, i) => {
    console.log(`\n${i + 1}. ${market.question}`);
    console.log(`   Options: ${market.options.join(' | ')}`);
    console.log(`   Ends: ${new Date(market.endTime).toLocaleString()}`);
    console.log(`   Min bet: ${market.minBet} APES`);
  });
  
  console.log('\n⚠️  IMPORTANT: This will create markets on DEVNET');
  console.log('Make sure your frontend is connected to DEVNET!');
  console.log('\nTo create markets:');
  console.log('1. Go to http://localhost:3000/admin');
  console.log('2. Make sure you\'re connected with an authorized wallet');
  console.log('3. Click "Create Market" and use the details above');
  console.log('\nOr use the Create Market page directly if you have access.');
  
  console.log('\n🔥 When testing predictions on these markets:');
  console.log('- Check browser console for burn logs');
  console.log('- Look for "burnAmount": 1 (not 1000000)');
  console.log('- Verify in Believe dashboard that 1 APES was burned');
}

// Alternative: Quick test market data generator
function generateTestMarketData() {
  const market = TEST_MARKETS[0]; // Use first test market
  const endDate = new Date(market.endTime);
  
  console.log('\n📋 Copy this data for Create Market form:\n');
  console.log('Question:', market.question);
  console.log('Option 1:', market.options[0]);
  console.log('Option 2:', market.options[1]);
  console.log('End Date:', endDate.toISOString().split('T')[0]);
  console.log('End Time:', endDate.toTimeString().split(' ')[0].slice(0, 5));
  console.log('Min Bet:', market.minBet);
  console.log('Creator Fee:', market.creatorFee);
  console.log('Category: Testing');
  
  console.log('\n✅ After creating, place a test bet and check:');
  console.log('1. Browser console for: 🔥 Believe burn successful: 1 tokens burned');
  console.log('2. Network tab for request with burnAmount: 1');
  console.log('3. Believe dashboard for 1 APES burn (not 1,000,000)');
}

// Run
if (require.main === module) {
  createTestMarkets().then(() => {
    generateTestMarketData();
  }).catch(console.error);
} 