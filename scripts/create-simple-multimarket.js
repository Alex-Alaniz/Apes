import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN, setProvider, Wallet } = anchorPkg;
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Load wallet from DEPLOYER_PRIVATE_KEY
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY not found in .env file');
}
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Setup
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

async function createMarket() {
  // Create wallet adapter
  const wallet = new Wallet(keypair);
  
  // Create provider
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
  
  setProvider(provider);
  
  const program = new Program(idl, provider);
  
  console.log('Creating multi-option market with LOW minimum bet...');
  console.log('Wallet:', wallet.publicKey.toString());
  
  try {
    const market = Keypair.generate();
    
    // PDAs
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
    
    // Token accounts
    const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey);
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey('4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS')
    );
    
    // Helper to convert string to bytes
    const stringToBytes = (str, maxLength) => {
      const bytes = new Uint8Array(maxLength);
      const encoded = new TextEncoder().encode(str.substring(0, maxLength));
      bytes.set(encoded);
      return Array.from(bytes);
    };
    
    // Market data
    const question = "Which team will win the 2025 Super Bowl?";
    const options = [
      "Kansas City Chiefs",
      "Buffalo Bills", 
      "San Francisco 49ers",
      "Philadelphia Eagles"
    ];
    
    // Create market with LOW minimum bet (1 APES = 1,000,000 units)
    const tx = await program.methods
      .createMarket(
        { multiOption: {} }, // Market type
        stringToBytes(question, 200),
        question.length,
        stringToBytes(options[0], 50),
        stringToBytes(options[1], 50),
        stringToBytes(options[2], 50),
        stringToBytes(options[3], 50),
        4, // option count
        new BN(Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60), // 60 days
        new BN(100), // 1% creator fee
        new BN(1_000_000), // 1 APES minimum bet (LOW!)
        stringToBytes(`market_${Date.now()}`, 32),
        20, // market id length
        new BN(2_000_000), // 2 APES creator stake
        stringToBytes("Sports", 20),
        6 // category length
      )
      .accounts({
        market: market.publicKey,
        platformState,
        creator: wallet.publicKey,
        creatorTokenAccount: userTokenAccount,
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
    
    console.log('\n✅ Multi-option market created successfully!');
    console.log('Transaction:', tx);
    console.log('\n📍 Market Details:');
    console.log('Market Public Key:', market.publicKey.toString());
    console.log('Question:', question);
    console.log('Options:');
    options.forEach((opt, i) => console.log(`  ${i+1}. ${opt}`));
    console.log('Minimum Bet: 1 APES');
    console.log('\nYou can now bet on any of the 4 options!');
    
  } catch (error) {
    console.error('Error:', error);
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
  }
}

createMarket(); 