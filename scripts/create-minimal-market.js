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
const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb");

function getInstructionDiscriminator(name) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

async function main() {
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("🚀 Creating Minimal Market");
  console.log("==========================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("");

  try {
    const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    console.log("💰 APES Balance:", balance.value.uiAmount, "APES");

    // Minimal market data
    const market = Keypair.generate();
    const marketData = {
      question: "BTC $150k?", // Very short question
      options: ["Y", "N"],     // Single character options
      category: "Crypto",
      creatorStake: 10,        // Minimal stake
    };

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

    console.log("📋 Creating Minimal Market:", marketData.question);
    console.log("Market Pubkey:", market.publicKey.toBase58());

    // Minimal instruction data
    const marketType = Buffer.from([0]); // Binary
    const questionBytes = Buffer.from(marketData.question);
    const questionLen = Buffer.alloc(4);
    questionLen.writeUInt32LE(questionBytes.length, 0);
    
    const optionsData = Buffer.concat([
      Buffer.from([2]), // 2 options
      Buffer.from([1]), // "Y" length
      Buffer.from("Y"),
      Buffer.from([1]), // "N" length  
      Buffer.from("N")
    ]);

    const resolutionDate = new BN(Math.floor(Date.now() / 1000) + 86400); // 1 day
    const creatorFeeRate = new BN(100); // 1%
    const minBetAmount = new BN(1e9); // 1 APES
    const marketId = `m${Date.now()}`.substring(0, 10); // Short ID
    const marketIdBytes = Buffer.from(marketId);
    const marketIdLen = Buffer.alloc(4);
    marketIdLen.writeUInt32LE(marketIdBytes.length, 0);
    
    const creatorStakeAmount = new BN(marketData.creatorStake * 1e9);
    
    const categoryBytes = Buffer.from("C"); // Single char category
    const categoryLen = Buffer.alloc(4);
    categoryLen.writeUInt32LE(categoryBytes.length, 0);

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
    
    console.log("\n✅ Minimal market created successfully!");
    console.log("Transaction:", sig);
    console.log("View on Solscan: https://solscan.io/tx/" + sig + "?cluster=devnet");
    console.log("\n🎉 Check the frontend at http://localhost:3000");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 