/**
 * Setup script for Polymarket API credentials
 * This script helps you create a Polygon wallet and generate API credentials
 * 
 * Usage: node scripts/setup-polymarket-credentials.js
 */

const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CLOB_URL = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon Mainnet

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createWallet() {
  console.log('\n🔑 Creating new Polygon wallet...\n');
  
  const wallet = ethers.Wallet.createRandom();
  
  console.log('='.repeat(60));
  console.log('⚠️  IMPORTANT: Save these credentials securely!');
  console.log('='.repeat(60));
  console.log('Address:', wallet.address);
  console.log('Private Key:', wallet.privateKey);
  console.log('Mnemonic:', wallet.mnemonic.phrase);
  console.log('='.repeat(60));
  
  return wallet;
}

async function generateAPIKeys(privateKey) {
  console.log('\n🔄 Generating API credentials...\n');
  
  const wallet = new ethers.Wallet(privateKey);
  
  // Create EIP-712 domain
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: CHAIN_ID
  };
  
  // Create auth message
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 0;
  
  const types = {
    ClobAuth: [
      { name: 'address', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' }
    ]
  };
  
  const value = {
    address: wallet.address,
    timestamp: timestamp,
    nonce: nonce,
    message: 'Generate API Key'
  };
  
  // Sign the message
  const signature = await wallet._signTypedData(domain, types, value);
  
  // Request API keys
  try {
    const response = await axios.post(`${CLOB_URL}/auth/api-key`, {}, {
      headers: {
        'POLY_ADDRESS': wallet.address,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp.toString(),
        'POLY_NONCE': nonce.toString()
      }
    });
    
    console.log('✅ API Credentials Generated!\n');
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      apiKey: response.data.apiKey,
      apiSecret: response.data.secret,
      passphrase: response.data.passphrase
    };
  } catch (error) {
    console.error('❌ Error generating API keys:', error.response?.data || error.message);
    throw error;
  }
}

async function saveToEnv(credentials) {
  const envPath = path.join(__dirname, '../../.env');
  const envExamplePath = path.join(__dirname, '../../.env.example');
  
  // Create .env if it doesn't exist
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    } else {
      fs.writeFileSync(envPath, '');
    }
  }
  
  // Read existing .env
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Add or update Polymarket credentials
  const polymarketConfig = `
# Polymarket Configuration (Generated ${new Date().toISOString()})
USE_POLYMARKET_CLOB=true
POLYGON_ADDRESS=${credentials.address}
POLYGON_PRIVATE_KEY=${credentials.privateKey}
POLYMARKET_API_KEY=${credentials.apiKey}
POLYMARKET_API_SECRET=${credentials.apiSecret}
POLYMARKET_PASSPHRASE=${credentials.passphrase}
POLYGON_RPC_URL=https://polygon-rpc.com
`;

  // Check if Polymarket config already exists
  if (envContent.includes('# Polymarket Configuration')) {
    console.log('\n⚠️  Existing Polymarket configuration found in .env');
    const overwrite = await question('Overwrite existing configuration? (y/N): ');
    
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n📝 Add these to your .env manually:\n');
      console.log(polymarketConfig);
      return;
    }
    
    // Remove old Polymarket config
    envContent = envContent.replace(/# Polymarket Configuration[\s\S]*?(?=\n#|$)/g, '');
  }
  
  // Append new config
  envContent = envContent.trimEnd() + '\n' + polymarketConfig;
  
  // Write back to .env
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Credentials saved to .env file');
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Polymarket API Setup Script');
  console.log('='.repeat(60));
  
  const choice = await question(`
Choose an option:
1. Create new wallet and generate API credentials
2. Use existing private key to generate API credentials
3. Exit

Your choice (1-3): `);
  
  let credentials;
  
  switch (choice) {
    case '1':
      // Create new wallet
      const wallet = await createWallet();
      const saveWallet = await question('\n💾 Save this wallet for API generation? (Y/n): ');
      
      if (saveWallet.toLowerCase() !== 'n') {
        credentials = await generateAPIKeys(wallet.privateKey);
      }
      break;
      
    case '2':
      // Use existing private key
      const privateKey = await question('\nEnter your Polygon private key: ');
      
      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        console.error('❌ Invalid private key format');
        rl.close();
        return;
      }
      
      credentials = await generateAPIKeys(privateKey);
      break;
      
    case '3':
      console.log('\n👋 Goodbye!');
      rl.close();
      return;
      
    default:
      console.log('\n❌ Invalid choice');
      rl.close();
      return;
  }
  
  if (credentials) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 Your Polymarket Credentials:');
    console.log('='.repeat(60));
    console.log('Address:', credentials.address);
    console.log('API Key:', credentials.apiKey);
    console.log('API Secret:', credentials.apiSecret);
    console.log('Passphrase:', credentials.passphrase);
    console.log('='.repeat(60));
    
    const save = await question('\n💾 Save to .env file? (Y/n): ');
    
    if (save.toLowerCase() !== 'n') {
      await saveToEnv(credentials);
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Fund your wallet with MATIC for gas fees');
    console.log('2. Fund your wallet with USDC for trading');
    console.log('3. Test the connection: node scripts/test-polymarket-clob.js');
    console.log('4. Enable in production: USE_POLYMARKET_CLOB=true');
  }
  
  rl.close();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});