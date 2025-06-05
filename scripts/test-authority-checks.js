import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN, setProvider, Wallet } = anchorPkg;
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Load authority wallet
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not found in .env file');
}
const authorityKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Generate a random attacker wallet
const attackerKeypair = Keypair.generate();

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

// Test market for authority checks
const testMarketPubkey = new PublicKey('2vJreEwmcHisSqeXpPPcmgupddiMTLRpXo87baimWJQV');

async function testAuthorityChecks() {
  console.log('🔐 Testing Authority Checks\n');
  console.log('Authority:', authorityKeypair.publicKey.toString());
  console.log('Attacker:', attackerKeypair.publicKey.toString());
  console.log('Test Market:', testMarketPubkey.toString());
  console.log('\n' + '='.repeat(60) + '\n');

  // Test 1: Try to resolve market with unauthorized wallet
  console.log('Test 1: Unauthorized resolve attempt');
  try {
    const attackerProvider = new AnchorProvider(
      connection,
      new Wallet(attackerKeypair),
      { commitment: 'confirmed' }
    );
    const attackerProgram = new Program(idl, attackerProvider);
    
    await attackerProgram.methods
      .resolveMarket(0) // Try to resolve with option 0
      .accounts({
        market: testMarketPubkey,
        resolver: attackerKeypair.publicKey,
      })
      .signers([attackerKeypair])
      .rpc();
    
    console.log('❌ FAIL: Unauthorized user was able to resolve market!');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      console.log('✅ PASS: Unauthorized resolve correctly rejected');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.message);
      process.exit(1);
    }
  }

  // Test 2: Try to cancel market with unauthorized wallet
  console.log('\nTest 2: Unauthorized cancel attempt');
  try {
    const attackerProvider = new AnchorProvider(
      connection,
      new Wallet(attackerKeypair),
      { commitment: 'confirmed' }
    );
    const attackerProgram = new Program(idl, attackerProvider);
    
    await attackerProgram.methods
      .cancelMarket()
      .accounts({
        market: testMarketPubkey,
        authority: attackerKeypair.publicKey,
      })
      .signers([attackerKeypair])
      .rpc();
    
    console.log('❌ FAIL: Unauthorized user was able to cancel market!');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('A seeds constraint was violated')) {
      console.log('✅ PASS: Unauthorized cancel correctly rejected');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.message);
      process.exit(1);
    }
  }

  // Test 3: Verify authority can resolve (without actually doing it)
  console.log('\nTest 3: Authority resolve check');
  try {
    const authorityProvider = new AnchorProvider(
      connection,
      new Wallet(authorityKeypair),
      { commitment: 'confirmed' }
    );
    const authorityProgram = new Program(idl, authorityProvider);
    
    // Get market data
    const market = await authorityProgram.account.market.fetch(testMarketPubkey);
    
    if (market.authority.toString() === authorityKeypair.publicKey.toString()) {
      console.log('✅ PASS: Authority matches expected wallet');
    } else {
      console.log('❌ FAIL: Market authority does not match');
      process.exit(1);
    }
    
    // Check market status
    console.log('Market Status:', Object.keys(market.status)[0]);
    console.log('Market Authority:', market.authority.toString());
    
  } catch (error) {
    console.log('❌ FAIL: Could not fetch market:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All authority checks passed!');
  console.log('Only authorized wallets can resolve/cancel markets.');
}

// Run tests
testAuthorityChecks().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 