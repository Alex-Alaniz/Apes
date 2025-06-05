const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY
} = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y');
const TOKEN_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');

// Load wallet
const secret = JSON.parse(fs.readFileSync('./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

// Instruction discriminators from IDL
const INITIALIZE_ACCESS_CONTROL_DISCRIMINATOR = Buffer.from([244, 90, 245, 242, 199, 224, 247, 140]);
const INITIALIZE_PLATFORM_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

async function manualInit() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  console.log('🚀 Manual Platform Initialization');
  console.log('==================================');
  console.log('Admin Wallet:', wallet.publicKey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Token Mint:', TOKEN_MINT.toBase58());
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('SOL Balance:', balance / 1e9, 'SOL\n');
  
  // Derive PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    PROGRAM_ID
  );
  
  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from('access_control')],
    PROGRAM_ID
  );
  
  console.log('Platform State PDA:', platformState.toBase58());
  console.log('Access Control PDA:', accessControl.toBase58());
  
  // Check current status
  const platformInfo = await connection.getAccountInfo(platformState);
  const accessControlInfo = await connection.getAccountInfo(accessControl);
  
  console.log('\nCurrent Status:');
  console.log('- Platform State:', platformInfo ? '✅ Exists' : '❌ Not initialized');
  console.log('- Access Control:', accessControlInfo ? '✅ Exists' : '❌ Not initialized');
  
  try {
    // Step 1: Initialize Access Control (if not exists)
    if (!accessControlInfo) {
      console.log('\n📋 Step 1: Initializing Access Control...');
      
      const initAccessControlIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: accessControl, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: INITIALIZE_ACCESS_CONTROL_DISCRIMINATOR,
      });
      
      const tx1 = new Transaction().add(initAccessControlIx);
      const sig1 = await sendAndConfirmTransaction(connection, tx1, [wallet], {
        commitment: 'confirmed',
        maxRetries: 3,
      });
      
      console.log('✅ Access Control initialized!');
      console.log('   Transaction:', sig1);
      console.log('   View on Solscan: https://solscan.io/tx/' + sig1 + '?cluster=devnet');
    } else {
      console.log('\n✅ Access Control already initialized');
    }
    
    // Step 2: Initialize Platform State (if not exists)
    if (!platformInfo) {
      console.log('\n📋 Step 2: Initializing Platform State...');
      
      // Instruction data: discriminator + bet_burn_rate + claim_burn_rate + platform_fee_rate
      const instructionData = Buffer.concat([
        INITIALIZE_PLATFORM_DISCRIMINATOR,
        Buffer.from([50, 0, 0, 0, 0, 0, 0, 0]), // bet_burn_rate: 50 (0.5%)
        Buffer.from([50, 0, 0, 0, 0, 0, 0, 0]), // claim_burn_rate: 50 (0.5%)
        Buffer.from([100, 0, 0, 0, 0, 0, 0, 0]) // platform_fee_rate: 100 (1%)
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
        data: instructionData,
      });
      
      const tx2 = new Transaction().add(initPlatformIx);
      const sig2 = await sendAndConfirmTransaction(connection, tx2, [wallet], {
        commitment: 'confirmed',
        maxRetries: 3,
      });
      
      console.log('✅ Platform State initialized!');
      console.log('   Transaction:', sig2);
      console.log('   View on Solscan: https://solscan.io/tx/' + sig2 + '?cluster=devnet');
    } else {
      console.log('\n✅ Platform State already initialized');
    }
    
    console.log('\n🎉 Platform initialization complete!');
    console.log('\n✅ Your Solana Prediction Market Platform is now LIVE on devnet!');
    console.log('\n📱 Ready for QA Testing:');
    console.log('1. cd ../../frontend && npm run dev');
    console.log('2. Visit http://localhost:3000/admin/deploy-markets');
    console.log('3. Connect your admin wallet');
    console.log('4. Deploy markets from Polymarket');
    console.log('5. Test the full platform functionality!');
    console.log('\n🔗 Important Links:');
    console.log('- Program: https://solscan.io/account/' + PROGRAM_ID.toBase58() + '?cluster=devnet');
    console.log('- Token: https://solscan.io/token/' + TOKEN_MINT.toBase58() + '?cluster=devnet');
    console.log('- Platform State: https://solscan.io/account/' + platformState.toBase58() + '?cluster=devnet');
    
  } catch (error) {
    console.error('\n❌ Error during initialization:', error);
    
    if (error.logs) {
      console.error('Program logs:', error.logs);
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check if you have enough SOL for transaction fees');
    console.log('2. Make sure the Program ID is correct');
    console.log('3. Verify the wallet has admin privileges');
    console.log('4. Check Solana network status');
  }
}

manualInit().catch(console.error); 