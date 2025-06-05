const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");
const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb"); // APES devnet token

async function main() {
  // Load wallet
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  // Configure provider
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const walletWrapper = new anchor.Wallet(wallet);
  const provider = new anchor.AnchorProvider(connection, walletWrapper, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load program
  const idl = JSON.parse(fs.readFileSync("./src/smart_contracts/market_system/target/idl/market_system.json", "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  console.log("🚀 Initializing Solana Prediction Market Platform ON-CHAIN");
  console.log("=======================================================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Token Mint ($APES):", TOKEN_MINT.toBase58());
  console.log("");

  try {
    // Step 1: Initialize Access Control
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      PROGRAM_ID
    );

    console.log("📋 Step 1: Initializing Access Control...");
    try {
      const tx1 = await program.methods
        .initializeAccessControl()
        .accounts({
          accessControl,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Access Control initialized:", tx1);
      console.log("   View on Solscan: https://solscan.io/tx/" + tx1 + "?cluster=devnet");
    } catch (e) {
      if (e.toString().includes("already in use")) {
        console.log("✅ Access Control already initialized");
      } else {
        throw e;
      }
    }

    // Step 2: Initialize Platform State
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );

    console.log("\n📋 Step 2: Initializing Platform State...");
    console.log("Platform State PDA:", platformState.toBase58());
    
    try {
      const tx2 = await program.methods
        .initialize(
          new anchor.BN(50),   // bet_burn_rate: 0.5%
          new anchor.BN(50),   // claim_burn_rate: 0.5%
          new anchor.BN(100)   // platform_fee_rate: 1%
        )
        .accounts({
          platformState,
          authority: wallet.publicKey,
          tokenMint: TOKEN_MINT,
          treasury: wallet.publicKey, // Using admin as treasury for testing
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log("✅ Platform State initialized:", tx2);
      console.log("   View on Solscan: https://solscan.io/tx/" + tx2 + "?cluster=devnet");
    } catch (e) {
      if (e.toString().includes("already in use")) {
        console.log("✅ Platform State already initialized");
      } else {
        throw e;
      }
    }

    // Step 3: Check token balance
    console.log("\n📋 Checking APES token balance...");
    const creatorTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      wallet.publicKey
    );

    try {
      const balance = await connection.getTokenAccountBalance(creatorTokenAccount);
      console.log("✅ APES Balance:", balance.value.uiAmount, "APES");
      
      if (!balance.value.uiAmount || balance.value.uiAmount < 5000) {
        console.log("⚠️  Low APES balance. You need at least 5000 APES to create all test markets.");
        console.log("   Get test APES tokens first before creating markets.");
        return;
      }
    } catch (e) {
      console.log("❌ No APES token account found. Create one and get test tokens first.");
      return;
    }

    // Step 4: Create Test Markets
    console.log("\n📋 Step 3: Creating Test Markets ON-CHAIN...\n");

    const testMarkets = [
      {
        question: "Will Bitcoin reach $150,000 by January 31, 2025?",
        options: ["Yes", "No"],
        category: "Crypto",
        creatorStake: 100, // 100 APES
      },
      {
        question: "Will the Federal Reserve cut interest rates in Q1 2025?",
        options: ["Yes", "No"],
        category: "Economy",
        creatorStake: 50,
      },
      {
        question: "Will Ethereum merge with another L1 blockchain by 2025?",
        options: ["Yes", "No"],
        category: "Crypto",
        creatorStake: 200,
      },
      {
        question: "Who will win Super Bowl LIX?",
        options: ["49ers", "Chiefs", "Bills", "Eagles"],
        category: "Sports",
        creatorStake: 75,
      },
      {
        question: "Will OpenAI release GPT-5 in 2025?",
        options: ["Yes", "No"],
        category: "Tech",
        creatorStake: 150,
      },
    ];

    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey("11111111111111111111111111111111")
    );

    for (let i = 0; i < testMarkets.length; i++) {
      const marketData = testMarkets[i];
      console.log(`Creating market ${i + 1}: ${marketData.question}`);

      try {
        const market = Keypair.generate();
        const [marketEscrow] = PublicKey.findProgramAddressSync(
          [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
          PROGRAM_ID
        );

        const marketType = marketData.options.length === 2 
          ? { binary: {} } 
          : { multiOption: {} };
        
        const resolutionDate = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days
        const creatorFeeRate = new anchor.BN(200); // 2%
        const minBetAmount = new anchor.BN(10 * 1e9); // 10 APES (with 9 decimals)
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

        console.log(`✅ Market created ON-CHAIN!`);
        console.log(`   Market Pubkey: ${market.publicKey.toBase58()}`);
        console.log(`   Transaction: ${tx}`);
        console.log(`   View on Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
        console.log("");
      } catch (e) {
        console.error(`❌ Failed to create market ${i + 1}:`, e.toString());
        console.log("   Make sure you have enough APES tokens!");
      }
    }

    console.log("\n🎉 Platform initialization complete!");
    console.log("\n✅ Your Solana Prediction Market Platform is now LIVE on devnet!");
    console.log("\n📱 Next Steps:");
    console.log("1. Remove all mock data code from the frontend");
    console.log("2. Start the frontend: cd ../../frontend && npm run dev");
    console.log("3. Connect your wallet");
    console.log("4. You should see all the ON-CHAIN markets");
    console.log("5. Users can now place real predictions with APES tokens!");
    console.log("\n🔗 Important Links:");
    console.log("- Program: https://solscan.io/account/" + PROGRAM_ID.toBase58() + "?cluster=devnet");
    console.log("- Token: https://solscan.io/token/" + TOKEN_MINT.toBase58() + "?cluster=devnet");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 