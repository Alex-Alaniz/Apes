const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration for mainnet deployment
const MAINNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_RPC, 'confirmed');

// Key addresses
const APES_TOKEN_MINT = '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts';
const TREASURY_ADDRESS = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';

async function deployParlayToMainnet() {
  console.log('🚀 Deploying CS2 Parlay Smart Contract to MAINNET...');
  console.log('⚠️  WARNING: This is a MAINNET deployment with real funds!');
  
  try {
    // Step 1: Check for deployer keypair
    const deployerPath = process.env.DEPLOYER_KEYPAIR_PATH || './deployer-keypair.json';
    
    if (!fs.existsSync(deployerPath)) {
      console.error('❌ Deployer keypair not found at:', deployerPath);
      console.log('💡 Set DEPLOYER_KEYPAIR_PATH environment variable or place keypair at ./deployer-keypair.json');
      return;
    }
    
    console.log('📂 Loading deployer keypair...');
    const deployerKeypairData = JSON.parse(fs.readFileSync(deployerPath, 'utf8'));
    const deployerKeypair = Keypair.fromSecretKey(new Uint8Array(deployerKeypairData));
    console.log(`📍 Deployer wallet: ${deployerKeypair.publicKey.toString()}`);
    
    // Step 2: Check SOL balance
    const balance = await connection.getBalance(deployerKeypair.publicKey);
    console.log(`💰 Deployer SOL balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 5 * LAMPORTS_PER_SOL) {
      console.error('❌ Insufficient SOL balance for deployment (need at least 5 SOL)');
      return;
    }
    
    // Step 3: Navigate to contract directory
    const contractPath = path.join(__dirname, '../src/smart_contracts/parlay_system');
    if (!fs.existsSync(contractPath)) {
      console.error('❌ Contract directory not found:', contractPath);
      return;
    }
    
    process.chdir(contractPath);
    console.log(`📁 Changed to contract directory: ${process.cwd()}`);
    
    // Step 4: Build the contract
    console.log('\n🔨 Building smart contract...');
    try {
      execSync('anchor build', { stdio: 'inherit' });
      console.log('✅ Contract built successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      return;
    }
    
    // Step 5: Update Anchor.toml for mainnet
    console.log('\n📝 Updating Anchor.toml for mainnet...');
    const anchorTomlPath = './Anchor.toml';
    let anchorToml = fs.readFileSync(anchorTomlPath, 'utf8');
    
    // Update provider to mainnet
    anchorToml = anchorToml.replace(
      /cluster = ".*"/,
      'cluster = "mainnet"'
    );
    
    // Set wallet path
    anchorToml = anchorToml.replace(
      /wallet = ".*"/,
      `wallet = "${path.resolve(deployerPath)}"`
    );
    
    fs.writeFileSync(anchorTomlPath, anchorToml);
    console.log('✅ Anchor.toml updated for mainnet');
    
    // Step 6: Deploy to mainnet
    console.log('\n🚢 Deploying to MAINNET...');
    console.log('⏳ This may take a few minutes...');
    
    try {
      const output = execSync('anchor deploy --provider.cluster mainnet', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      });
      
      console.log('✅ CONTRACT DEPLOYED TO MAINNET!');
      console.log(output);
      
      // Extract program ID from output
      const programIdMatch = output.match(/Program Id: (\w+)/);
      const programId = programIdMatch ? programIdMatch[1] : 'Check deployment logs';
      
      console.log('\n📋 Deployment Summary:');
      console.log('=====================================');
      console.log(`✅ Program ID: ${programId}`);
      console.log(`✅ Network: Mainnet-Beta`);
      console.log(`✅ Token Mint: ${APES_TOKEN_MINT}`);
      console.log(`✅ Treasury: ${TREASURY_ADDRESS}`);
      console.log('=====================================');
      
      // Step 7: Initialize the program
      console.log('\n🔧 Next Steps:');
      console.log('1. Initialize the parlay system with:');
      console.log(`   - Authority: ${deployerKeypair.publicKey.toString()}`);
      console.log(`   - Treasury: ${TREASURY_ADDRESS}`);
      console.log('   - Burn rates: 2.5% bet, 1.5% claim');
      console.log('2. Create CS2 tournament with proper exposure limits');
      console.log('3. Update frontend with new program ID');
      
      // Save deployment info
      const deploymentInfo = {
        programId: programId,
        deployedAt: new Date().toISOString(),
        deployer: deployerKeypair.publicKey.toString(),
        network: 'mainnet-beta',
        tokenMint: APES_TOKEN_MINT,
        treasury: TREASURY_ADDRESS,
        contractPath: contractPath
      };
      
      fs.writeFileSync(
        '../deployment-mainnet.json',
        JSON.stringify(deploymentInfo, null, 2)
      );
      
      console.log('\n✅ Deployment info saved to deployment-mainnet.json');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      console.error(error.stdout?.toString() || error.stderr?.toString());
      return;
    }
    
    // Step 8: Verify deployment
    console.log('\n🔍 Verifying deployment...');
    try {
      const output = execSync('anchor keys list', { encoding: 'utf8' });
      console.log('Program keys:', output);
    } catch (error) {
      console.error('⚠️ Could not verify deployment');
    }
    
    console.log('\n🎉 CS2 PARLAY SMART CONTRACT DEPLOYED TO MAINNET!');
    console.log('🏆 Ready for CS2 Esports World Cup 2025 betting!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Add confirmation prompt for mainnet deployment
if (require.main === module) {
  console.log('⚠️  MAINNET DEPLOYMENT CONFIRMATION');
  console.log('===================================');
  console.log('You are about to deploy to MAINNET with real funds.');
  console.log('This action cannot be undone.');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  setTimeout(() => {
    deployParlayToMainnet()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }, 5000);
}

module.exports = deployParlayToMainnet;