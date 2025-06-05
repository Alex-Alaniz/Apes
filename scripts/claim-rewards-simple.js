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
    
    // Fetch market
    const marketAccount = await program.account.market.fetch(market);
    console.log('\nMarket winning option:', marketAccount.winningOption);
    
    // Get PDAs
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.toBuffer()],
      PROGRAM_ID
    );
    
    // Claim for winning option (0)
    const winningOptionIndex = 0;
    const [prediction] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([winningOptionIndex])],
      PROGRAM_ID
    );
    
    // Check prediction
    const predictionAccount = await program.account.prediction.fetch(prediction);
    console.log('\nPrediction details:');
    console.log('Amount:', predictionAccount.amount.toNumber() / 1_000_000, 'APES');
    console.log('Already claimed:', predictionAccount.claimed);
    
    if (predictionAccount.claimed) {
      console.log('\n❌ Rewards already claimed!');
      return;
    }
    
    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const creatorTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, marketAccount.creator);
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
    );
    
    console.log('\n📍 Claiming rewards...');
    
    // Get balance before
    const balanceBefore = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('Balance before:', balanceBefore.value.uiAmount, 'APES');
    
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
    
    console.log('\n✅ Transaction sent:', tx);
    
    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');
    
    // Get balance after
    const balanceAfter = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('Balance after:', balanceAfter.value.uiAmount, 'APES');
    
    const rewardReceived = balanceAfter.value.uiAmount - balanceBefore.value.uiAmount;
    console.log('Reward received:', rewardReceived, 'APES');
    
    // Check if prediction is now claimed
    const updatedPrediction = await program.account.prediction.fetch(prediction);
    console.log('\nPrediction now claimed:', updatedPrediction.claimed);
    
  } catch (error) {
    console.error('\n❌ Error claiming rewards:', error.message);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

claimRewards(); 