const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createTransferInstruction
} = require('@solana/spl-token');
const BN = require('bn.js');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');

// Load wallet
const secret = JSON.parse(fs.readFileSync('./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

async function createMarket() {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Generate market keypair
    const market = Keypair.generate();
    
    // Derive PDAs
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform_state')],
      PROGRAM_ID
    );
    
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_escrow'), market.publicKey.toBuffer()],
      PROGRAM_ID
    );
    
    const [accessControl] = PublicKey.findProgramAddressSync(
      [Buffer.from('access_control')],
      PROGRAM_ID
    );
    
    // Get token accounts
    const creatorTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      wallet.publicKey
    );
    
    const burnTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      new PublicKey('11111111111111111111111111111111')
    );
    
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log('Wallet balance:', balance / 1e9, 'SOL');
    
    // For now, let's use a simple approach - create the market manually and transfer some tokens to escrow
    console.log('Market creation script is ready but needs proper instruction data encoding.');
    console.log('Market pubkey would be:', market.publicKey.toBase58());
    console.log('Platform state:', platformState.toBase58());
    console.log('Market escrow:', marketEscrow.toBase58());
    console.log('Access control:', accessControl.toBase58());
    
    // First, let's check if the platform is initialized
    const platformInfo = await connection.getAccountInfo(platformState);
    if (!platformInfo) {
      console.log('Platform state not initialized! Run initialize-platform.js first.');
      return;
    }
    
    const accessControlInfo = await connection.getAccountInfo(accessControl);
    if (!accessControlInfo) {
      console.log('Access control not initialized! Run initialize-access-control.js first.');
      return;
    }
    
    console.log('Platform is initialized. You can now create markets through the frontend.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createMarket(); 