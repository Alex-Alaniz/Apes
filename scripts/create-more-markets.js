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

function toFixedBuffer(str, size) {
  const buf = Buffer.alloc(size, 0);
  const bytes = Buffer.from(str);
  const len = Math.min(bytes.length, size);
  bytes.copy(buf, 0, 0, len);
  return buf;
}

async function createMarket(connection, wallet, marketData) {
  const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
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

  const burnTokenAccount = tokenAccount; // Using wallet as burn temporarily

  console.log(`📋 Creating Market: ${marketData.question}`);

  // Build instruction data
  const data = Buffer.concat([
    getInstructionDiscriminator("create_market"),
    Buffer.from([0]), // Binary market
    toFixedBuffer(marketData.question, 200),
    new BN(marketData.question.length).toArrayLike(Buffer, 'le', 2),
    toFixedBuffer(marketData.option1, 50),
    toFixedBuffer(marketData.option2, 50),
    Buffer.alloc(50, 0),
    Buffer.alloc(50, 0),
    Buffer.from([2]), // 2 options
    new BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * marketData.days).toArrayLike(Buffer, 'le', 8),
    new BN(200).toArrayLike(Buffer, 'le', 8), // 2% fee
    new BN(10 * 1e9).toArrayLike(Buffer, 'le', 8), // 10 APES min
    toFixedBuffer(`market_${Date.now()}`, 32),
    Buffer.from([20]), // market_id length
    new BN(marketData.stake * 1e9).toArrayLike(Buffer, 'le', 8),
    toFixedBuffer(marketData.category, 20),
    Buffer.from([marketData.category.length])
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
  
  console.log(`✅ Created! TX: ${sig}`);
  console.log(`   Market: ${market.publicKey.toBase58()}`);
  console.log("");
  
  return market.publicKey.toBase58();
}

async function main() {
  const walletPath = "./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("🚀 Creating Additional Markets");
  console.log("==============================\n");

  const markets = [
    {
      question: "Will Ethereum reach $10,000 in 2025?",
      option1: "Yes",
      option2: "No",
      category: "Crypto",
      stake: 50,
      days: 365
    },
    {
      question: "Will AI surpass human intelligence by 2030?",
      option1: "Yes",
      option2: "No",
      category: "Tech",
      stake: 75,
      days: 1825
    },
    {
      question: "Will SpaceX land on Mars before 2030?",
      option1: "Yes",
      option2: "No",
      category: "Space",
      stake: 100,
      days: 1825
    }
  ];

  const createdMarkets = [];
  
  for (const marketData of markets) {
    try {
      const marketPubkey = await createMarket(connection, wallet, marketData);
      createdMarkets.push(marketPubkey);
    } catch (e) {
      console.error(`Failed to create market: ${e.message}`);
    }
  }

  console.log("\n🎉 Summary:");
  console.log(`Created ${createdMarkets.length} markets successfully!`);
  console.log("\n📱 Visit http://localhost:3000 to see all your markets!");
}

main().catch(console.error); 