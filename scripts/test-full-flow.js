#!/usr/bin/env node

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('../src/config/networks.json');
const idl = require('../src/smart_contracts/market_system/target/idl/market_system.json');

const NETWORK = 'devnet';
const networkConfig = config[NETWORK];

async function testFullFlow() {
  console.log('\n🚀 Testing Full Market Flow on Devnet');
  console.log('=====================================\n');

  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Wallet: ${walletKeypair.publicKey.toString()}`);

  // Create connection
  const connection = new Connection(networkConfig.rpcUrl, 'confirmed');
  
  // Check balances
  const solBalance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

  // Check APES token balance
  const tokenMint = new PublicKey(networkConfig.tokenMint);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);
  
  try {
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
    console.log(`APES Balance: ${tokenBalance.value.uiAmount} APES\n`);
  } catch (error) {
    console.log('No APES token account found. You need to create one and get some tokens.\n');
  }

  // Create provider
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map((tx) => {
        tx.partialSign(walletKeypair);
        return tx;
      });
    },
  };

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Create program
  const programId = new PublicKey(networkConfig.programId);
  const program = new Program(idl, programId, provider);

  console.log('📋 Test Plan:');
  console.log('1. Initialize platform (if needed)');
  console.log('2. Create a test market');
  console.log('3. Place predictions');
  console.log('4. Resolve market');
  console.log('5. Claim rewards\n');

  // Step 1: Check if platform is initialized
  const [platformState] = await PublicKey.findProgramAddress(
    [Buffer.from('platform_state')],
    program.programId
  );

  try {
    const state = await program.account.platformState.fetch(platformState);
    console.log('✅ Platform already initialized');
    console.log(`   Token Mint: ${state.tokenMint.toString()}`);
    console.log(`   Bet Burn Rate: ${state.betBurnRate} basis points`);
    console.log(`   Claim Burn Rate: ${state.claimBurnRate} basis points\n`);
  } catch (error) {
    console.log('❌ Platform not initialized. Run initialize-platform.js first.\n');
    return;
  }

  // Step 2: Create a test market
  console.log('📝 Creating test market...');
  const marketKeypair = web3.Keypair.generate();
  const marketId = `test-market-${Date.now()}`;
  
  const [marketEscrow] = await PublicKey.findProgramAddress(
    [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
    program.programId
  );

  const creatorTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);
  const burnTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    new PublicKey('11111111111111111111111111111111')
  );

  try {
    const tx = await program.methods
      .createMarket(
        { binary: {} }, // MarketType
        'Will BTC reach $100k by end of 2024?',
        ['Yes', 'No'],
        new BN(Math.floor(Date.now() / 1000) + 86400), // 1 day from now
        new BN(100), // 1% creator fee
        new BN(1_000_000), // 1 APES minimum bet
        marketId,
        new BN(10_000_000) // 10 APES creator stake
      )
      .accounts({
        market: marketKeypair.publicKey,
        platformState,
        creator: walletKeypair.publicKey,
        creatorTokenAccount,
        marketEscrow,
        burnTokenAccount,
        tokenMint,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketKeypair])
      .rpc();

    console.log('✅ Market created!');
    console.log(`   Market ID: ${marketKeypair.publicKey.toString()}`);
    console.log(`   Transaction: ${tx}\n`);
  } catch (error) {
    console.error('❌ Failed to create market:', error.message);
    return;
  }

  // Step 3: Place a prediction
  console.log('💰 Placing prediction...');
  const [prediction] = await PublicKey.findProgramAddress(
    [
      Buffer.from('prediction'),
      marketKeypair.publicKey.toBuffer(),
      walletKeypair.publicKey.toBuffer()
    ],
    program.programId
  );

  const treasuryTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);

  try {
    const tx = await program.methods
      .placePrediction(
        0, // Bet on "Yes"
        new BN(5_000_000) // 5 APES
      )
      .accounts({
        market: marketKeypair.publicKey,
        platformState,
        user: walletKeypair.publicKey,
        userTokenAccount: creatorTokenAccount,
        marketEscrow,
        burnTokenAccount,
        treasuryTokenAccount,
        prediction,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('✅ Prediction placed!');
    console.log(`   Transaction: ${tx}\n`);
  } catch (error) {
    console.error('❌ Failed to place prediction:', error.message);
    return;
  }

  // Step 4: Resolve market (as authority)
  console.log('🎯 Resolving market...');
  try {
    const tx = await program.methods
      .resolveMarket(0) // "Yes" wins
      .accounts({
        market: marketKeypair.publicKey,
        resolver: walletKeypair.publicKey,
      })
      .rpc();

    console.log('✅ Market resolved!');
    console.log(`   Winning option: Yes`);
    console.log(`   Transaction: ${tx}\n`);
  } catch (error) {
    console.error('❌ Failed to resolve market:', error.message);
    return;
  }

  // Step 5: Claim reward
  console.log('🏆 Claiming reward...');
  try {
    const tx = await program.methods
      .claimReward()
      .accounts({
        market: marketKeypair.publicKey,
        platformState,
        prediction,
        user: walletKeypair.publicKey,
        userTokenAccount: creatorTokenAccount,
        marketEscrow,
        creatorTokenAccount,
        burnTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log('✅ Reward claimed!');
    console.log(`   Transaction: ${tx}\n`);
  } catch (error) {
    console.error('❌ Failed to claim reward:', error.message);
  }

  console.log('🎉 Test flow completed!');
  console.log('\nView transactions on Solana Explorer:');
  console.log(`https://explorer.solana.com/address/${marketKeypair.publicKey.toString()}?cluster=devnet`);
}

// Run test
testFullFlow().catch(console.error); 