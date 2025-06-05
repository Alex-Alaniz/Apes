const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');

// Load wallet
const secret = JSON.parse(fs.readFileSync('./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

async function checkAndGuide() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  console.log('🔍 Checking Platform Status...\n');
  console.log('Admin Wallet:', wallet.publicKey.toBase58());
  
  // Check SOL balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('SOL Balance:', balance / 1e9, 'SOL');
  
  // Derive PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    PROGRAM_ID
  );
  
  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from('access_control')],
    PROGRAM_ID
  );
  
  // Check initialization status
  const platformInfo = await connection.getAccountInfo(platformState);
  const accessControlInfo = await connection.getAccountInfo(accessControl);
  
  console.log('\n📊 Platform Components:');
  console.log('- Platform State:', platformInfo ? '✅ Initialized' : '❌ Not initialized');
  console.log('- Access Control:', accessControlInfo ? '✅ Initialized' : '❌ Not initialized');
  
  if (!platformInfo || !accessControlInfo) {
    console.log('\n⚠️  Platform needs initialization.');
    console.log('\n🛠️  Manual Initialization Required:');
    console.log('Due to Anchor version compatibility issues, you need to:');
    console.log('1. Use the Anchor CLI from the smart contract directory');
    console.log('2. Or deploy a fresh version with consistent dependencies');
    console.log('\nFor now, you can test the frontend UI/UX without on-chain interactions.');
  } else {
    console.log('\n✅ Platform is initialized and ready!');
    console.log('\n🎯 You can now:');
    console.log('1. Start the frontend: cd src/frontend && npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Connect your wallet');
    console.log('4. Create markets and place bets!');
  }
  
  console.log('\n📱 Frontend Features Available for Testing:');
  console.log('- Wallet connection (Phantom, Solflare, etc.)');
  console.log('- UI/UX navigation and responsiveness');
  console.log('- Form validation on market creation');
  console.log('- Market display and filtering');
  console.log('- Dark mode theme');
  
  console.log('\n💡 Quick Test Checklist:');
  console.log('[ ] Wallet connects properly');
  console.log('[ ] Admin page accessible for admin wallet');
  console.log('[ ] Markets page loads without errors');
  console.log('[ ] Create market form validates inputs');
  console.log('[ ] Mobile responsive design works');
  console.log('[ ] Token balance displays correctly');
}

checkAndGuide().catch(console.error); 