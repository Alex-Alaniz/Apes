const { Connection, PublicKey } = require('@solana/web3.js');

async function main() {
  const connection = new Connection('https://api.devnet.solana.com');
  const marketPubkey = new PublicKey('6xH8L1A2aD6Mg4WKzwqvm7SZnYezFqeNCwJf2LmUVHpZ');
  
  console.log('🔍 Checking Market Account');
  console.log('==========================\n');
  
  const marketInfo = await connection.getAccountInfo(marketPubkey);
  
  if (marketInfo) {
    console.log('✅ Market exists on-chain!');
    console.log('Owner:', marketInfo.owner.toBase58());
    console.log('Data length:', marketInfo.data.length);
    console.log('Lamports:', marketInfo.lamports);
    console.log('Executable:', marketInfo.executable);
    
    // Check market escrow
    const [marketEscrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_escrow"), marketPubkey.toBuffer()],
      marketInfo.owner
    );
    
    const escrowInfo = await connection.getAccountInfo(marketEscrow);
    if (escrowInfo) {
      console.log('\n✅ Market escrow exists');
      console.log('Escrow address:', marketEscrow.toBase58());
      
      // Check token balance
      const balance = await connection.getTokenAccountBalance(marketEscrow);
      console.log('Escrow balance:', balance.value.uiAmount, 'APES');
    }
    
    console.log('\n🎉 Your market is live and ready for predictions!');
    console.log('Visit http://localhost:3000 to see it in the frontend');
  } else {
    console.log('❌ Market not found');
  }
}

main().catch(console.error); 