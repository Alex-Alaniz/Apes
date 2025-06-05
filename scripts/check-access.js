import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import anchorPkg from '@coral-xyz/anchor';
const { Program, AnchorProvider } = anchorPkg;
import fs from 'fs';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');

// Load IDL
const idl = JSON.parse(fs.readFileSync('../src/frontend/src/idl/market_system.json', 'utf8'));

async function checkAccess() {
  // Create a dummy provider just to read account data
  const dummyKeypair = {
    publicKey: PublicKey.default,
    secretKey: new Uint8Array(64)
  };
  
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: dummyKeypair.publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs
    },
    { commitment: 'confirmed' }
  );
  
  const program = new Program(idl, provider);
  
  try {
    // Find access control PDA
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from("access_control")],
      PROGRAM_ID
    );
    
    console.log('Access Control PDA:', accessControl.toString());
    
    // Fetch access control account
    const accessControlData = await program.account.accessControl.fetch(accessControl);
    
    console.log('\n📋 Access Control Details:');
    console.log('Admin:', accessControlData.admin.toString());
    console.log('\nMarket Creators:');
    if (accessControlData.marketCreators.length === 0) {
      console.log('  (none - only admin can create markets)');
    } else {
      accessControlData.marketCreators.forEach((creator, i) => {
        console.log(`  ${i + 1}. ${creator.toString()}`);
      });
    }
    
    // Check your wallet from DEPLOYER_PRIVATE_KEY
    console.log('\n🔍 Your wallet (from DEPLOYER_PRIVATE_KEY):');
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ DEPLOYER_PRIVATE_KEY not found in .env file');
      return;
    }
    
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    console.log(wallet.publicKey.toString());
    
    const isAdmin = wallet.publicKey.equals(accessControlData.admin);
    const isCreator = accessControlData.marketCreators.some(c => c.equals(wallet.publicKey));
    
    if (isAdmin) {
      console.log('✅ You are the ADMIN - you can create markets!');
    } else if (isCreator) {
      console.log('✅ You are a market creator - you can create markets!');
    } else {
      console.log('❌ You do NOT have permission to create markets');
      console.log('   Ask the admin to add you as a market creator');
    }
    
  } catch (error) {
    console.error('Error checking access control:', error);
  }
}

checkAccess(); 