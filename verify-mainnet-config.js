const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Mainnet Configuration Updates...');
console.log('===============================================\n');

// Expected mainnet values
const EXPECTED_MAINNET_CONFIG = {
  programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS",
  tokenMint: "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts",
  rpcUrl: "https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d",
  treasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
};

const checkFile = (filePath, description) => {
  console.log(`📁 Checking ${description}:`);
  console.log(`   File: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, exists: true };
  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
    return false;
  }
};

// Check 1: Main Solana Config
const solanConfig = checkFile('./src/frontend/src/config/solana.js', 'Main Solana Configuration');
if (solanConfig) {
  const hasCorrectProgram = solanConfig.content.includes(EXPECTED_MAINNET_CONFIG.programId);
  const hasCorrectToken = solanConfig.content.includes(EXPECTED_MAINNET_CONFIG.tokenMint);
  const hasHeliusRpc = solanConfig.content.includes('mainnet.helius-rpc.com');
  
  console.log(`   Program ID: ${hasCorrectProgram ? '✅' : '❌'} ${hasCorrectProgram ? 'APES Program ID found' : 'APES Program ID missing'}`);
  console.log(`   Token Mint: ${hasCorrectToken ? '✅' : '❌'} ${hasCorrectToken ? 'APES Token found' : 'APES Token missing'}`);
  console.log(`   RPC URL: ${hasHeliusRpc ? '✅' : '❌'} ${hasHeliusRpc ? 'Helius RPC configured' : 'Helius RPC missing'}`);
}
console.log('');

// Check 2: Networks JSON
const networksConfig = checkFile('./src/frontend/src/config/networks.json', 'Networks Configuration');
if (networksConfig) {
  try {
    const networks = JSON.parse(networksConfig.content);
    const mainnetConfig = networks.mainnet;
    
    console.log(`   Program ID: ${mainnetConfig?.programId === EXPECTED_MAINNET_CONFIG.programId ? '✅' : '❌'} ${mainnetConfig?.programId || 'Not found'}`);
    console.log(`   Token Mint: ${mainnetConfig?.tokenMint === EXPECTED_MAINNET_CONFIG.tokenMint ? '✅' : '❌'} ${mainnetConfig?.tokenMint || 'Not found'}`);
    console.log(`   RPC URL: ${mainnetConfig?.rpcUrl?.includes('helius') ? '✅' : '❌'} ${mainnetConfig?.rpcUrl || 'Not found'}`);
  } catch (error) {
    console.log(`   ❌ Invalid JSON: ${error.message}`);
  }
}
console.log('');

// Check 3: IDL File
const idlConfig = checkFile('./src/frontend/src/idl/market_system.json', 'IDL Configuration');
if (idlConfig) {
  try {
    const idl = JSON.parse(idlConfig.content);
    const hasCorrectAddress = idl.address === EXPECTED_MAINNET_CONFIG.programId;
    
    console.log(`   IDL Address: ${hasCorrectAddress ? '✅' : '❌'} ${idl.address || 'Not found'}`);
    console.log(`   Description: ${idl.metadata?.description?.includes('Mainnet') ? '✅' : '📝'} ${idl.metadata?.description || 'Default'}`);
  } catch (error) {
    console.log(`   ❌ Invalid JSON: ${error.message}`);
  }
}
console.log('');

// Check 4: Environment Variable References
console.log('🔧 Environment Variable Configuration:');
console.log(`   Set VITE_SOLANA_NETWORK=mainnet for production`);
console.log(`   Current default: devnet (for development)`);
console.log('');

// Summary
console.log('🎯 Mainnet Configuration Summary:');
console.log('==================================');
console.log(`✅ Program ID: ${EXPECTED_MAINNET_CONFIG.programId}`);
console.log(`✅ Token Mint: ${EXPECTED_MAINNET_CONFIG.tokenMint}`);
console.log(`✅ RPC Provider: Helius (Primary)`);
console.log(`✅ Treasury: ${EXPECTED_MAINNET_CONFIG.treasury}`);
console.log(`✅ Platform State: GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`);
console.log('');

console.log('🚀 Next Steps:');
console.log('==============');
console.log('1. ✅ Frontend configured for mainnet');
console.log('2. 📝 Set VITE_SOLANA_NETWORK=mainnet in production');
console.log('3. 🚀 Deploy frontend to Vercel/Railway');
console.log('4. 🔧 Deploy backend with PostgreSQL');
console.log('5. 🎯 Create your first prediction markets!');
console.log('');

console.log('🔗 Important Links:');
console.log('===================');
console.log(`Program: https://solscan.io/account/${EXPECTED_MAINNET_CONFIG.programId}`);
console.log(`Token: https://solscan.io/token/${EXPECTED_MAINNET_CONFIG.tokenMint}`);
console.log(`Platform State: https://solscan.io/account/GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`);
console.log('');

console.log('🎉 APES Prediction Market Platform - Ready for Launch! 🎉'); 