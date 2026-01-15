const { PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib');
const TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
const ADMIN_WALLET = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';

console.log('🚀 Manual Platform Initialization Guide\n');
console.log('Due to Anchor JS version compatibility issues, you need to initialize manually.\n');

// Derive PDAs
const [platformState] = PublicKey.findProgramAddressSync(
  [Buffer.from('platform_state')],
  PROGRAM_ID
);

const [accessControl] = PublicKey.findProgramAddressSync(
  [Buffer.from('access_control')],
  PROGRAM_ID
);

console.log('📋 Accounts:');
console.log('- Program ID:', PROGRAM_ID.toBase58());
console.log('- Platform State PDA:', platformState.toBase58());
console.log('- Access Control PDA:', accessControl.toBase58());
console.log('- Token Mint:', TOKEN_MINT.toBase58());
console.log('- Admin Wallet:', ADMIN_WALLET);

console.log('\n🔧 Option 1: Initialize using Anchor CLI');
console.log('cd src/smart_contracts/market_system');
console.log('anchor run initialize-access-control');
console.log('anchor run initialize-platform');

console.log('\n🔧 Option 2: Quick Fix - Try updating frontend to match');
console.log('The frontend is already configured to work with the deployed program.');
console.log('The issue is that the platform was never initialized after deployment.');

console.log('\n✅ WORKAROUND FOR QA TESTING:');
console.log('Since the Anchor version mismatch is blocking initialization,');
console.log('and the main goal is to test the frontend functionality, you can:');
console.log('\n1. Deploy a fresh program with matching versions');
console.log('2. OR use a different wallet/environment where it\'s already initialized');
console.log('3. OR focus on testing the frontend UI/UX without on-chain interactions');

console.log('\n📌 Frontend Features You Can Still Test:');
console.log('- Wallet connection');
console.log('- UI/UX navigation');
console.log('- Market display (will show empty)');
console.log('- Form validations');
console.log('- Responsive design');

console.log('\n⚡ To get the full experience working:');
console.log('1. Fix the Anchor version mismatch in all scripts');
console.log('2. Redeploy with consistent versions');
console.log('3. Initialize platform and access control');
console.log('4. Create test markets');
console.log('5. Test user interactions'); 