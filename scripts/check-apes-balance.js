const { Connection, PublicKey } = require('@solana/web3.js');

const TOKEN_MINT = new PublicKey("JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb"); // APES devnet token

async function main() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Example wallet - replace with your wallet address
  const walletAddress = process.argv[2];
  
  if (!walletAddress) {
    console.log('Usage: node check-apes-balance.js <wallet-address>');
    process.exit(1);
  }
  
  try {
    const wallet = new PublicKey(walletAddress);
    
    // Get associated token address
    const [tokenAccount] = PublicKey.findProgramAddressSync(
      [
        wallet.toBuffer(),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
        TOKEN_MINT.toBuffer(),
      ],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    
    // Get token account info
    const info = await connection.getAccountInfo(tokenAccount);
    
    if (!info) {
      console.log('\n❌ No APES token account found for this wallet');
      console.log('   You need to create a token account and get some APES tokens first');
    } else {
      // Parse token account data (simple parsing for amount)
      const data = info.data;
      // Token amount is stored at offset 64 as a u64 (8 bytes) in little-endian
      const amount = data.readBigUInt64LE(64);
      const decimals = 9; // APES has 9 decimals
      const balance = Number(amount) / Math.pow(10, decimals);
      
      console.log('\n💰 APES Token Balance');
      console.log('======================');
      console.log(`Wallet: ${walletAddress}`);
      console.log(`Balance: ${balance.toLocaleString()} APES`);
      console.log(`Token Account: ${tokenAccount.toString()}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error); 