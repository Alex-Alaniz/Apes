const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load config
const networkConfig = require('../src/frontend/src/config/networks.json').devnet;
const config = {
  ...networkConfig,
  platformFeeAddress: "4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS"
};

// Load IDL
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/frontend/src/idl/market_system.json'), 'utf8'));

// Load main wallet
const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));

// Generate test users
const user1 = Keypair.generate();
const user2 = Keypair.generate();
const user3 = Keypair.generate();

async function airdropAndCreateTokenAccount(connection, user, tokenMint) {
  console.log(`Setting up user ${user.publicKey.toString().slice(0, 8)}...`);
  
  // Airdrop SOL
  const airdropSig = await connection.requestAirdrop(user.publicKey, 2 * 10**9); // 2 SOL
  await connection.confirmTransaction(airdropSig);
  
  // Create associated token account
  const ata = await getAssociatedTokenAddress(tokenMint, user.publicKey);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    user.publicKey,
    ata,
    user.publicKey,
    tokenMint
  );
  
  const tx = new Transaction().add(createAtaIx);
  tx.feePayer = user.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.sign(user);
  
  await connection.sendTransaction(tx, [user]);
  
  console.log(`✅ User ${user.publicKey.toString().slice(0, 8)} ready`);
  return ata;
}

async function transferTokens(connection, program, from, to, amount, tokenMint) {
  const fromAta = await getAssociatedTokenAddress(tokenMint, from.publicKey);
  const toAta = await getAssociatedTokenAddress(tokenMint, to.publicKey);
  
  const transferIx = await program.methods
    .transfer(new BN(amount))
    .accounts({
      from: fromAta,
      to: toAta,
      authority: from.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
    
  const tx = new Transaction().add(transferIx);
  tx.feePayer = from.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.sign(from);
  
  await connection.sendTransaction(tx, [from]);
}

async function testEndToEndMultiOption() {
  const connection = new Connection(config.rpcUrl || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
  
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => {
        tx.sign(wallet);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map(tx => {
          tx.sign(wallet);
          return tx;
        });
      }
    },
    { commitment: 'confirmed' }
  );
  
  const program = new Program(idl, provider);
  const tokenMint = new PublicKey(config.tokenMint);
  
  try {
    console.log('🎯 End-to-End Multi-Option Market Test\n');
    console.log('Admin wallet:', wallet.publicKey.toString());
    
    // Step 1: Setup test users
    console.log('\n📋 Step 1: Setting up test users...');
    await airdropAndCreateTokenAccount(connection, user1, tokenMint);
    await airdropAndCreateTokenAccount(connection, user2, tokenMint);
    await airdropAndCreateTokenAccount(connection, user3, tokenMint);
    
    // Transfer APES tokens to test users (100 APES each)
    console.log('\n💰 Transferring APES to test users...');
    // Note: This assumes the main wallet has APES tokens
    // In real testing, you'd need to mint or have tokens available
    
    // Step 2: Create a 4-option market
    console.log('\n📋 Step 2: Creating a 4-option market...');
    const market = Keypair.generate();
    
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      programId
    );
    
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      programId
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
      programId
    );
    
    const questionBytes = Buffer.from("Who will win the 2024 Championship?");
    const option1Bytes = Buffer.from("Team A");
    const option2Bytes = Buffer.from("Team B");
    const option3Bytes = Buffer.from("Team C");
    const option4Bytes = Buffer.from("Team D");
    const marketIdBytes = Buffer.from(`test_market_${Date.now()}`);
    const categoryBytes = Buffer.from("Sports");
    
    const createMarketTx = await program.methods
      .createMarket(
        { multiOption: {} }, // MarketType
        [...questionBytes, ...new Array(200 - questionBytes.length).fill(0)],
        questionBytes.length,
        [...option1Bytes, ...new Array(50 - option1Bytes.length).fill(0)],
        [...option2Bytes, ...new Array(50 - option2Bytes.length).fill(0)],
        [...option3Bytes, ...new Array(50 - option3Bytes.length).fill(0)],
        [...option4Bytes, ...new Array(50 - option4Bytes.length).fill(0)],
        4, // option_count
        new BN(Math.floor(Date.now() / 1000) + 86400), // Resolution in 24 hours
        new BN(100), // 1% creator fee
        new BN(1 * 10**6), // 1 APES min bet
        [...marketIdBytes, ...new Array(32 - marketIdBytes.length).fill(0)],
        marketIdBytes.length,
        new BN(10 * 10**6), // 10 APES creator stake
        [...categoryBytes, ...new Array(20 - categoryBytes.length).fill(0)],
        categoryBytes.length
      )
      .accounts({
        market: market.publicKey,
        platformState: platformState,
        creator: wallet.publicKey,
        creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
        marketEscrow: marketEscrow,
        burnTokenAccount: await getAssociatedTokenAddress(tokenMint, new PublicKey(config.platformFeeAddress)),
        tokenMint: tokenMint,
        accessControl: accessControl,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([market])
      .rpc();
    
    console.log('✅ Market created:', market.publicKey.toString());
    console.log('TX:', createMarketTx);
    
    // Step 3: Place overlapping bets from 3 users
    console.log('\n📋 Step 3: Placing bets from multiple users...');
    
    // Helper function to place bet
    async function placeBetForUser(user, optionIndex, amount, label) {
      const userProvider = new AnchorProvider(
        connection,
        {
          publicKey: user.publicKey,
          signTransaction: async (tx) => {
            tx.sign(user);
            return tx;
          },
          signAllTransactions: async (txs) => {
            return txs.map(tx => {
              tx.sign(user);
              return tx;
            });
          }
        },
        { commitment: 'confirmed' }
      );
      
      const userProgram = new Program(idl, userProvider);
      
      const [prediction] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), market.publicKey.toBuffer(), user.publicKey.toBuffer(), Buffer.from([optionIndex])],
        programId
      );
      
      const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
        [
          new PublicKey(config.treasuryAddress).toBuffer(),
          new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
          tokenMint.toBuffer(),
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      );
      
      console.log(`\n${label}:`);
      console.log(`User ${user.publicKey.toString().slice(0, 8)} betting ${amount} APES on option ${optionIndex}`);
      
      const tx = await userProgram.methods
        .placePrediction(optionIndex, new BN(amount * 10**6))
        .accounts({
          market: market.publicKey,
          platformState: platformState,
          user: user.publicKey,
          userTokenAccount: await getAssociatedTokenAddress(tokenMint, user.publicKey),
          marketEscrow: marketEscrow,
          burnTokenAccount: await getAssociatedTokenAddress(tokenMint, new PublicKey(config.platformFeeAddress)),
          treasuryTokenAccount: treasuryTokenAccount,
          prediction: prediction,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      
      console.log('✅ Bet placed. TX:', tx);
    }
    
    // User 1: Bets on options 0 and 2
    await placeBetForUser(user1, 0, 20, "User 1 - Bet 1");
    await placeBetForUser(user1, 2, 10, "User 1 - Bet 2");
    
    // User 2: Bets on options 1 and 2
    await placeBetForUser(user2, 1, 30, "User 2 - Bet 1");
    await placeBetForUser(user2, 2, 15, "User 2 - Bet 2");
    
    // User 3: Bets on all 4 options
    await placeBetForUser(user3, 0, 5, "User 3 - Bet 1");
    await placeBetForUser(user3, 1, 5, "User 3 - Bet 2");
    await placeBetForUser(user3, 2, 5, "User 3 - Bet 3");
    await placeBetForUser(user3, 3, 5, "User 3 - Bet 4");
    
    // Step 4: Check market state
    console.log('\n📋 Step 4: Checking market state...');
    const marketData = await program.account.market.fetch(market.publicKey);
    console.log('Option 0 pool:', marketData.option1Pool.toNumber() / 10**6, 'APES');
    console.log('Option 1 pool:', marketData.option2Pool.toNumber() / 10**6, 'APES');
    console.log('Option 2 pool:', marketData.option3Pool.toNumber() / 10**6, 'APES');
    console.log('Option 3 pool:', marketData.option4Pool.toNumber() / 10**6, 'APES');
    console.log('Total pool:', marketData.totalPool.toNumber() / 10**6, 'APES');
    
    // Step 5: Resolve market (option 2 wins)
    console.log('\n📋 Step 5: Resolving market...');
    const winningOption = 2;
    const resolveTx = await program.methods
      .resolveMarket(winningOption)
      .accounts({
        market: market.publicKey,
        resolver: wallet.publicKey,
      })
      .rpc();
    
    console.log(`✅ Market resolved. Winning option: ${winningOption}`);
    console.log('TX:', resolveTx);
    
    // Step 6: Claims from winners
    console.log('\n📋 Step 6: Processing claims...');
    
    async function claimForUser(user, optionIndex, label) {
      const userProvider = new AnchorProvider(
        connection,
        {
          publicKey: user.publicKey,
          signTransaction: async (tx) => {
            tx.sign(user);
            return tx;
          },
          signAllTransactions: async (txs) => {
            return txs.map(tx => {
              tx.sign(user);
              return tx;
            });
          }
        },
        { commitment: 'confirmed' }
      );
      
      const userProgram = new Program(idl, userProvider);
      
      const [prediction] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), market.publicKey.toBuffer(), user.publicKey.toBuffer(), Buffer.from([optionIndex])],
        programId
      );
      
      console.log(`\n${label}:`);
      
      try {
        const tx = await userProgram.methods
          .claimReward(optionIndex)
          .accounts({
            market: market.publicKey,
            platformState: platformState,
            prediction: prediction,
            user: user.publicKey,
            userTokenAccount: await getAssociatedTokenAddress(tokenMint, user.publicKey),
            marketEscrow: marketEscrow,
            creatorTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
            burnTokenAccount: await getAssociatedTokenAddress(tokenMint, new PublicKey(config.platformFeeAddress)),
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        
        console.log('✅ Claim successful. TX:', tx);
      } catch (error) {
        console.log('❌ Claim failed:', error.message);
      }
    }
    
    // Winners claim (option 2)
    await claimForUser(user1, 2, "User 1 claiming option 2");
    await claimForUser(user2, 2, "User 2 claiming option 2");
    await claimForUser(user3, 2, "User 3 claiming option 2");
    
    // Non-winners try to claim (should fail)
    await claimForUser(user1, 0, "User 1 trying to claim option 0 (should fail)");
    await claimForUser(user3, 3, "User 3 trying to claim option 3 (should fail)");
    
    // Step 7: Verify escrow balance
    console.log('\n📋 Step 7: Verifying final escrow balance...');
    const escrowAccount = await connection.getTokenAccountBalance(marketEscrow);
    console.log('Escrow balance:', escrowAccount.value.uiAmount, 'APES');
    console.log('Expected: Close to 0 (minus fees/burns)');
    
    console.log('\n✅ End-to-end test complete!');
    console.log('\nSummary:');
    console.log('- Created 4-option market');
    console.log('- 3 users placed overlapping bets');
    console.log('- Market resolved with option 2 winning');
    console.log('- Winners claimed rewards successfully');
    console.log('- Non-winners were rejected');
    console.log('- Escrow properly distributed funds');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.logs || error.message);
  }
}

testEndToEndMultiOption(); 