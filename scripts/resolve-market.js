import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, setProvider, Wallet } = anchorPkg;
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Load wallet from DEPLOYER_PRIVATE_KEY
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not found in .env file');
}
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

// Market to resolve - our Super Bowl market
const MARKET_PUBKEY = 'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My';

async function resolveMarket() {
  // Create wallet adapter
  const wallet = new Wallet(keypair);
  
  // Create provider
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
  
  setProvider(provider);
  
  const program = new Program(idl, provider);
  
  console.log('Resolving market...');
  console.log('Wallet:', wallet.publicKey.toString());
  console.log('Market:', MARKET_PUBKEY);
  
  try {
    const market = new PublicKey(MARKET_PUBKEY);
    
    // Fetch market to see current state
    const marketAccount = await program.account.market.fetch(market);
    
    console.log('\nMarket Details:');
    console.log('Status:', marketAccount.status);
    console.log('Authority:', marketAccount.authority.toString());
    console.log('Options:');
    console.log('  0. Kansas City Chiefs - Pool:', marketAccount.option1Pool.toString());
    console.log('  1. Buffalo Bills - Pool:', marketAccount.option2Pool.toString());
    console.log('  2. San Francisco 49ers - Pool:', marketAccount.option3Pool.toString());
    console.log('  3. Philadelphia Eagles - Pool:', marketAccount.option4Pool.toString());
    console.log('Total Pool:', marketAccount.totalPool.toString());
    
    // Check if we're the authority
    if (!marketAccount.authority.equals(wallet.publicKey)) {
      console.error('❌ You are not the authority for this market!');
      console.error('Authority:', marketAccount.authority.toString());
      console.error('Your wallet:', wallet.publicKey.toString());
      return;
    }
    
    // Choose winning option (0-indexed)
    const winningOption = 0; // Kansas City Chiefs wins!
    
    console.log(`\n📍 Resolving market with winning option: ${winningOption} (Kansas City Chiefs)`);
    
    // Resolve market
    const tx = await program.methods
      .resolveMarket(winningOption)
      .accounts({
        market,
        resolver: wallet.publicKey,
      })
      .rpc();
    
    console.log('\n✅ Market resolved successfully!');
    console.log('Transaction:', tx);
    console.log('Winning option:', winningOption, '(Kansas City Chiefs)');
    console.log('\nWinners can now claim their rewards!');
    
    // Fetch updated market state
    const updatedMarket = await program.account.market.fetch(market);
    console.log('\nUpdated market status:', updatedMarket.status);
    console.log('Winning option:', updatedMarket.winningOption);
    
  } catch (error) {
    console.error('Error:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

resolveMarket(); 