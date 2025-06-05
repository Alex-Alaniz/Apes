#!/bin/bash

# PRIMAPE Markets - Mainnet Smart Contract Deployment
# Deploy smart contracts FIRST, then get real program ID for application

set -e  # Exit on any error

echo "🚀 PRIMAPE Markets - Mainnet Smart Contract Deployment"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check current balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance --url mainnet-beta | awk '{print $1}')
echo -e "Current balance: ${GREEN}$BALANCE SOL${NC}"

if (( $(echo "$BALANCE < 3" | bc -l) )); then
    echo -e "${RED}❌ Insufficient SOL for mainnet deployment${NC}"
    echo "Need at least 3 SOL for deployment costs"
    exit 1
fi

# Switch to mainnet
echo -e "\n🌐 Switching to mainnet-beta..."
solana config set --url mainnet-beta
echo -e "${GREEN}✅ Connected to mainnet-beta${NC}"

# Navigate to smart contracts directory
echo -e "\n📁 Navigating to smart contracts..."
if [ -d "src/smart_contracts/market_system" ]; then
    cd src/smart_contracts/market_system
    echo -e "${GREEN}✅ Found smart contracts directory${NC}"
else
    echo -e "${RED}❌ Smart contracts directory not found${NC}"
    exit 1
fi

# Check for existing program keypair or generate new one
echo -e "\n🔑 Setting up mainnet program keypair..."
mkdir -p target/deploy

if [ -f "target/deploy/market_system-keypair.json" ]; then
    NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/market_system-keypair.json)
    echo -e "${GREEN}✅ Using existing program keypair${NC}"
    echo -e "${BLUE}Program ID: $NEW_PROGRAM_ID${NC}"
else
    echo -e "${BLUE}Generating new program keypair...${NC}"
    solana-keygen new --outfile target/deploy/market_system-keypair.json --force --no-bip39-passphrase
    NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/market_system-keypair.json)
    echo -e "${GREEN}✅ New program keypair generated${NC}"
fi
echo -e "${GREEN}✅ New Mainnet Program ID: $NEW_PROGRAM_ID${NC}"

# Update Anchor.toml for mainnet
echo -e "\n📝 Updating Anchor.toml for mainnet..."
cp Anchor.toml Anchor.toml.backup
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/market_system = \".*\"/market_system = \"$NEW_PROGRAM_ID\"/" Anchor.toml
    sed -i '' "s/cluster = \".*\"/cluster = \"mainnet\"/" Anchor.toml
else
    # Linux
    sed -i "s/market_system = \".*\"/market_system = \"$NEW_PROGRAM_ID\"/" Anchor.toml
    sed -i "s/cluster = \".*\"/cluster = \"mainnet\"/" Anchor.toml
fi
echo -e "${GREEN}✅ Anchor.toml updated${NC}"

# Update lib.rs with new program ID
echo -e "\n📝 Updating lib.rs with mainnet program ID..."
if [ -f "programs/market_system/src/lib.rs" ]; then
    cp programs/market_system/src/lib.rs programs/market_system/src/lib.rs.backup
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/market_system/src/lib.rs
    else
        sed -i "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/market_system/src/lib.rs
    fi
    echo -e "${GREEN}✅ lib.rs updated${NC}"
fi

# Build the program
echo -e "\n🔨 Building program for mainnet..."
if ! anchor build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Program built successfully${NC}"

# Final confirmation before deployment
echo -e "\n${YELLOW}⚠️  MAINNET DEPLOYMENT WARNING${NC}"
echo "==============================="
echo "About to deploy to MAINNET with:"
echo "  • Program ID: $NEW_PROGRAM_ID"
echo "  • APES Token: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"
echo "  • Estimated Cost: ~2-3 SOL"
echo ""
read -p "Continue with mainnet deployment? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy to mainnet
echo -e "\n🚀 Deploying to mainnet..."
if ! anchor deploy --provider.cluster mainnet; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check your SOL balance and network connection"
    exit 1
fi

echo -e "${GREEN}✅ Smart contract deployed to mainnet!${NC}"

# Verify deployment
echo -e "\n🔍 Verifying deployment..."
if solana program show $NEW_PROGRAM_ID --url mainnet-beta > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Program verified on mainnet${NC}"
else
    echo -e "${RED}❌ Program verification failed${NC}"
    exit 1
fi

# Initialize platform
echo -e "\n🏗️  Initializing platform on mainnet..."
cd ../../..  # Back to root directory

# Create mainnet initialization script
cat > temp_mainnet_init.js << EOF
const { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Load IDL
const idl = require('./src/frontend/src/idl/market_system.json');

const config = {
  programId: "$NEW_PROGRAM_ID",
  tokenMint: "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts",
  rpcUrl: "https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN",
  treasuryAddress: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
};

async function initializePlatform() {
  console.log('🔧 Initializing platform on mainnet...');
  
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json', 'utf-8'));
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
    
    console.log('✅ Platform initialized!');
    console.log('Transaction:', tx);
    console.log('Solscan:', \`https://solscan.io/tx/\${tx}\`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

initializePlatform();
EOF

# Run initialization
echo "Running initialization..."
if ! node temp_mainnet_init.js; then
    echo -e "${RED}❌ Platform initialization failed${NC}"
    rm temp_mainnet_init.js
    exit 1
fi

# Cleanup
rm temp_mainnet_init.js

# Update frontend config with new program ID
echo -e "\n📝 Updating frontend configuration..."
FRONTEND_CONFIG="src/frontend/src/config/solana.js"
if [ -f "$FRONTEND_CONFIG" ]; then
    cp "$FRONTEND_CONFIG" "${FRONTEND_CONFIG}.backup"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/programId: \".*\"/programId: \"$NEW_PROGRAM_ID\"/" "$FRONTEND_CONFIG"
    else
        sed -i "s/programId: \".*\"/programId: \"$NEW_PROGRAM_ID\"/" "$FRONTEND_CONFIG"
    fi
    echo -e "${GREEN}✅ Frontend config updated${NC}"
fi

# Save program ID for reference
echo "$NEW_PROGRAM_ID" > MAINNET_PROGRAM_ID.txt

# Final summary
echo -e "\n${GREEN}🎉 MAINNET SMART CONTRACTS DEPLOYED!${NC}"
echo "======================================="
echo "  📍 Program ID: $NEW_PROGRAM_ID"
echo "  🪙 APES Token: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"
echo "  💰 Treasury: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
echo "  🔗 Solscan: https://solscan.io/account/$NEW_PROGRAM_ID"
echo ""
echo "✅ Program ID saved to: MAINNET_PROGRAM_ID.txt"
echo "✅ Frontend config updated automatically"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. ✅ Smart contracts deployed and initialized"
echo "2. 🚀 Now deploy the application:"
echo "   ./scripts/deploy-railway.sh"
echo "   OR"
echo "   ./scripts/deploy-vercel.sh"
echo ""
echo "3. 🧪 Test the application with real mainnet data"
echo ""
echo -e "${GREEN}Your prediction market is ready for application deployment!${NC}" 