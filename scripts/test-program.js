const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey("FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib");

async function main() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  console.log('🔍 Testing Program Status');
  console.log('========================\n');
  
  // Get program account info
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  
  if (programInfo) {
    console.log('Program deployed: ✅');
    console.log('Program owner:', programInfo.owner.toBase58());
    console.log('Program executable:', programInfo.executable);
    console.log('Program data length:', programInfo.data.length);
    
    // Get recent deployment
    const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 5 });
    console.log('\nRecent transactions:');
    signatures.forEach((sig, i) => {
      console.log(`${i + 1}. ${sig.signature} (${new Date(sig.blockTime * 1000).toLocaleString()})`);
    });
  } else {
    console.log('Program not found ❌');
  }
  
  // Check Platform State
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_state")],
    PROGRAM_ID
  );
  
  const platformInfo = await connection.getAccountInfo(platformState);
  console.log('\nPlatform State:', platformInfo ? '✅ Initialized' : '❌ Not initialized');
  
  console.log('\n⚠️  Issue Analysis:');
  console.log('The "memory allocation failed" error is happening during instruction deserialization.');
  console.log('This suggests the create_market instruction is using String/Vec types in its parameters,');
  console.log('which cause dynamic allocation during deserialization.\n');
  console.log('Solution: Change the create_market parameters to use fixed-size arrays instead of String/Vec.');
}

main().catch(console.error); 