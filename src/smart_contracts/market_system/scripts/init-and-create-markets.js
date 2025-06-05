const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

// Load wallet and IDL
const secret = JSON.parse(fs.readFileSync('./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));
const idl = JSON.parse(fs.readFileSync('./target/idl/market_system.json'));

// Setup
const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
anchor.setProvider(provider);

const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
const program = new anchor.Program(idl, PROGRAM_ID, provider);

async function initializeAndCreateMarkets() {
  console.log('🚀 Initializing Platform and Creating Test Markets\n');
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Step 1: Initialize Access Control
  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from('access_control')],
    PROGRAM_ID
  );

  try {
    console.log('\n1️⃣ Initializing Access Control...');
    const tx1 = await program.methods
      .initializeAccessControl()
      .accounts({
        accessControl,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('✅ Access Control initialized:', tx1);
  } catch (e) {
    console.log('⚠️  Access Control might already be initialized:', e.message);
  }

  // Step 2: Initialize Platform State
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    PROGRAM_ID
  );

  try {
    console.log('\n2️⃣ Initializing Platform State...');
    const tx2 = await program.methods
      .initialize(
        new anchor.BN(50),  // bet_burn_rate: 0.5%
        new anchor.BN(50),  // claim_burn_rate: 0.5%
        new anchor.BN(100)  // platform_fee_rate: 1%
      )
      .accounts({
        platformState,
        authority: wallet.publicKey,
        tokenMint: TOKEN_MINT,
        treasury: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log('✅ Platform State initialized:', tx2);
  } catch (e) {
    console.log('⚠️  Platform might already be initialized:', e.message);
  }

  // Step 3: Create Test Markets
  console.log('\n3️⃣ Creating Test Markets...\n');

  const testMarkets = [
    {
      question: "Will Bitcoin reach $150,000 by December 31, 2024?",
      options: ["Yes", "No"],
      category: "Crypto",
      creatorStake: 1000
    },
    {
      question: "Will the Federal Reserve cut interest rates in Q1 2025?",
      options: ["Yes", "No"],
      category: "Economy",
      creatorStake: 500
    },
    {
      question: "Will SpaceX successfully land humans on Mars before 2030?",
      options: ["Yes", "No"],
      category: "Tech",
      creatorStake: 2000
    },
    {
      question: "Who will win the 2024 NBA Championship?",
      options: ["Lakers", "Celtics", "Warriors", "Heat"],
      category: "Sports",
      creatorStake: 750
    },
    {
      question: "Will AI achieve AGI (Artificial General Intelligence) by 2027?",
      options: ["Yes", "No"],
      category: "Tech",
      creatorStake: 1500
    }
  ];

  for (let i = 0; i < testMarkets.length; i++) {
    const marketData = testMarkets[i];
    
    try {
      const market = Keypair.generate();
      const [marketEscrow] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_escrow'), market.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        wallet.publicKey
      );

      const burnTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        new PublicKey('11111111111111111111111111111111')
      );

      const marketType = marketData.options.length === 2 ? { binary: {} } : { multiOption: {} };
      const resolutionDate = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days
      const creatorFeeRate = new anchor.BN(200); // 2%
      const minBetAmount = new anchor.BN(10 * 1e9); // 10 APES
      const marketId = `market_${Date.now()}_${i}`;
      const creatorStakeAmount = new anchor.BN(marketData.creatorStake * 1e9);

      const tx = await program.methods
        .createMarket(
          marketType,
          marketData.question,
          marketData.options,
          resolutionDate,
          creatorFeeRate,
          minBetAmount,
          marketId,
          creatorStakeAmount,
          marketData.category
        )
        .accounts({
          market: market.publicKey,
          platformState,
          creator: wallet.publicKey,
          creatorTokenAccount,
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

      console.log(`✅ Market ${i + 1} created:`);
      console.log(`   Question: ${marketData.question}`);
      console.log(`   Market ID: ${market.publicKey.toBase58()}`);
      console.log(`   Transaction: ${tx}\n`);
    } catch (e) {
      console.error(`❌ Failed to create market ${i + 1}:`, e.message);
    }
  }

  console.log('\n✨ Platform initialization complete!');
  console.log('\n📱 Next Steps for QA:');
  console.log('1. Start your frontend: cd src/frontend && npm run dev');
  console.log('2. Visit http://localhost:3000');
  console.log('3. Connect your wallet');
  console.log('4. You should see all the test markets');
  console.log('5. Start placing bets with your APES tokens!');
}

initializeAndCreateMarkets().catch(console.error); 