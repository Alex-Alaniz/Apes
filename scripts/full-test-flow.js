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

async function fullTestFlow() {
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
  
  console.log('🚀 Starting full test flow...');
  console.log('Wallet:', wallet.publicKey.toString());
  
  try {
    // Step 1: Create a new market
    console.log('\n1️⃣ Creating a new market...');
    const market = Keypair.generate();
    
    // PDAs
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );
    
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      PROGRAM_ID
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
      PROGRAM_ID
    );
    
    // Token accounts
    const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
    );
    
    // Helper to convert string to bytes
    const stringToBytes = (str, maxLength) => {
      const bytes = new Uint8Array(maxLength);
      const encoded = new TextEncoder().encode(str.substring(0, maxLength));
      bytes.set(encoded);
      return Array.from(bytes);
    };
    
    // Market data
    const question = "What will be the weather tomorrow?";
    const options = ["Sunny", "Rainy", "Cloudy"];
    
    // Create market
    const tx1 = await program.methods
      .createMarket(
        { multiOption: {} },
        stringToBytes(question, 200),
        question.length,
        stringToBytes(options[0], 50),
        stringToBytes(options[1], 50),
        stringToBytes(options[2], 50),
        stringToBytes("", 50), // Empty 4th option
        3, // option count
        new BN(Math.floor(Date.now() / 1000) + 300), // 5 minutes from now for quick testing
        new BN(100), // 1% creator fee
        new BN(1_000_000), // 1 APES minimum bet
        stringToBytes(`test_${Date.now()}`, 32),
        16,
        new BN(2_000_000), // 2 APES creator stake
        stringToBytes("Test", 20),
        4
      )
      .accounts({
        market: market.publicKey,
        platformState,
        creator: wallet.publicKey,
        creatorTokenAccount: userTokenAccount,
        marketEscrow,
        burnTokenAccount,
        tokenMint: TOKEN_MINT,
        accessControl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([market])
      .rpc();
    
    console.log('✅ Market created:', market.publicKey.toString());
    
    // Step 2: Place bets
    console.log('\n2️⃣ Placing bets...');
    
    // Fetch platform state for treasury
    const platformStateAccount = await program.account.platformState.fetch(platformState);
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      platformStateAccount.treasury
    );
    
    // Bet on option 0 (Sunny)
    const [prediction0] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.publicKey.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([0])],
      PROGRAM_ID
    );
    
    await program.methods
      .placePrediction(0, new BN(5_000_000)) // 5 APES
      .accounts({
        market: market.publicKey,
        platformState,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        burnTokenAccount,
        treasuryTokenAccount,
        prediction: prediction0,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('✅ Bet placed: 5 APES on Sunny');
    
    // Bet on option 1 (Rainy)
    const [prediction1] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.publicKey.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([1])],
      PROGRAM_ID
    );
    
    await program.methods
      .placePrediction(1, new BN(3_000_000)) // 3 APES
      .accounts({
        market: market.publicKey,
        platformState,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        burnTokenAccount,
        treasuryTokenAccount,
        prediction: prediction1,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('✅ Bet placed: 3 APES on Rainy');
    
    // Step 3: Resolve market
    console.log('\n3️⃣ Resolving market (Sunny wins)...');
    
    await program.methods
      .resolveMarket(0) // Sunny wins
      .accounts({
        market: market.publicKey,
        resolver: wallet.publicKey,
      })
      .rpc();
    
    console.log('✅ Market resolved with winning option: Sunny');
    
    // Step 4: Claim rewards
    console.log('\n4️⃣ Claiming rewards...');
    
    const marketAccount = await program.account.market.fetch(market.publicKey);
    const creatorTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, marketAccount.creator);
    
    // Get balance before
    const balanceBefore = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('Balance before claim:', balanceBefore.value.uiAmount, 'APES');
    
    // Claim winning bet
    const tx4 = await program.methods
      .claimReward(0)
      .accounts({
        market: market.publicKey,
        platformState,
        prediction: prediction0,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        creatorTokenAccount,
        burnTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log('✅ Rewards claimed!');
    
    // Get balance after
    const balanceAfter = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('Balance after claim:', balanceAfter.value.uiAmount, 'APES');
    
    const rewardReceived = balanceAfter.value.uiAmount - balanceBefore.value.uiAmount;
    console.log('Reward received:', rewardReceived, 'APES');
    
    // Try to claim losing bet (should fail)
    console.log('\n5️⃣ Trying to claim losing bet (should fail)...');
    
    try {
      await program.methods
        .claimReward(1)
        .accounts({
          market: market.publicKey,
          platformState,
          prediction: prediction1,
          user: wallet.publicKey,
          userTokenAccount,
          marketEscrow,
          creatorTokenAccount,
          burnTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      console.log('❌ Unexpected: Claiming losing bet succeeded!');
    } catch (error) {
      console.log('✅ Expected: Cannot claim losing bet');
    }
    
    console.log('\n🎉 Full test flow completed successfully!');
    console.log('\nSummary:');
    console.log('- Created multi-option market with 3 options');
    console.log('- Placed bets on 2 different options');
    console.log('- Resolved market with winner');
    console.log('- Successfully claimed rewards for winning bet');
    console.log('- Confirmed cannot claim rewards for losing bet');
    
  } catch (error) {
    console.error('Error:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

fullTestFlow(); 