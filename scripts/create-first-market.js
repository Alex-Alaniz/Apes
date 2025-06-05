const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");
const BN = require("bn.js");
const crypto = require("crypto");

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");
const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb"); // APES devnet token

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

  console.log("🚀 Creating First Market on Solana Prediction Market Platform");
  console.log("==========================================================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("");

  try {
    // Check APES balance
    const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    
    try {
      const balance = await connection.getTokenAccountBalance(tokenAccount);
      console.log("💰 APES Balance:", balance.value.uiAmount, "APES");
      
      if (!balance.value.uiAmount || balance.value.uiAmount < 100) {
        console.log("⚠️  Insufficient APES balance. You need at least 100 APES to create a market.");
        console.log("   You can get test APES tokens from a faucet or mint them.");
        return;
      }
    } catch (e) {
      console.log("❌ No APES token account found. Create one first:");
      console.log("   Run: spl-token create-account " + TOKEN_MINT.toBase58());
      return;
    }

    // Market details
    const market = Keypair.generate();
    const marketData = {
      question: "Will Bitcoin reach $100,000 by March 31, 2025?",
      options: ["Yes", "No"],
      category: "Crypto",
      creatorStake: 100, // 100 APES
    };

    // Find PDAs
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

    console.log("📋 Creating Market:", marketData.question);
    console.log("Market Pubkey:", market.publicKey.toBase58());
    console.log("");

    // Prepare instruction data
    const marketType = Buffer.from([0]); // Binary = 0
    const questionBytes = Buffer.from(marketData.question);
    const questionLen = Buffer.alloc(4);
    questionLen.writeUInt32LE(questionBytes.length, 0);
    
    const optionsData = Buffer.concat([
      Buffer.from([2]), // 2 options
      Buffer.from([3]), // "Yes" length
      Buffer.from("Yes"),
      Buffer.from([2]), // "No" length  
      Buffer.from("No")
    ]);

    const resolutionDate = new BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90); // 90 days
    const creatorFeeRate = new BN(200); // 2%
    const minBetAmount = new BN(10 * 1e9); // 10 APES
    const marketId = `market_${Date.now()}`;
    const marketIdBytes = Buffer.from(marketId);
    const marketIdLen = Buffer.alloc(4);
    marketIdLen.writeUInt32LE(marketIdBytes.length, 0);
    
    const creatorStakeAmount = new BN(marketData.creatorStake * 1e9);
    
    const categoryBytes = Buffer.from(marketData.category);
    const categoryLen = Buffer.alloc(4);
    categoryLen.writeUInt32LE(categoryBytes.length, 0);

    // Build instruction data
    const data = Buffer.concat([
      getInstructionDiscriminator("create_market"),
      marketType,
      questionLen,
      questionBytes,
      optionsData,
      resolutionDate.toArrayLike(Buffer, 'le', 8),
      creatorFeeRate.toArrayLike(Buffer, 'le', 8),
      minBetAmount.toArrayLike(Buffer, 'le', 8),
      marketIdLen,
      marketIdBytes,
      creatorStakeAmount.toArrayLike(Buffer, 'le', 8),
      categoryLen,
      categoryBytes
    ]);

    const createMarketIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: market.publicKey, isSigner: true, isWritable: true },
        { pubkey: platformState, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: marketEscrow, isSigner: false, isWritable: true },
        { pubkey: burnTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_MINT, isSigner: false, isWritable: false },
        { pubkey: accessControl, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: data,
    });

    const tx = new Transaction().add(createMarketIx);
    const sig = await connection.sendTransaction(tx, [wallet, market], { skipPreflight: false });
    await connection.confirmTransaction(sig);
    
    console.log("✅ Market created successfully!");
    console.log("   Transaction:", sig);
    console.log("   View on Solscan: https://solscan.io/tx/" + sig + "?cluster=devnet");
    console.log("   Market Address:", market.publicKey.toBase58());
    console.log("");
    console.log("🎉 Your first on-chain prediction market is LIVE!");
    console.log("");
    console.log("📱 Next Steps:");
    console.log("1. Start the frontend: cd src/frontend && npm run dev");
    console.log("2. Connect your wallet");
    console.log("3. You should see your market!");
    console.log("4. Users can now place predictions with APES tokens!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 