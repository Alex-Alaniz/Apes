import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN, setProvider, Wallet } = anchorPkg;
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

// Market public key - replace with the market you want to bet on
const MARKET_PUBKEY = 'qJpxmrmsKqiBtvEnBTmEd7FF67R9wgDpWCn3Upoo5My'; // Our Super Bowl market

async function placeBet() {
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
  
  console.log('Placing bet on multi-option market...');
  console.log('Wallet:', wallet.publicKey.toString());
  console.log('Market:', MARKET_PUBKEY);
  
  try {
    const market = new PublicKey(MARKET_PUBKEY);
    
    // Fetch market to see options
    const marketAccount = await program.account.market.fetch(market);
    console.log('\nMarket options:');
    console.log('1. Kansas City Chiefs');
    console.log('2. Buffalo Bills');
    console.log('3. San Francisco 49ers');
    console.log('4. Philadelphia Eagles');
    
    // Choose option to bet on (0-indexed)
    const optionIndex = 0; // Betting on Kansas City Chiefs
    const betAmount = new BN(2_000_000); // 2 APES
    
    console.log(`\nBetting ${betAmount.toNumber() / 1_000_000} APES on option ${optionIndex + 1} (Kansas City Chiefs)`);
    
    // PDAs
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );
    
    // Fetch platform state to get treasury address
    const platformStateAccount = await program.account.platformState.fetch(platformState);
    console.log('Treasury:', platformStateAccount.treasury.toString());
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.toBuffer()],
      PROGRAM_ID
    );
    
    const [prediction] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([optionIndex])],
      PROGRAM_ID
    );
    
    // Token accounts
    const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
    );
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      platformStateAccount.treasury
    );
    
    // Place bet
    const tx = await program.methods
      .placePrediction(
        optionIndex,
        betAmount
      )
      .accounts({
        market,
        platformState,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        burnTokenAccount,
        treasuryTokenAccount,
        prediction,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('\n✅ Bet placed successfully!');
    console.log('Transaction:', tx);
    
    // Now let's bet on another option too
    console.log('\n📍 Placing another bet on option 3 (San Francisco 49ers)...');
    const optionIndex2 = 2; // San Francisco 49ers
    const betAmount2 = new BN(3_000_000); // 3 APES
    
    const [prediction2] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([optionIndex2])],
      PROGRAM_ID
    );
    
    const tx2 = await program.methods
      .placePrediction(
        optionIndex2,
        betAmount2
      )
      .accounts({
        market,
        platformState,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        burnTokenAccount,
        treasuryTokenAccount,
        prediction: prediction2,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('\n✅ Second bet placed successfully!');
    console.log('Transaction:', tx2);
    console.log('\nYou now have positions on 2 different options in the same market!');
    console.log('Check your profile page to see your positions.');
    
  } catch (error) {
    console.error('Error:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

placeBet(); 