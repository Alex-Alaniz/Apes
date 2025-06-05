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
const crypto = require('crypto');

// Configuration
const PROGRAM_ID = new PublicKey('F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y');
const TOKEN_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');

// Load wallet
const secret = JSON.parse(fs.readFileSync('./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

// Anchor instruction discriminators (first 8 bytes of sha256 of "global:instruction_name")
function getDiscriminator(name) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

async function initializePlatform() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  console.log('🚀 Direct Platform Initialization\n');
  console.log('Admin Wallet:', wallet.publicKey.toBase58());
  
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
  
  // Check current status
  const platformInfo = await connection.getAccountInfo(platformState);
  const accessControlInfo = await connection.getAccountInfo(accessControl);
  
  console.log('Current Status:');
  console.log('- Platform State:', platformInfo ? '✅ Exists' : '❌ Not initialized');
  console.log('- Access Control:', accessControlInfo ? '✅ Exists' : '❌ Not initialized');
  
  if (platformInfo && accessControlInfo) {
    console.log('\n✅ Platform is already initialized!');
    console.log('\n📱 Ready for QA Testing:');
    console.log('1. Start frontend: cd src/frontend && npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Connect wallet and start testing!');
    return;
  }
  
  console.log('\n⚠️  Platform initialization is blocked by Anchor version incompatibility.');
  console.log('\n🎯 Options for QA Testing:');
  console.log('\n1. Frontend-Only Testing (Recommended):');
  console.log('   - Test wallet connection');
  console.log('   - Test UI/UX components');
  console.log('   - Test form validations');
  console.log('   - Test responsive design');
  
  console.log('\n2. Mock Data Testing:');
  console.log('   You can temporarily add mock data to test the full flow.');
  
  console.log('\n3. Deploy Fresh with Matching Versions:');
  console.log('   - Update all dependencies to @coral-xyz/anchor');
  console.log('   - Redeploy program');
  console.log('   - Run initialization');
  
  console.log('\n💻 To start frontend testing now:');
  console.log('cd ../../frontend && npm run dev');
  console.log('\nThe frontend will handle missing markets gracefully.');
}

initializePlatform().catch(console.error); 