#!/bin/bash

# Enhanced Solana Prediction Market Platform - Safe Mainnet Deployment
# This script includes comprehensive safeguards to prevent deployment failures

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_SOL_BALANCE=5.0
PROGRAM_ID="APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS"
WALLET_ADDRESS="APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
APES_TOKEN="9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"
TREASURY_ADDRESS="APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
RPC_URL="https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d"

echo -e "${BLUE}🚀 Enhanced Solana Prediction Market Platform Deployment${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ Error: $1 is not installed${NC}"
        exit 1
    fi
}

# Function to check SOL balance
check_sol_balance() {
    local balance=$(solana balance --url mainnet-beta | grep -oE '[0-9]+\.?[0-9]*')
    local balance_int=$(echo "$balance" | cut -d'.' -f1)
    
    if (( balance_int < ${REQUIRED_SOL_BALANCE%.*} )); then
        echo -e "${RED}❌ Insufficient SOL balance: ${balance} SOL${NC}"
        echo -e "${YELLOW}Required: ${REQUIRED_SOL_BALANCE} SOL minimum${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ SOL Balance: ${balance} SOL${NC}"
}

# Function to validate program size
check_program_size() {
    local program_file="src/smart_contracts/market_system/target/deploy/market_system.so"
    if [[ ! -f "$program_file" ]]; then
        echo -e "${RED}❌ Program file not found: $program_file${NC}"
        exit 1
    fi
    
    local size=$(stat -f%z "$program_file" 2>/dev/null || stat -c%s "$program_file" 2>/dev/null)
    local size_mb=$((size / 1024 / 1024))
    
    if (( size > 1048576 )); then  # 1MB limit
        echo -e "${RED}❌ Program too large: ${size_mb}MB (max 1MB)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Program size: $((size / 1024))KB${NC}"
}

# Function to validate RPC connection
check_rpc_connection() {
    echo -e "${YELLOW}🔗 Testing RPC connection...${NC}"
    if ! solana cluster-version --url mainnet-beta >/dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to Solana mainnet${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ RPC connection successful${NC}"
}

# Function to validate program ID
validate_program_id() {
    local keypair_file="src/smart_contracts/market_system/target/deploy/market_system-keypair.json"
    local actual_id=$(solana address -k "$keypair_file")
    
    if [[ "$actual_id" != "$PROGRAM_ID" ]]; then
        echo -e "${RED}❌ Program ID mismatch!${NC}"
        echo -e "${RED}Expected: $PROGRAM_ID${NC}"
        echo -e "${RED}Actual: $actual_id${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Program ID validated: $PROGRAM_ID${NC}"
}

# Function to validate APES token
validate_apes_token() {
    echo -e "${YELLOW}🪙 Validating APES token...${NC}"
    if ! solana account "$APES_TOKEN" --url mainnet-beta >/dev/null 2>&1; then
        echo -e "${RED}❌ APES token not found on mainnet${NC}"
        echo -e "${RED}Token: $APES_TOKEN${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ APES token validated: $APES_TOKEN${NC}"
}

# Function to check if program already exists
check_existing_program() {
    echo -e "${YELLOW}🔍 Checking if program already exists...${NC}"
    if solana account "$PROGRAM_ID" --url mainnet-beta >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Program already exists on mainnet${NC}"
        echo -e "${YELLOW}This will be an upgrade operation${NC}"
        read -p "Continue with upgrade? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Deployment cancelled${NC}"
            exit 0
        fi
    else
        echo -e "${GREEN}✅ New program deployment${NC}"
    fi
}

# Function to validate dependencies
check_dependencies() {
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    if ! node --version >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js is required for platform initialization${NC}"
        exit 1
    fi
    
    if [[ ! -f "package.json" ]]; then
        echo -e "${RED}❌ package.json not found for platform initialization${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies validated${NC}"
}

# Pre-deployment checks
echo -e "\n${BLUE}🔍 Running Pre-deployment Checks${NC}"
echo "=================================="

check_command "solana"
check_command "anchor"
check_command "node"
check_rpc_connection
check_sol_balance
validate_program_id
check_program_size
validate_apes_token
check_existing_program
check_dependencies

# Environment setup
echo -e "\n${BLUE}⚙️  Setting up deployment environment${NC}"
echo "======================================"

solana config set --url mainnet-beta
solana config set --keypair APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json

echo -e "${GREEN}✅ Environment configured${NC}"

# Final confirmation
echo -e "\n${YELLOW}⚠️  FINAL CONFIRMATION${NC}"
echo "===================="
echo -e "Program ID: ${GREEN}$PROGRAM_ID${NC}"
echo -e "Wallet: ${GREEN}$WALLET_ADDRESS${NC}"
echo -e "APES Token: ${GREEN}$APES_TOKEN${NC}"
echo -e "Treasury: ${GREEN}$TREASURY_ADDRESS${NC}"
echo -e "Network: ${GREEN}Mainnet${NC}"
echo
read -p "Proceed with deployment? (type 'DEPLOY' to confirm): " confirm
if [[ "$confirm" != "DEPLOY" ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy contracts
echo -e "\n${BLUE}🚀 Deploying Smart Contracts${NC}"
echo "============================="

cd src/smart_contracts/market_system

echo -e "${YELLOW}📦 Building program...${NC}"
if ! anchor build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Deploying program...${NC}"
if ! anchor deploy --provider.cluster mainnet; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Check your SOL balance and try again${NC}"
    exit 1
fi

# Verify deployment
echo -e "\n${BLUE}✅ Verifying Deployment${NC}"
echo "======================"

program_account=$(solana account "$PROGRAM_ID" --url mainnet-beta --output json 2>/dev/null)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Program successfully deployed and verified${NC}"
    echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"
else
    echo -e "${RED}❌ Program verification failed${NC}"
    exit 1
fi

# Initialize platform
echo -e "\n${BLUE}🏗️  Initializing Platform${NC}"
echo "========================="

cd ../../..  # Back to root directory

# Create platform initialization script
cat > temp_mainnet_init.js << EOF
const { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Load IDL
const idl = require('./src/frontend/src/idl/market_system.json');

const config = {
  programId: "$PROGRAM_ID",
  tokenMint: "$APES_TOKEN",
  rpcUrl: "$RPC_URL",
  treasuryAddress: "$TREASURY_ADDRESS"
};

async function initializePlatform() {
  console.log('🔧 Initializing platform on mainnet...');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('$WALLET_ADDRESS.json', 'utf-8'));
  const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  // Setup connection and provider
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const wallet = new (require('@coral-xyz/anchor')).Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  
  const program = new Program(idl, provider);
  
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    program.programId
  );
  
  try {
    console.log('📍 Platform State Address:', platformState.toString());
    console.log('🪙 Token Mint:', config.tokenMint);
    console.log('💰 Treasury:', config.treasuryAddress);
    
    const tx = await program.methods
      .initialize(
        new BN(250), // 2.5% bet burn rate  
        new BN(150), // 1.5% claim burn rate
        new BN(100)  // 1% platform fee
      )
      .accounts({
        platformState,
        authority: walletKeypair.publicKey,
        tokenMint: new PublicKey(config.tokenMint),
        treasury: new PublicKey(config.treasuryAddress),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('✅ Platform initialized successfully!');
    console.log('📝 Transaction:', tx);
    console.log('🔍 Solscan:', \`https://solscan.io/tx/\${tx}\`);
    
  } catch (error) {
    if (error.message && error.message.includes('already in use')) {
      console.log('✅ Platform already initialized');
    } else {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    }
  }
}

initializePlatform().catch(console.error);
EOF

echo -e "${YELLOW}🔧 Installing dependencies...${NC}"
if ! npm install >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  npm install failed, trying with existing packages${NC}"
fi

echo -e "${YELLOW}🏗️  Running platform initialization...${NC}"
if ! node temp_mainnet_init.js; then
    echo -e "${RED}❌ Platform initialization failed${NC}"
    rm -f temp_mainnet_init.js
    exit 1
fi

# Cleanup
rm -f temp_mainnet_init.js

# Update frontend configuration
echo -e "\n${BLUE}📝 Updating Frontend Configuration${NC}"
echo "=================================="

FRONTEND_CONFIG="src/frontend/src/config/solana.js"
if [ -f "$FRONTEND_CONFIG" ]; then
    cp "$FRONTEND_CONFIG" "${FRONTEND_CONFIG}.backup"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/programId: \".*\"/programId: \"$PROGRAM_ID\"/" "$FRONTEND_CONFIG"
        sed -i '' "s/tokenMint: \".*\"/tokenMint: \"$APES_TOKEN\"/" "$FRONTEND_CONFIG"
    else
        sed -i "s/programId: \".*\"/programId: \"$PROGRAM_ID\"/" "$FRONTEND_CONFIG"
        sed -i "s/tokenMint: \".*\"/tokenMint: \"$APES_TOKEN\"/" "$FRONTEND_CONFIG"
    fi
    echo -e "${GREEN}✅ Frontend config updated${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend config not found, skipping${NC}"
fi

# Save deployment info
echo -e "\n${BLUE}💾 Saving Deployment Information${NC}"
echo "==============================="

# Save program ID
echo "$PROGRAM_ID" > MAINNET_PROGRAM_ID.txt

# Save complete deployment info
cat > MAINNET_DEPLOYMENT_INFO.json << EOF
{
  "programId": "$PROGRAM_ID",
  "apesToken": "$APES_TOKEN", 
  "treasury": "$TREASURY_ADDRESS",
  "wallet": "$WALLET_ADDRESS",
  "rpcUrl": "$RPC_URL",
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "solscanProgram": "https://solscan.io/account/$PROGRAM_ID",
  "solscanToken": "https://solscan.io/token/$APES_TOKEN"
}
EOF

echo -e "${GREEN}✅ Deployment info saved${NC}"

# Check final balance
final_balance=$(solana balance --url mainnet-beta)
echo -e "${GREEN}💰 Final SOL balance: $final_balance${NC}"

echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}=========================${NC}"
echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"
echo -e "${GREEN}APES Token: $APES_TOKEN${NC}"
echo -e "${GREEN}Treasury: $TREASURY_ADDRESS${NC}"
echo -e "${GREEN}Network: Mainnet${NC}"
echo -e "${GREEN}Status: Deployed, Initialized & Verified${NC}"
echo ""
echo -e "${BLUE}🔗 Links:${NC}"
echo -e "📍 Program: https://solscan.io/account/$PROGRAM_ID"
echo -e "🪙 APES Token: https://solscan.io/token/$APES_TOKEN"
echo -e "💰 Treasury: https://solscan.io/account/$TREASURY_ADDRESS"
echo ""
echo -e "${BLUE}📁 Files Created:${NC}"
echo -e "• MAINNET_PROGRAM_ID.txt"
echo -e "• MAINNET_DEPLOYMENT_INFO.json"
echo -e "• Frontend config updated"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "1. ✅ Smart contracts deployed and initialized"
echo -e "2. 🚀 Deploy the application:"
echo -e "   ./scripts/deploy-railway.sh OR ./scripts/deploy-vercel.sh"
echo -e "3. 🧪 Test with real mainnet data"
echo ""
echo -e "${GREEN}Your APES prediction market is ready! 🦍${NC}" 