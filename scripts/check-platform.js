const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");

async function main() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  console.log('🔍 Checking Solana Prediction Market Platform Status');
  console.log('===================================================\n');
  
  // Check Platform State
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  
  const platformInfo = await connection.getAccountInfo(platformState);
  console.log('Platform State:', platformInfo ? '✅ Initialized' : '❌ Not initialized');
  console.log('Platform State Address:', platformState.toBase58());
  
  // Check Access Control
  const [accessControl] = PublicKey.findProgramAddressSync(
    [Buffer.from("access_control")],
    PROGRAM_ID
  );
  
  const accessInfo = await connection.getAccountInfo(accessControl);
  console.log('\nAccess Control:', accessInfo ? '✅ Initialized' : '❌ Not initialized');
  console.log('Access Control Address:', accessControl.toBase58());
  
  // Check for any markets
  console.log('\n📊 Checking for markets...');
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        dataSize: 691 // Actual size of Market accounts
      }
    ]
  });
  
  console.log(`Found ${accounts.length} market accounts`);
  
  if (accounts.length > 0) {
    console.log('\nMarkets:');
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.pubkey.toBase58()}`);
    });
  }
  
  console.log('\n📱 Frontend Status:');
  console.log('The frontend should be running at: http://localhost:3000');
  console.log('\n⚠️  Market Creation Issue:');
  console.log('The smart contract has a memory allocation issue when creating markets.');
  console.log('This needs to be fixed in the Rust code by optimizing the Market struct.');
  console.log('\nWorkaround options:');
  console.log('1. Try creating a market through the frontend UI');
  console.log('2. Use smaller strings for questions and options');
  console.log('3. Wait for a smart contract fix');
}

main().catch(console.error); 