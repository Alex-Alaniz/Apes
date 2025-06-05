import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN, setProvider, Wallet } = anchorPkg;
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccount, transfer } from '@solana/spl-token';
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

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

// Test wallet - you can replace this with your own test wallet
const testWallet = Keypair.generate();

async function createMarket() {
  const provider = new AnchorProvider(connection, new Wallet(authorityKeypair), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('\n📍 Creating new market...');
  
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
  
  // Convert strings to byte arrays
  const stringToBytes = (str, maxLength) => {
    const bytes = new Uint8Array(maxLength);
    const encoded = new TextEncoder().encode(str.substring(0, maxLength));
    bytes.set(encoded);
    return Array.from(bytes);
  };
  
  const question = "Will Bitcoin reach $100k by end of 2024?";
  const options = ["Yes", "No"];
  
  const tx = await program.methods
    .createMarket(
      { binary: {} },
      stringToBytes(question, 200),
      question.length,
      stringToBytes(options[0], 50),
      stringToBytes(options[1], 50),
      stringToBytes('', 50),
      stringToBytes('', 50),
      2, // 2 options
      new BN(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
      new BN(100), // 1% creator fee
      new BN(1_000_000), // 1 APES min bet
      stringToBytes(`test_btc_${Date.now()}`, 32),
      15,
      new BN(5_000_000), // 5 APES stake
      stringToBytes('Crypto', 20),
      6
    )
    .accounts({
      market: market.publicKey,
      platformState,
      creator: authorityKeypair.publicKey,
      creatorTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, authorityKeypair.publicKey),
      marketEscrow,
      burnTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
      ),
      tokenMint: TOKEN_MINT,
      accessControl,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([market])
    .rpc();
  
  console.log('✅ Market created:', market.publicKey.toString());
  return market.publicKey;
}

async function placeBetsFromAuthority(marketPubkey) {
  const provider = new AnchorProvider(connection, new Wallet(authorityKeypair), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('\n📍 Placing bets from authority wallet...');
  
  const market = new PublicKey(marketPubkey);
  
  // PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  
  const platformStateAccount = await program.account.platformState.fetch(platformState);
  
  const [marketEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("market_escrow"), market.toBuffer()],
    PROGRAM_ID
  );
  
  // Bet on Yes (option 0)
  const [prediction0] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), market.toBuffer(), authorityKeypair.publicKey.toBuffer(), Buffer.from([0])],
    PROGRAM_ID
  );
  
  const tx1 = await program.methods
    .placePrediction(0, new BN(10_000_000)) // 10 APES on Yes
    .accounts({
      market,
      platformState,
      user: authorityKeypair.publicKey,
      userTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, authorityKeypair.publicKey),
      marketEscrow,
      burnTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
      ),
      treasuryTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        platformStateAccount.treasury
      ),
      prediction: prediction0,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  
  console.log('✅ Bet placed on Yes (option 0):', tx1);
  
  // Bet on No (option 1)
  const [prediction1] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), market.toBuffer(), authorityKeypair.publicKey.toBuffer(), Buffer.from([1])],
    PROGRAM_ID
  );
  
  const tx2 = await program.methods
    .placePrediction(1, new BN(5_000_000)) // 5 APES on No
    .accounts({
      market,
      platformState,
      user: authorityKeypair.publicKey,
      userTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, authorityKeypair.publicKey),
      marketEscrow,
      burnTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
      ),
      treasuryTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        platformStateAccount.treasury
      ),
      prediction: prediction1,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  
  console.log('✅ Bet placed on No (option 1):', tx2);
}

async function resolveMarket(marketPubkey, winningOption) {
  const provider = new AnchorProvider(connection, new Wallet(authorityKeypair), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log(`\n📍 Resolving market with winning option ${winningOption} (${winningOption === 0 ? 'Yes' : 'No'})...`);
  
  const tx = await program.methods
    .resolveMarket(winningOption)
    .accounts({
      market: new PublicKey(marketPubkey),
      resolver: authorityKeypair.publicKey,
    })
    .rpc();
  
  console.log('✅ Market resolved:', tx);
}

async function checkAndDisplayMarket(marketPubkey) {
  const provider = new AnchorProvider(connection, new Wallet(authorityKeypair), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('\n📊 Market Status:');
  
  const market = new PublicKey(marketPubkey);
  const marketAccount = await program.account.market.fetch(market);
  
  console.log('Status:', marketAccount.status);
  console.log('Winning option:', marketAccount.winningOption);
  console.log('Option 0 (Yes) pool:', marketAccount.option1Pool.toNumber() / 1_000_000, 'APES');
  console.log('Option 1 (No) pool:', marketAccount.option2Pool.toNumber() / 1_000_000, 'APES');
  console.log('Total pool:', marketAccount.totalPool.toNumber() / 1_000_000, 'APES');
}

async function checkPositions(marketPubkey) {
  const provider = new AnchorProvider(connection, new Wallet(authorityKeypair), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('\n📋 Authority Wallet Positions:');
  
  const market = new PublicKey(marketPubkey);
  
  // Check both positions
  for (let i = 0; i < 2; i++) {
    const [prediction] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction"), market.toBuffer(), authorityKeypair.publicKey.toBuffer(), Buffer.from([i])],
      PROGRAM_ID
    );
    
    try {
      const predictionAccount = await program.account.prediction.fetch(prediction);
      console.log(`\nOption ${i} (${i === 0 ? 'Yes' : 'No'}):`);
      console.log('  Amount:', predictionAccount.amount.toNumber() / 1_000_000, 'APES');
      console.log('  Claimed:', predictionAccount.claimed);
    } catch (e) {
      console.log(`\nOption ${i}: No position`);
    }
  }
}

async function runTest() {
  try {
    console.log('\n=== Simple Claim Flow Test ===');
    console.log('Authority wallet:', authorityKeypair.publicKey.toString());
    
    // Step 1: Create market
    const marketPubkey = await createMarket();
    
    // Step 2: Place bets
    await placeBetsFromAuthority(marketPubkey);
    
    // Step 3: Check market before resolution
    await checkAndDisplayMarket(marketPubkey);
    
    // Step 4: Resolve market (Yes wins)
    await resolveMarket(marketPubkey, 0);
    
    // Step 5: Check market after resolution
    await checkAndDisplayMarket(marketPubkey);
    
    // Step 6: Check positions
    await checkPositions(marketPubkey);
    
    console.log('\n✅ Test complete!');
    console.log('\nMarket URL: http://localhost:3000/market/' + marketPubkey.toString());
    console.log('\nNow you can:');
    console.log('1. Visit the market page to see the resolved status');
    console.log('2. Go to your profile page to see your positions');
    console.log('3. Test claiming the winning position (Yes)');
    console.log('4. Verify that the losing position (No) cannot be claimed');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest(); 