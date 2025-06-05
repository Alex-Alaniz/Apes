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

// Helper to convert string to fixed-size buffer
function toFixedBuffer(str, size) {
  const buf = Buffer.alloc(size, 0);
  const bytes = Buffer.from(str);
  const len = Math.min(bytes.length, size);
  bytes.copy(buf, 0, 0, len);
  return buf;
}

async function main() {
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("🚀 Creating Market with Fixed Arrays");
  console.log("====================================");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("");

  try {
    const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    console.log("💰 APES Balance:", balance.value.uiAmount, "APES");

    // Market details
    const market = Keypair.generate();
    const question = "Will Bitcoin reach $150,000 by July 31, 2025?";
    const option1 = "Yes";
    const option2 = "No";
    const marketId = `market_${Date.now()}`;
    const category = "Crypto";

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
      wallet.publicKey  // Using wallet as burn address temporarily
    );

    console.log("📋 Creating Market:", question);
    console.log("Market Pubkey:", market.publicKey.toBase58());

    // Build instruction data with fixed arrays
    const data = Buffer.concat([
      getInstructionDiscriminator("create_market"),
      // market_type (Binary = 0)
      Buffer.from([0]),
      // question [u8; 200]
      toFixedBuffer(question, 200),
      // question_len u16
      new BN(question.length).toArrayLike(Buffer, 'le', 2),
      // option_1 [u8; 50]
      toFixedBuffer(option1, 50),
      // option_2 [u8; 50]
      toFixedBuffer(option2, 50),
      // option_3 [u8; 50] (empty)
      Buffer.alloc(50, 0),
      // option_4 [u8; 50] (empty)
      Buffer.alloc(50, 0),
      // option_count u8
      Buffer.from([2]),
      // resolution_date i64
      new BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 240).toArrayLike(Buffer, 'le', 8),
      // creator_fee_rate u64
      new BN(200).toArrayLike(Buffer, 'le', 8),
      // min_bet_amount u64
      new BN(10 * 1e9).toArrayLike(Buffer, 'le', 8),
      // market_id [u8; 32]
      toFixedBuffer(marketId, 32),
      // market_id_len u8
      Buffer.from([marketId.length]),
      // creator_stake_amount u64
      new BN(100 * 1e9).toArrayLike(Buffer, 'le', 8),
      // category [u8; 20]
      toFixedBuffer(category, 20),
      // category_len u8
      Buffer.from([category.length])
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
    
    console.log("\n✅ Market created successfully!");
    console.log("Transaction:", sig);
    console.log("View on Solscan: https://solscan.io/tx/" + sig + "?cluster=devnet");
    console.log("Market Address:", market.publicKey.toBase58());
    console.log("\n🎉 Your first on-chain prediction market is LIVE!");
    console.log("\n📱 Check the frontend at http://localhost:3000");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

main().catch(console.error); 