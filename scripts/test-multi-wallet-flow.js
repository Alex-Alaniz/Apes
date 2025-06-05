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

// Load authority wallet from DEPLOYER_PRIVATE_KEY
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

// Generate test wallets
const testWallet1 = Keypair.generate();
const testWallet2 = Keypair.generate();
const testWallet3 = Keypair.generate();

console.log('Test Wallets:');
console.log('Wallet 1:', testWallet1.publicKey.toString());
console.log('Wallet 2:', testWallet2.publicKey.toString());
console.log('Wallet 3:', testWallet3.publicKey.toString());

async function airdropSol(wallet, amount = 1) {
  console.log(`\nAirdropping ${amount} SOL to ${wallet.publicKey.toString()}...`);
  try {
    const sig = await connection.requestAirdrop(wallet.publicKey, amount * 1e9);
    await connection.confirmTransaction(sig);
    console.log('✅ Airdrop complete');
  } catch (error) {
    console.log('❌ Airdrop failed:', error.message);
    console.log('   You may need to use https://faucet.solana.com or fund manually');
    throw error;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function transferTokens(fromWallet, toWallet, amount) {
  try {
    // Get or create token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, fromWallet.publicKey);
    let toTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, toWallet);
    
    // Check if recipient token account exists
    const accountInfo = await connection.getAccountInfo(toTokenAccount);
    if (!accountInfo) {
      console.log('Creating token account for recipient...');
      await createAssociatedTokenAccount(
        connection,
        fromWallet,
        TOKEN_MINT,
        toWallet
      );
    }
    
    // Transfer tokens
    console.log(`Transferring ${amount / 1_000_000} APES to ${toWallet.toString()}...`);
    const sig = await transfer(
      connection,
      fromWallet,
      fromTokenAccount,
      toTokenAccount,
      fromWallet.publicKey,
      amount
    );
    await connection.confirmTransaction(sig);
    console.log('✅ Transfer complete');
  } catch (error) {
    console.error('Transfer error:', error);
    throw error;
  }
}

async function createMarket(wallet) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log('\n📍 Creating new market...');
  
  // Generate new market keypair
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
  
  const question = "Who will win the 2025 NBA Championship?";
  const options = ["Los Angeles Lakers", "Boston Celtics", "Golden State Warriors"];
  
  const tx = await program.methods
    .createMarket(
      { multiOption: {} },
      stringToBytes(question, 200),
      question.length,
      stringToBytes(options[0], 50),
      stringToBytes(options[1], 50),
      stringToBytes(options[2], 50),
      stringToBytes('', 50),
      3, // 3 options
      new BN(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
      new BN(100), // 1% creator fee
      new BN(1_000_000), // 1 APES min bet
      stringToBytes(`test_market_${Date.now()}`, 32),
      20,
      new BN(10_000_000), // 10 APES stake
      stringToBytes('Sports', 20),
      6
    )
    .accounts({
      market: market.publicKey,
      platformState,
      creator: wallet.publicKey,
      creatorTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey),
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
  console.log('Transaction:', tx);
  
  return market.publicKey;
}

async function placeBet(wallet, marketPubkey, optionIndex, amount) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log(`\n📍 Wallet ${wallet.publicKey.toString().slice(0, 8)}... betting ${amount / 1_000_000} APES on option ${optionIndex}`);
  
  const market = new PublicKey(marketPubkey);
  
  // PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  
  // Fetch platform state to get treasury
  const platformStateAccount = await program.account.platformState.fetch(platformState);
  
  const [marketEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("market_escrow"), market.toBuffer()],
    PROGRAM_ID
  );
  
  const [prediction] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([optionIndex])],
    PROGRAM_ID
  );
  
  const tx = await program.methods
    .placePrediction(optionIndex, new BN(amount))
    .accounts({
      market,
      platformState,
      user: wallet.publicKey,
      userTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey),
      marketEscrow,
      burnTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
      ),
      treasuryTokenAccount: await getAssociatedTokenAddress(
        TOKEN_MINT,
        platformStateAccount.treasury
      ),
      prediction,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  
  console.log('✅ Bet placed:', tx);
}

async function resolveMarket(wallet, marketPubkey, winningOption) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log(`\n📍 Resolving market with winning option ${winningOption}...`);
  
  const tx = await program.methods
    .resolveMarket(winningOption)
    .accounts({
      market: new PublicKey(marketPubkey),
      resolver: wallet.publicKey,
    })
    .rpc();
  
  console.log('✅ Market resolved:', tx);
}

async function claimReward(wallet, marketPubkey, optionIndex) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl, provider);
  
  console.log(`\n📍 Wallet ${wallet.publicKey.toString().slice(0, 8)}... claiming rewards for option ${optionIndex}...`);
  
  const market = new PublicKey(marketPubkey);
  const marketAccount = await program.account.market.fetch(market);
  
  // PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  
  const [marketEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("market_escrow"), market.toBuffer()],
    PROGRAM_ID
  );
  
  const [prediction] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), market.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([optionIndex])],
    PROGRAM_ID
  );
  
  // Get balance before
  const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
  const balanceBefore = await connection.getTokenAccountBalance(userTokenAccount);
  
  try {
    const tx = await program.methods
      .claimReward(optionIndex)
      .accounts({
        market,
        platformState,
        prediction,
        user: wallet.publicKey,
        userTokenAccount,
        marketEscrow,
        creatorTokenAccount: await getAssociatedTokenAddress(TOKEN_MINT, marketAccount.creator),
        burnTokenAccount: await getAssociatedTokenAddress(
          TOKEN_MINT,
          new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    // Get balance after
    const balanceAfter = await connection.getTokenAccountBalance(userTokenAccount);
    const reward = balanceAfter.value.uiAmount - balanceBefore.value.uiAmount;
    
    console.log('✅ Reward claimed:', tx);
    console.log('   Reward amount:', reward, 'APES');
  } catch (error) {
    console.log('❌ Claim failed:', error.message);
  }
}

async function runTest() {
  try {
    console.log('\n=== Multi-Wallet Test Flow ===\n');
    
    // Step 1: Airdrop SOL to test wallets with delays
    console.log('Step 1: Airdropping SOL to test wallets...');
    try {
      await airdropSol(testWallet1, 0.5);  // Request less SOL
      await delay(2000);  // Wait 2 seconds
      await airdropSol(testWallet2, 0.5);
      await delay(2000);
      await airdropSol(testWallet3, 0.5);
    } catch (error) {
      console.log('\n⚠️  Airdrop failed. Continuing with existing SOL...');
      console.log('   Please fund these wallets manually if needed:');
      console.log('   Wallet 1:', testWallet1.publicKey.toString());
      console.log('   Wallet 2:', testWallet2.publicKey.toString());
      console.log('   Wallet 3:', testWallet3.publicKey.toString());
    }
    
    // Step 2: Transfer APES tokens to test wallets
    console.log('\nStep 2: Transferring APES tokens to test wallets...');
    await transferTokens(authorityKeypair, testWallet1.publicKey, 5_000_000); // 5 APES
    await transferTokens(authorityKeypair, testWallet2.publicKey, 10_000_000); // 10 APES
    await transferTokens(authorityKeypair, testWallet3.publicKey, 15_000_000); // 15 APES
    
    // Step 3: Create a new market
    console.log('\nStep 3: Creating new market...');
    const marketPubkey = await createMarket(authorityKeypair);
    
    // Step 4: Place bets from different wallets
    console.log('\nStep 4: Placing bets from different wallets...');
    await placeBet(testWallet1, marketPubkey, 0, 3_000_000); // Wallet 1 bets 3 APES on Lakers
    await placeBet(testWallet2, marketPubkey, 0, 5_000_000); // Wallet 2 bets 5 APES on Lakers
    await placeBet(testWallet3, marketPubkey, 1, 10_000_000); // Wallet 3 bets 10 APES on Celtics
    await placeBet(testWallet2, marketPubkey, 2, 4_000_000); // Wallet 2 also bets 4 APES on Warriors
    
    // Step 5: Resolve the market (Lakers win - option 0)
    console.log('\nStep 5: Resolving market (Lakers win - option 0)...');
    await resolveMarket(authorityKeypair, marketPubkey, 0);
    
    // Step 6: Winners claim rewards
    console.log('\nStep 6: Winners claiming rewards...');
    await claimReward(testWallet1, marketPubkey, 0); // Should succeed
    await claimReward(testWallet2, marketPubkey, 0); // Should succeed
    
    // Step 7: Losers try to claim (should fail)
    console.log('\nStep 7: Testing losing claims (should fail)...');
    await claimReward(testWallet3, marketPubkey, 1); // Should fail - losing bet
    await claimReward(testWallet2, marketPubkey, 2); // Should fail - losing bet
    
    // Step 8: Try to claim again (should fail)
    console.log('\nStep 8: Testing double claim (should fail)...');
    await claimReward(testWallet1, marketPubkey, 0); // Should fail - already claimed
    
    console.log('\n✅ Test complete! Market pubkey:', marketPubkey.toString());
    console.log('\nYou can now test the frontend with these wallets:');
    console.log('Wallet 1 (winner):', bs58.encode(testWallet1.secretKey));
    console.log('Wallet 2 (winner + loser):', bs58.encode(testWallet2.secretKey));
    console.log('Wallet 3 (loser):', bs58.encode(testWallet3.secretKey));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest(); 