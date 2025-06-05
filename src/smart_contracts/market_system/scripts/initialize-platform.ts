import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MarketSystem } from "../target/types/market_system";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");
const TOKEN_MINT = new PublicKey("9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts");

async function main() {
  // Load wallet
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  // Configure provider
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // Load program
  const idl = JSON.parse(fs.readFileSync("./target/idl/market_system.json", "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, provider) as Program<MarketSystem>;

  console.log("🚀 Initializing Solana Prediction Market Platform");
  console.log("=================================================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Token Mint:", TOKEN_MINT.toBase58());
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
    } catch (e: any) {
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
    
    // Check if already initialized
    const platformInfo = await connection.getAccountInfo(platformState);
    if (!platformInfo) {
      console.log("Platform not initialized, initializing now...");
      
      // Call the initialize instruction properly
      const initializeAccounts = {
        platformState,
        authority: wallet.publicKey,
        tokenMint: TOKEN_MINT,
        treasury: wallet.publicKey, // Using admin as treasury for now
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      };

      console.log("Initialize accounts:", Object.entries(initializeAccounts).map(([k, v]) => `${k}: ${v.toBase58()}`).join('\n'));

      const tx2 = await program.methods
        .initialize(
          new anchor.BN(50),  // bet_burn_rate: 0.5%
          new anchor.BN(50),  // claim_burn_rate: 0.5%
          new anchor.BN(100)  // platform_fee_rate: 1%
        )
        .accounts(initializeAccounts)
        .rpc();
      console.log("✅ Platform State initialized:", tx2);
    } else {
      console.log("✅ Platform State already initialized");
    }

    // Step 3: Create Test Markets
    console.log("\n📋 Step 3: Creating Test Markets...\n");

    const testMarkets = [
      {
        question: "Will Bitcoin reach $150,000 by December 31, 2024?",
        options: ["Yes", "No"],
        category: "Crypto",
        creatorStake: 1000,
      },
      {
        question: "Will the Federal Reserve cut interest rates in Q1 2025?",
        options: ["Yes", "No"],
        category: "Economy",
        creatorStake: 500,
      },
      {
        question: "Will SpaceX successfully land humans on Mars before 2030?",
        options: ["Yes", "No"],
        category: "Tech",
        creatorStake: 2000,
      },
      {
        question: "Who will win the 2024 NBA Championship?",
        options: ["Lakers", "Celtics", "Warriors", "Heat"],
        category: "Sports",
        creatorStake: 750,
      },
      {
        question: "Will AI achieve AGI (Artificial General Intelligence) by 2027?",
        options: ["Yes", "No"],
        category: "Tech",
        creatorStake: 1500,
      },
    ];

    for (let i = 0; i < testMarkets.length; i++) {
      const marketData = testMarkets[i];
      console.log(`Creating market ${i + 1}: ${marketData.question}`);

      try {
        const market = Keypair.generate();
        const [marketEscrow] = PublicKey.findProgramAddressSync(
          [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
          PROGRAM_ID
        );

        const creatorTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINT,
          wallet.publicKey
        );

        const burnTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINT,
          new PublicKey("11111111111111111111111111111111")
        );

        const marketType = marketData.options.length === 2 
          ? { binary: {} } 
          : { multiOption: {} };
        
        const resolutionDate = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30);
        const creatorFeeRate = new anchor.BN(200); // 2%
        const minBetAmount = new anchor.BN(10_000_000_000); // 10 APES
        const marketId = `market_${Date.now()}_${i}`;
        const creatorStakeAmount = new anchor.BN(marketData.creatorStake * 1_000_000_000);

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

        console.log(`✅ Market created:`);
        console.log(`   Pubkey: ${market.publicKey.toBase58()}`);
        console.log(`   Transaction: ${tx}`);
        console.log("");
      } catch (e: any) {
        console.error(`❌ Failed to create market ${i + 1}:`, e.toString());
      }
    }

    console.log("\n🎉 Platform initialization complete!");
    console.log("\n📱 Next Steps:");
    console.log("1. Start the frontend: cd ../../frontend && npm run dev");
    console.log("2. Connect your wallet");
    console.log("3. You should see all the on-chain markets");
    console.log("4. Start placing predictions with your APES tokens!");

  } catch (error: any) {
    console.error("Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 