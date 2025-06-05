const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load IDL
const idl = require('../src/frontend/src/idl/market_system.json');

// Configuration - updated with correct program ID
const NETWORK = 'devnet';
const config = {
  programId: "FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib",
  tokenMint: "JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb",
  rpcUrl: "https://api.devnet.solana.com",
  treasuryAddress: "4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS"
};

async function initializePlatform() {
  console.log('\n🚀 Initializing Prediction Market Platform on Devnet');
  console.log('================================================\n');

  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Wallet: ${walletKeypair.publicKey.toString()}`);

  // Create connection
  const connection = new Connection(config.rpcUrl, 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  if (balance === 0) {
    console.error('❌ Wallet has no SOL. Please fund your wallet first.');
    process.exit(1);
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
  const programId = new PublicKey(config.programId);
  
  // Add the address field to IDL if not present
  const idlWithAddress = {
    ...idl,
    address: config.programId
  };
  
  const program = new Program(idlWithAddress, provider);

  // Initialize platform
  console.log('📝 Initializing platform...');
  
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    program.programId
  );

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
        tokenMint: new PublicKey(config.tokenMint),
        treasury: new PublicKey(config.treasuryAddress), // Using dedicated treasury
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('✅ Platform initialized!');
    console.log(`   Transaction: ${tx}\n`);

    // Verify platform state
    const state = await program.account.platformState.fetch(platformState);
    console.log('Platform State:');
    console.log(`   Authority: ${state.authority.toString()}`);
    console.log(`   Token Mint: ${state.tokenMint.toString()}`);
    console.log(`   Treasury: ${state.treasury.toString()}`);
    console.log(`   Bet Burn Rate: ${state.betBurnRate} basis points`);
    console.log(`   Claim Burn Rate: ${state.claimBurnRate} basis points`);
    console.log(`   Platform Fee Rate: ${state.platformFeeRate} basis points\n`);

  } catch (error) {
    console.error('❌ Failed to initialize platform:', error.message);
    return;
  }
}

// Run initialization
initializePlatform().catch(console.error); 