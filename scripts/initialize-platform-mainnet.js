const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load IDL
const idl = require('../src/frontend/src/idl/market_system.json');

// MAINNET Configuration
const NETWORK = 'mainnet';
const config = {
  programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS", // APES Mainnet program ID
  tokenMint: "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts", // PRIMAPE token
  rpcUrl: "https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d",
  
  // CRITICAL: Mainnet Treasury Addresses
  primeapeTreasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z", // Receives contract fees
  communityTreasury: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2", // Receives platform fees
  
  // The smart contract only supports one treasury address currently
  // We'll use PRIMAPE treasury as it receives the larger portion of fees
  treasuryAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
};

console.log(`
⚠️  MAINNET INITIALIZATION WARNING ⚠️
=====================================
This script will initialize the platform on MAINNET with REAL funds.

Treasury Configuration:
- PRIMAPE Treasury: ${config.primeapeTreasury}
- Community Treasury: ${config.communityTreasury}
- Contract Treasury: ${config.treasuryAddress} (receives all fees due to current limitations)

Please confirm these addresses are correct before proceeding!
`);

async function initializePlatform() {
  console.log('\n🚀 Initializing Prediction Market Platform on MAINNET');
  console.log('====================================================\n');

  // Load wallet - ensure you're using the correct mainnet deployer wallet
  const walletPath = process.env.MAINNET_DEPLOYER_PATH || path.join(process.env.HOME, '.config/solana/mainnet-deployer.json');
  
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Mainnet deployer wallet not found at:', walletPath);
    console.error('   Set MAINNET_DEPLOYER_PATH environment variable to your mainnet wallet');
    process.exit(1);
  }
  
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Deployer Wallet: ${walletKeypair.publicKey.toString()}`);
  console.log(`⚠️  Make sure this is your MAINNET deployer wallet!\n`);

  // Create connection
  const connection = new Connection(config.rpcUrl, 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient SOL balance. Need at least 0.1 SOL for initialization.');
    process.exit(1);
  }

  // Confirm before proceeding
  console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 10000));

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
  const program = new Program(idl, provider);

  // Initialize platform
  console.log('📝 Initializing platform with MAINNET treasury...');
  
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    program.programId
  );

  try {
    const tx = await program.methods
      .initialize(
        new BN(250), // 2.5% bet burn rate (goes to treasury as contract fee)
        new BN(150), // 1.5% claim burn rate (goes to treasury as contract fee)
        new BN(100)  // 1% platform fee (ideally for community treasury, but goes to same address)
      )
      .accounts({
        platformState,
        authority: walletKeypair.publicKey,
        tokenMint: new PublicKey(config.tokenMint),
        treasury: new PublicKey(config.treasuryAddress), // Using PRIMAPE treasury
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('✅ Platform initialized on MAINNET!');
    console.log(`   Transaction: ${tx}`);
    console.log(`   View on Solscan: https://solscan.io/tx/${tx}\n`);

    // Verify platform state
    const state = await program.account.platformState.fetch(platformState);
    console.log('Platform State:');
    console.log(`   Authority: ${state.authority.toString()}`);
    console.log(`   Token Mint: ${state.tokenMint.toString()}`);
    console.log(`   Treasury: ${state.treasury.toString()}`);
    console.log(`   Bet Burn Rate: ${state.betBurnRate} basis points (2.5%)`);
    console.log(`   Claim Burn Rate: ${state.claimBurnRate} basis points (1.5%)`);
    console.log(`   Platform Fee Rate: ${state.platformFeeRate} basis points (1%)\n`);
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   - All fees currently go to PRIMAPE Treasury due to contract limitations');
    console.log('   - In v2, we will separate platform fees to Community Treasury');
    console.log('   - Verify treasury address on Solscan before creating markets\n');

  } catch (error) {
    console.error('❌ Failed to initialize platform:', error.message);
    console.error('   This might mean the platform is already initialized');
    console.error('   Check the program account on Solscan');
    return;
  }
}

// Add safety check
if (process.argv.includes('--confirm-mainnet')) {
  initializePlatform().catch(console.error);
} else {
  console.log('\n⚠️  Safety check: Add --confirm-mainnet flag to run this script');
  console.log('   Example: node scripts/initialize-platform-mainnet.js --confirm-mainnet\n');
} 