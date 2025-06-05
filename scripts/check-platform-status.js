const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');

async function checkPlatformStatus() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  console.log('🔍 Checking Platform Status...\n');
  
  // Derive PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    PROGRAM_ID
  );
  
  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from('access_control')],
    PROGRAM_ID
  );
  
  // Check platform state
  const platformInfo = await connection.getAccountInfo(platformState);
  console.log(`Platform State (${platformState.toBase58()}):`, platformInfo ? '✅ Initialized' : '❌ Not initialized');
  
  // Check access control
  const accessControlInfo = await connection.getAccountInfo(accessControl);
  console.log(`Access Control (${accessControl.toBase58()}):`, accessControlInfo ? '✅ Initialized' : '❌ Not initialized');
  
  console.log('\n📋 Summary:');
  console.log('- Program ID:', PROGRAM_ID.toBase58());
  console.log('- Token Mint ($APES):', TOKEN_MINT.toBase58());
  
  if (!platformInfo || !accessControlInfo) {
    console.log('\n⚠️  Platform needs initialization before you can create markets.');
    console.log('\nDue to Anchor version compatibility issues with the scripts, please use one of these options:');
    console.log('\n1. Use the frontend UI to interact with the platform (once initialized)');
    console.log('2. Initialize manually using Solana CLI or a compatible Anchor version');
    console.log('3. Deploy a fresh instance with matching Anchor versions');
  } else {
    console.log('\n✅ Platform is ready! You can now:');
    console.log('1. Create markets through the frontend UI');
    console.log('2. Users can place bets with $APES tokens');
    console.log('3. Resolve markets and claim rewards');
  }
  
  console.log('\n🎯 For QA Testing:');
  console.log('1. Make sure your frontend is running on http://localhost:3000');
  console.log('2. Connect your wallet (with $APES tokens)');
  console.log('3. Navigate to the Markets page');
  console.log('4. If no markets exist, an admin/creator can create one');
  console.log('5. Regular users can place bets on active markets');
}

checkPlatformStatus().catch(console.error); 