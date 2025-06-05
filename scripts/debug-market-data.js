import { Connection, PublicKey } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, setProvider, Wallet } = anchorPkg;
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Load wallet
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

// Test markets
const marketIds = [
  '2vJreEwmcHisSqeXpPPcmgupddiMTLRpXo87baimWJQV', // Bitcoin market
  'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My'  // Super Bowl market
];

async function debugMarkets() {
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('Debugging market data...\n');
  
  for (const marketId of marketIds) {
    try {
      const market = new PublicKey(marketId);
      const marketAccount = await program.account.market.fetch(market);
      
      console.log(`\n=== Market: ${marketId} ===`);
      console.log('Status:', marketAccount.status);
      console.log('Winning option:', marketAccount.winningOption);
      console.log('Question:', String.fromCharCode(...marketAccount.question).replace(/\0/g, '').trim());
      
      // Parse options
      const options = [];
      if (marketAccount.option1) {
        options.push(String.fromCharCode(...marketAccount.option1).replace(/\0/g, '').trim());
      }
      if (marketAccount.option2) {
        options.push(String.fromCharCode(...marketAccount.option2).replace(/\0/g, '').trim());
      }
      if (marketAccount.option3 && marketAccount.optionCount > 2) {
        options.push(String.fromCharCode(...marketAccount.option3).replace(/\0/g, '').trim());
      }
      if (marketAccount.option4 && marketAccount.optionCount > 3) {
        options.push(String.fromCharCode(...marketAccount.option4).replace(/\0/g, '').trim());
      }
      
      console.log('Options:');
      options.forEach((opt, idx) => {
        const isWinner = marketAccount.winningOption === idx;
        console.log(`  ${idx}: ${opt} ${isWinner ? '✅ WINNER' : ''}`);
      });
      
      console.log('\nPools:');
      console.log('  Option 0 pool:', marketAccount.option1Pool.toNumber() / 1_000_000, 'APES');
      console.log('  Option 1 pool:', marketAccount.option2Pool.toNumber() / 1_000_000, 'APES');
      if (marketAccount.optionCount > 2) {
        console.log('  Option 2 pool:', marketAccount.option3Pool.toNumber() / 1_000_000, 'APES');
      }
      if (marketAccount.optionCount > 3) {
        console.log('  Option 3 pool:', marketAccount.option4Pool.toNumber() / 1_000_000, 'APES');
      }
      
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error.message);
    }
  }
}

debugMarkets(); 