import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, setProvider, Wallet } = anchorPkg;
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
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
const TOKEN_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

// Market to claim from
const MARKET_PUBKEY = 'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My';

async function claimRewards() {
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
  
  console.log('Claiming rewards...');
  console.log('Wallet:', wallet.publicKey.toString());
  console.log('Market:', MARKET_PUBKEY);
  
  try {
    const market = new PublicKey(MARKET_PUBKEY);
    
    // Fetch market to see state
    const marketAccount = await program.account.market.fetch(market);
    
    console.log('\nMarket Details:');
    console.log('Status:', marketAccount.status);
    console.log('Winning option:', marketAccount.winningOption, '(Kansas City Chiefs)');
    console.log('Total pool:', marketAccount.totalPool.toString());
    
    // Get platform state
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.toBuffer()],
      PROGRAM_ID
    );
    
    // Try to claim for our winning bet (option 0 - Kansas City Chiefs)
    const winningOptionIndex = 0;
    console.log(`\n📍 Attempting to claim rewards for option ${winningOptionIndex} (Kansas City Chiefs)...`);
    
    const [prediction] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([winningOptionIndex])],
      PROGRAM_ID
    );
    
    // Check if prediction exists and is not claimed
    try {
      const predictionAccount = await program.account.prediction.fetch(prediction);
      console.log('\nYour winning prediction:');
      console.log('Option:', predictionAccount.optionIndex);
      console.log('Amount bet:', predictionAccount.amount.toNumber() / 1_000_000, 'APES');
      console.log('Already claimed:', predictionAccount.claimed);
      
      if (predictionAccount.claimed) {
        console.log('❌ This reward has already been claimed!');
        return;
      }
      
      // Calculate expected reward
      const winningPool = marketAccount.option1Pool;
      const totalPool = marketAccount.totalPool;
      const userShare = predictionAccount.amount.toNumber() / winningPool.toNumber();
      const grossReward = userShare * totalPool.toNumber();
      const netReward = grossReward * 0.975 * 0.99; // After 2.5% platform fee and 1% creator fee
      
      console.log('\nExpected reward calculation:');
      console.log('Winning pool:', winningPool.toNumber() / 1_000_000, 'APES');
      console.log('Your share:', (userShare * 100).toFixed(2), '%');
      console.log('Expected reward:', (netReward / 1_000_000).toFixed(2), 'APES');
      
      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
      const creatorTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, marketAccount.creator);
      const burnTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
      );
      
      // Claim reward
      const tx = await program.methods
        .claimReward(winningOptionIndex)
        .accounts({
          market,
          platformState,
          prediction,
          user: wallet.publicKey,
          userTokenAccount,
          marketEscrow,
          creatorTokenAccount,
          burnTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      console.log('\n✅ Rewards claimed successfully!');
      console.log('Transaction:', tx);
      
    } catch (predictionError) {
      console.log('No winning prediction found for option', winningOptionIndex);
    }
    
    // Try to claim for our losing bet (option 2 - San Francisco 49ers) - this should fail
    console.log('\n📍 Attempting to claim for losing option 2 (San Francisco 49ers) - this should fail...');
    const losingOptionIndex = 2;
    const [losingPrediction] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([losingOptionIndex])],
      PROGRAM_ID
    );
    
    try {
      const losingPredictionAccount = await program.account.prediction.fetch(losingPrediction);
      console.log('Found losing prediction - amount:', losingPredictionAccount.amount.toNumber() / 1_000_000, 'APES');
      
      // This should fail
      await program.methods
        .claimReward(losingOptionIndex)
        .accounts({
          market,
          platformState,
          prediction: losingPrediction,
          user: wallet.publicKey,
          userTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey),
          marketEscrow,
          creatorTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, marketAccount.creator),
          burnTokenAccount: await getAssociatedTokenAddress(
            TOKEN_MINT,
            new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
        
      console.log('❌ Unexpected: Claiming for losing option succeeded!');
    } catch (error) {
      console.log('✅ Expected error: Cannot claim rewards for losing option');
      if (error.logs) {
        const errorLog = error.logs.find(log => log.includes('NotWinner'));
        if (errorLog) {
          console.log('Error:', errorLog);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

claimRewards(); 