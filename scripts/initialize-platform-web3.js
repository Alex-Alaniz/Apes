const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const fs = require("fs");
const BN = require("bn.js");
const crypto = require("crypto");

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");
const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb"); // APES devnet token

// Instruction discriminators (first 8 bytes of sha256 hash)
const INITIALIZE_ACCESS_CONTROL_IX = Buffer.from([169, 75, 156, 121, 225, 122, 120, 174]); // sha256("global:initialize_access_control")[:8]
const INITIALIZE_IX = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // sha256("global:initialize")[:8]

function getInstructionDiscriminator(name) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

async function main() {
  // Load wallet
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("🚀 Initializing Solana Prediction Market Platform (Web3.js)");
  console.log("=========================================================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Token Mint ($APES devnet):", TOKEN_MINT.toBase58());
  console.log("");

  try {
    // Step 1: Initialize Access Control
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      PROGRAM_ID
    );

    console.log("📋 Step 1: Checking Access Control...");
    const accessControlInfo = await connection.getAccountInfo(accessControl);
    
    if (!accessControlInfo) {
      console.log("Initializing Access Control...");
      
      const initAccessControlIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: accessControl, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: getInstructionDiscriminator("initialize_access_control"),
      });

      const tx1 = new Transaction().add(initAccessControlIx);
      const sig1 = await connection.sendTransaction(tx1, [wallet], { skipPreflight: false });
      await connection.confirmTransaction(sig1);
      console.log("✅ Access Control initialized:", sig1);
      console.log("   View on Solscan: https://solscan.io/tx/" + sig1 + "?cluster=devnet");
    } else {
      console.log("✅ Access Control already initialized");
    }

    // Step 2: Initialize Platform State
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_state")],
      PROGRAM_ID
    );

    console.log("\n📋 Step 2: Checking Platform State...");
    console.log("Platform State PDA:", platformState.toBase58());
    
    const platformInfo = await connection.getAccountInfo(platformState);
    
    if (!platformInfo) {
      console.log("Initializing Platform State...");
      
      // Encode initialize parameters
      const betBurnRate = new BN(50);    // 0.5%
      const claimBurnRate = new BN(50);  // 0.5%
      const platformFeeRate = new BN(100); // 1%
      
      // Build instruction data: discriminator + params
      const data = Buffer.concat([
        getInstructionDiscriminator("initialize"),
        betBurnRate.toArrayLike(Buffer, 'le', 8),
        claimBurnRate.toArrayLike(Buffer, 'le', 8),
        platformFeeRate.toArrayLike(Buffer, 'le', 8),
      ]);

      const initPlatformIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformState, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_MINT, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: false, isWritable: false }, // treasury
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: data,
      });

      const tx2 = new Transaction().add(initPlatformIx);
      const sig2 = await connection.sendTransaction(tx2, [wallet], { skipPreflight: false });
      await connection.confirmTransaction(sig2);
      console.log("✅ Platform State initialized:", sig2);
      console.log("   View on Solscan: https://solscan.io/tx/" + sig2 + "?cluster=devnet");
    } else {
      console.log("✅ Platform State already initialized");
    }

    console.log("\n🎉 Platform initialization complete!");
    console.log("\n✅ Your Solana Prediction Market Platform is now LIVE on devnet!");
    console.log("\n📱 Next Steps:");
    console.log("1. Remove all mock data code from the frontend");
    console.log("2. Create markets with your APES tokens");
    console.log("3. Start the frontend and connect your wallet");
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