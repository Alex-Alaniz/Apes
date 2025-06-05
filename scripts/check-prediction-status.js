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

// Market to check
const MARKET_PUBKEY = 'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My';

async function checkPredictions() {
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
  
  console.log('Checking prediction status...');
  console.log('Wallet:', wallet.publicKey.toString());
  console.log('Market:', MARKET_PUBKEY);
  
  try {
    const market = new PublicKey(MARKET_PUBKEY);
    
    // Fetch market
    const marketAccount = await program.account.market.fetch(market);
    console.log('\nMarket status:', marketAccount.status);
    console.log('Winning option:', marketAccount.winningOption);
    
    // Check all 4 possible predictions
    console.log('\nYour predictions:');
    for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
      const [prediction] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([optionIndex])],
        PROGRAM_ID
      );
      
      try {
        const predictionAccount = await program.account.prediction.fetch(prediction);
        const isWinner = marketAccount.winningOption === optionIndex;
        
        console.log(`\nOption ${optionIndex}:`, getOptionName(optionIndex));
        console.log('  Amount bet:', predictionAccount.amount.toNumber() / 1_000_000, 'APES');
        console.log('  Claimed:', predictionAccount.claimed);
        console.log('  Status:', isWinner ? '✅ WINNER' : '❌ LOST');
        
        if (isWinner && predictionAccount.claimed) {
          console.log('  💰 Rewards already claimed!');
        } else if (isWinner && !predictionAccount.claimed) {
          console.log('  💎 Rewards available to claim!');
        }
      } catch (e) {
        // No prediction for this option
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function getOptionName(index) {
  const options = [
    'Kansas City Chiefs',
    'Buffalo Bills',
    'San Francisco 49ers',
    'Philadelphia Eagles'
  ];
  return options[index] || `Option ${index}`;
}

checkPredictions(); 