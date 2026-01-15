const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN, workspace } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Direct mainnet initialization for APES program
async function initializeAPESPlatform() {
  console.log('🚀 Direct APES Platform Initialization on MAINNET');
  console.log('====================================================');

  // Load our mainnet wallet
  const walletPath = './APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json';
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Deployer Wallet: ${walletKeypair.publicKey.toString()}`);

  // Mainnet connection with Helius
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d', 'confirmed');
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // Load IDL from the built program
  const idlPath = './src/frontend/src/idl/market_system.json';
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  // APES Program Configuration
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

  // Find Platform State PDA
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    APES_PROGRAM_ID
  );

  console.log(`Platform State PDA: ${platformState.toString()}`);

  // Check if already initialized
  try {
    const existingState = await program.account.platformState.fetch(platformState);
    console.log('✅ Platform State already exists:');
    console.log(`   Authority: ${existingState.authority.toString()}`);
    console.log(`   Token Mint: ${existingState.tokenMint.toString()}`);
    console.log(`   Treasury: ${existingState.treasury.toString()}`);
    console.log('🎉 APES Platform is already initialized on mainnet!');
    return;
  } catch (error) {
    console.log('📝 Platform State not found, initializing...');
  }

  // Initialize platform
  try {
    console.log('🔄 Sending initialization transaction...');
    
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

    console.log('✅ Platform initialized successfully!');
    console.log(`   Transaction: ${tx}`);
    console.log(`   View on Solscan: https://solscan.io/tx/${tx}`);

    // Verify initialization
    const state = await program.account.platformState.fetch(platformState);
    console.log('📊 Platform State:');
    console.log(`   Authority: ${state.authority.toString()}`);
    console.log(`   Token Mint: ${state.tokenMint.toString()}`);
    console.log(`   Treasury: ${state.treasury.toString()}`);
    console.log(`   Bet Burn Rate: ${state.betBurnRate} basis points`);
    console.log(`   Claim Burn Rate: ${state.claimBurnRate} basis points`);
    console.log(`   Platform Fee Rate: ${state.platformFeeRate} basis points`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

initializeAPESPlatform().catch(console.error); 