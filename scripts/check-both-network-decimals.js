const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint } = require('@solana/spl-token');

async function checkBothNetworks() {
  console.log('=== Checking APES Token Decimals on Both Networks ===\n');
  
  // Devnet
  try {
    const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const devnetMint = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');
    const devnetMintInfo = await getMint(devnetConnection, devnetMint);
    
    console.log('DEVNET APES Token:');
    console.log('Mint:', devnetMint.toString());
    console.log('Decimals:', devnetMintInfo.decimals);
    console.log('');
  } catch (error) {
    console.error('Error fetching devnet mint:', error.message);
  }
  
  // Mainnet
  try {
    const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const mainnetMint = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
    const mainnetMintInfo = await getMint(mainnetConnection, mainnetMint);
    
    console.log('MAINNET APES Token:');
    console.log('Mint:', mainnetMint.toString());
    console.log('Decimals:', mainnetMintInfo.decimals);
    console.log('');
  } catch (error) {
    console.error('Error fetching mainnet mint:', error.message);
  }
  
  console.log('=== Recommendation ===');
  console.log('Use the actual decimals for each network to ensure correct token amounts.');
  console.log('When a user enters "10", they should lose exactly 10 tokens, not 10,000!');
}

checkBothNetworks(); 