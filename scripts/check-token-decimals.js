const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

async function checkTokenDecimals() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // APES devnet token
  const tokenMint = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');
  
  try {
    const mint = await getMint(connection, tokenMint);
    console.log('Token Mint:', tokenMint.toString());
    console.log('Decimals:', mint.decimals);
    console.log('Supply:', mint.supply.toString());
    console.log('');
    console.log('This means:');
    console.log('- If decimals = 0, then 10 in UI = 10 units on-chain');
    console.log('- If decimals = 9, then 10 in UI = 10,000,000,000 units on-chain');
    console.log('');
    console.log('Current config says decimals = 9');
    console.log('Actual decimals =', mint.decimals);
    
    if (mint.decimals !== 9) {
      console.log('\n⚠️  WARNING: Config decimals do not match actual mint decimals!');
      console.log('Update src/frontend/src/config/solana.js to use decimals:', mint.decimals);
    }
  } catch (error) {
    console.error('Error fetching mint:', error.message);
  }
}

checkTokenDecimals(); 