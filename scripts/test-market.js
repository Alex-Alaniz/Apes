const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load IDL
const idl = require('../src/smart_contracts/market_system/target/idl/market_system.json');

// Configuration from solana.js
const NETWORK = 'devnet';
const config = {
  programId: "2Dg59cEkKzrnZGm3GCN9FyShbwdj1YQZNs8hfazPrRgk",
  tokenMint: "JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb",
  rpcUrl: "https://api.devnet.solana.com"
};

async function testMarketCreation() {
  console.log('\n🚀 Testing Market Creation on Devnet');
  console.log('=====================================\n');

  // Load wallet
  const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log(`Wallet: ${walletKeypair.publicKey.toString()}`);

  // Create connection
  const connection = new Connection(config.rpcUrl, 'confirmed');
  
  // Check balances
  const solBalance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

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
  const program = new Program(idl, programId, provider);

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

  const creatorTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(config.tokenMint),
    walletKeypair.publicKey
  );

  const burnTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(config.tokenMint),
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
        tokenMint: new PublicKey(config.tokenMint),
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketKeypair])
      .rpc();

    console.log('✅ Market created!');
    console.log(`   Market ID: ${marketKeypair.publicKey.toString()}`);
    console.log(`   Transaction: ${tx}\n`);

    // Verify market data
    const market = await program.account.market.fetch(marketKeypair.publicKey);
    console.log('Market Data:');
    console.log(`   Question: ${market.question}`);
    console.log(`   Options: ${market.options.join(', ')}`);
    console.log(`   Status: ${Object.keys(market.status)[0]}`);
    console.log(`   Creator: ${market.creator.toString()}`);
    console.log(`   Total Pool: ${market.totalPool.toString()}\n`);

  } catch (error) {
    console.error('❌ Failed to create market:', error.message);
    return;
  }
}

// Run the test
testMarketCreation().catch(console.error); 