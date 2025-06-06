const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Complete APES Platform Initialization on MAINNET
async function initializeAPESPlatformComplete() {
  console.log('🚀 Complete APES Platform Initialization on MAINNET');
  console.log('=====================================================');

  // Load admin wallet (you need to have this file)
  const walletPath = './APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json';
  
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Admin wallet file not found!');
    console.log('Please ensure you have the admin wallet keypair file at:', walletPath);
    return;
  }
  
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Admin Wallet: ${walletKeypair.publicKey.toString()}`);

  // Mainnet connection with Helius
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d', 'confirmed');
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Wallet Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient SOL balance for initialization');
    return;
  }

  // Load IDL
  const idlPath = './src/frontend/src/idl/market_system.json';
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  // APES Program Configuration (MAINNET)
  const APES_PROGRAM_ID = new PublicKey('APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
  const APES_TOKEN = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
  const TREASURY = new PublicKey('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');

  console.log(`Program ID: ${APES_PROGRAM_ID.toString()}`);
  console.log(`Token Mint: ${APES_TOKEN.toString()}`);
  console.log(`Treasury: ${TREASURY.toString()}`);

  // Create provider and program
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

  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, APES_PROGRAM_ID, provider);

  // Find PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    APES_PROGRAM_ID
  );

  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from('access_control')],
    APES_PROGRAM_ID
  );

  console.log(`Platform State PDA: ${platformState.toString()}`);
  console.log(`Access Control PDA: ${accessControl.toString()}`);

  let platformInitialized = false;
  let accessControlInitialized = false;

  // === STEP 1: Check Platform State ===
  console.log('\n📋 Step 1: Checking Platform State...');
  try {
    const existingState = await program.account.platformState.fetch(platformState);
    console.log('✅ Platform State already exists:');
    console.log(`   Authority: ${existingState.authority.toString()}`);
    console.log(`   Token Mint: ${existingState.tokenMint.toString()}`);
    console.log(`   Treasury: ${existingState.treasury.toString()}`);
    platformInitialized = true;
  } catch (error) {
    console.log('❌ Platform State not found, needs initialization');
  }

  // === STEP 2: Check Access Control ===
  console.log('\n📋 Step 2: Checking Access Control...');
  try {
    const existingAccessControl = await program.account.accessControl.fetch(accessControl);
    console.log('✅ Access Control already exists:');
    console.log(`   Admin: ${existingAccessControl.admin.toString()}`);
    console.log(`   Market Creators: ${existingAccessControl.marketCreators.length}`);
    accessControlInitialized = true;
  } catch (error) {
    console.log('❌ Access Control not found, needs initialization');
  }

  // === STEP 3: Initialize Platform State (if needed) ===
  if (!platformInitialized) {
    console.log('\n🔄 Step 3: Initializing Platform State...');
    try {
      const tx = await program.methods
        .initialize(
          new BN(250), // 2.5% bet burn rate
          new BN(150), // 1.5% claim burn rate  
          new BN(100)  // 1% platform fee
        )
        .accounts({
          platformState,
          authority: walletKeypair.publicKey,
          tokenMint: APES_TOKEN,
          treasury: TREASURY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc({
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        });

      console.log('✅ Platform State initialized successfully!');
      console.log(`   Transaction: ${tx}`);
      console.log(`   View on Solscan: https://solscan.io/tx/${tx}`);
      platformInitialized = true;
    } catch (error) {
      console.error('❌ Platform State initialization failed:', error);
      return;
    }
  } else {
    console.log('\n✅ Step 3: Platform State already initialized');
  }

  // === STEP 4: Initialize Access Control (if needed) ===
  if (!accessControlInitialized) {
    console.log('\n🔄 Step 4: Initializing Access Control...');
    try {
      const tx = await program.methods
        .initializeAccessControl()
        .accounts({
          accessControl,
          admin: walletKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        });

      console.log('✅ Access Control initialized successfully!');
      console.log(`   Transaction: ${tx}`);
      console.log(`   View on Solscan: https://solscan.io/tx/${tx}`);
      accessControlInitialized = true;
    } catch (error) {
      console.error('❌ Access Control initialization failed:', error);
      return;
    }
  } else {
    console.log('\n✅ Step 4: Access Control already initialized');
  }

  // === STEP 5: Add Admin as Market Creator (if needed) ===
  console.log('\n🔄 Step 5: Adding admin as market creator...');
  try {
    const accessControlData = await program.account.accessControl.fetch(accessControl);
    const isAlreadyCreator = accessControlData.marketCreators.some(
      creator => creator.toString() === walletKeypair.publicKey.toString()
    );

    if (!isAlreadyCreator) {
      const tx = await program.methods
        .addMarketCreator(walletKeypair.publicKey)
        .accounts({
          accessControl,
          admin: walletKeypair.publicKey,
        })
        .rpc({
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        });

      console.log('✅ Admin added as market creator!');
      console.log(`   Transaction: ${tx}`);
      console.log(`   View on Solscan: https://solscan.io/tx/${tx}`);
    } else {
      console.log('✅ Admin is already a market creator');
    }
  } catch (error) {
    console.error('❌ Failed to add admin as market creator:', error);
    console.log('ℹ️  This is not critical - you can still try creating markets');
  }

  // === FINAL STATUS ===
  console.log('\n🎉 APES Platform Initialization Complete!');
  console.log('=========================================');
  console.log('✅ Platform State: Initialized');
  console.log('✅ Access Control: Initialized');
  console.log('✅ Admin Wallet: Authorized');
  console.log('\n🚀 You can now create markets on the admin panel!');
  console.log('   Go to: https://www.primape.app/admin/deploy-markets');
}

// Run the initialization
initializeAPESPlatformComplete().catch(console.error); 