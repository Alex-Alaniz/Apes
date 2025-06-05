const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");
const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb");

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

  // Load IDL
  const idl = JSON.parse(fs.readFileSync("src/smart_contracts/market_system/target/idl/market_system.json", "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  console.log("🚀 Creating Market with Anchor");
  console.log("==============================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("");

  try {
    // Check balance
    const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    console.log("💰 APES Balance:", balance.value.uiAmount, "APES");

    // Create market
    const market = Keypair.generate();
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      PROGRAM_ID
    );
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey("11111111111111111111111111111111")
    );

    console.log("Creating market: Will Bitcoin reach $150,000 by July 31, 2025?");
    
    const tx = await program.methods
      .createMarket(
        { binary: {} }, // MarketType
        "Will Bitcoin reach $150,000 by July 31, 2025?",
        ["Yes", "No"],
        new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 240), // 240 days
        new anchor.BN(200), // 2% creator fee
        new anchor.BN(10 * 1e9), // 10 APES min bet
        `market_${Date.now()}`,
        new anchor.BN(100 * 1e9), // 100 APES stake
        "Crypto"
      )
      .accounts({
        market: market.publicKey,
        platformState,
        creator: wallet.publicKey,
        creatorTokenAccount: tokenAccount,
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

    console.log("\n✅ Market created successfully!");
    console.log("Transaction:", tx);
    console.log("Market Address:", market.publicKey.toBase58());
    console.log("\nView on Solscan: https://solscan.io/tx/" + tx + "?cluster=devnet");
    
    console.log("\n🎉 Your prediction market is LIVE!");
    console.log("\n📱 The frontend should now be running at http://localhost:3000");
    console.log("Connect your wallet to see and interact with your market!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 