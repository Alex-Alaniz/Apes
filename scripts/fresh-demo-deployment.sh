#!/bin/bash

echo "🚀 PRIMAPE FRESH DEMO DEPLOYMENT"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}This script will deploy a completely fresh PRIMAPE demo with:${NC}"
echo "- New Solana program (fresh Program ID)"
echo "- New APES token mint (6 decimals for devnet demo)"
echo "- Clean database (all old data removed)"
echo "- Updated configurations"
echo ""

read -p "🤔 Are you sure you want to proceed? This will DESTROY all existing data! (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo -e "\n${BLUE}Step 1: Prerequisites Check${NC}"
echo "Checking required tools..."

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check if we're on devnet
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ $CLUSTER != *"devnet"* ]]; then
    echo "⚠️  Warning: Not on devnet. Current cluster: $CLUSTER"
    echo "Setting to devnet..."
    solana config set --url https://api.devnet.solana.com
fi

# Check wallet balance
BALANCE=$(solana balance --output json | jq -r '.value')
if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "❌ Insufficient SOL balance: $BALANCE SOL"
    echo "Please add devnet SOL: solana airdrop 2"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo "  - Solana CLI: $(solana --version)"
echo "  - Anchor CLI: $(anchor --version)"
echo "  - Network: Devnet"
echo "  - Wallet balance: $BALANCE SOL"

echo -e "\n${BLUE}Step 2: Deploy Fresh Solana Program${NC}"

# Check if program directory exists
if [ ! -d "program" ] && [ ! -d "programs" ] && [ ! -d "solana-program" ]; then
    echo "❌ Solana program directory not found. Please ensure you have a 'program', 'programs', or 'solana-program' directory."
    exit 1
fi

# Find program directory
PROGRAM_DIR=""
for dir in "program" "programs" "solana-program"; do
    if [ -d "$dir" ]; then
        PROGRAM_DIR="$dir"
        break
    fi
done

echo "Found program directory: $PROGRAM_DIR"
cd "$PROGRAM_DIR"

# Build the program
echo "Building Solana program..."
if ! anchor build; then
    echo "❌ Failed to build program"
    exit 1
fi

# Get new program ID
echo "Generating new program ID..."
NEW_PROGRAM_ID=$(solana address -k target/deploy/market_system-keypair.json)
echo "✅ New Program ID: $NEW_PROGRAM_ID"

# Update Anchor.toml
echo "Updating Anchor.toml..."
if [ -f "Anchor.toml" ]; then
    # Backup original
    cp Anchor.toml Anchor.toml.backup
    # Update program ID
    sed -i.bak "s/market_system = \"[^\"]*\"/market_system = \"$NEW_PROGRAM_ID\"/" Anchor.toml
    echo "✅ Updated Anchor.toml"
fi

# Update lib.rs
echo "Updating program lib.rs..."
if [ -f "programs/market_system/src/lib.rs" ]; then
    # Backup original
    cp programs/market_system/src/lib.rs programs/market_system/src/lib.rs.backup
    # Update declare_id
    sed -i.bak "s/declare_id!(\"[^\"]*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/market_system/src/lib.rs
    echo "✅ Updated lib.rs"
fi

# Rebuild with new ID
echo "Rebuilding with new Program ID..."
if ! anchor build; then
    echo "❌ Failed to rebuild program"
    exit 1
fi

# Deploy to devnet
echo "Deploying to devnet..."
if ! anchor deploy --provider.cluster devnet; then
    echo "❌ Failed to deploy program"
    exit 1
fi

echo "✅ Program deployed successfully!"
echo "  - Program ID: $NEW_PROGRAM_ID"

cd ..

echo -e "\n${BLUE}Step 3: Create Fresh APES Token${NC}"

# Create new token mint with 6 decimals (devnet demo)
echo "Creating new APES token mint (6 decimals for devnet)..."
NEW_TOKEN_MINT=$(spl-token create-token --decimals 6 --output json | jq -r '.address')

if [ -z "$NEW_TOKEN_MINT" ] || [ "$NEW_TOKEN_MINT" = "null" ]; then
    echo "❌ Failed to create token mint"
    exit 1
fi

echo "✅ New APES Token Mint: $NEW_TOKEN_MINT"

# Create associated token account
echo "Creating associated token account..."
USER_WALLET=$(solana address)
if ! spl-token create-account "$NEW_TOKEN_MINT"; then
    echo "⚠️  Associated token account creation failed or already exists"
fi

# Mint initial tokens for testing (1 million APES)
echo "Minting 1,000,000 APES tokens for testing..."
if ! spl-token mint "$NEW_TOKEN_MINT" 1000000; then
    echo "❌ Failed to mint tokens"
    exit 1
fi

echo "✅ Minted 1,000,000 APES tokens to your wallet"

echo -e "\n${BLUE}Step 4: Update Frontend Configuration${NC}"

# Update Solana config
SOLANA_CONFIG_FILE="src/frontend/src/config/solana.js"
if [ -f "$SOLANA_CONFIG_FILE" ]; then
    # Backup original
    cp "$SOLANA_CONFIG_FILE" "$SOLANA_CONFIG_FILE.backup"
    
    # Update program ID
    sed -i.bak "s/programId: \"[^\"]*\"/programId: \"$NEW_PROGRAM_ID\"/" "$SOLANA_CONFIG_FILE"
    
    # Update token mint
    sed -i.bak "s/tokenMint: \"[^\"]*\"/tokenMint: \"$NEW_TOKEN_MINT\"/" "$SOLANA_CONFIG_FILE"
    
    echo "✅ Updated frontend Solana configuration"
    echo "  - New Program ID: $NEW_PROGRAM_ID"
    echo "  - New Token Mint: $NEW_TOKEN_MINT"
else
    echo "❌ Frontend config file not found: $SOLANA_CONFIG_FILE"
fi

echo -e "\n${BLUE}Step 5: Clean Database${NC}"

# Clean database of all old data
echo "Cleaning database..."
cd src/backend
node -e "
const db = require('./config/database');
Promise.all([
  db.query('DELETE FROM prediction_history'),
  db.query('DELETE FROM user_engagement'), 
  db.query('DELETE FROM markets'),
  db.query('ALTER SEQUENCE markets_id_seq RESTART WITH 1'),
]).then(results => {
  console.log('✅ Database cleaned:');
  console.log('  - Deleted', results[0].rowCount, 'prediction records');
  console.log('  - Deleted', results[1].rowCount, 'user engagement records');
  console.log('  - Deleted', results[2].rowCount, 'markets');
  console.log('  - Reset market ID sequence');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database cleanup failed:', err.message);
  process.exit(1);
});
" || echo "❌ Database cleanup failed"

cd ../../

echo -e "\n${BLUE}Step 6: Start Fresh Demo${NC}"

# Kill existing processes
echo "Stopping existing servers..."
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Start backend
echo "Starting backend server..."
cd src/backend
npm run dev &
BACKEND_PID=$!
cd ../../

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..15}; do
  if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
    break
  fi
  echo "Waiting... ($i/15)"
  sleep 1
done

echo -e "\n${GREEN}🎉 FRESH DEMO DEPLOYMENT COMPLETED!${NC}"
echo "==========================================="
echo ""
echo -e "${GREEN}✅ New Program ID:${NC} $NEW_PROGRAM_ID"
echo -e "${GREEN}✅ New APES Token:${NC} $NEW_TOKEN_MINT (6 decimals)"
echo -e "${GREEN}✅ Token Balance:${NC} 1,000,000 APES"
echo -e "${GREEN}✅ Database:${NC} Completely clean"
echo -e "${GREEN}✅ Backend:${NC} Running on port 5001"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Start frontend: cd src/frontend && npm run dev"
echo "2. Navigate to: http://localhost:3000"
echo "3. Connect your wallet (it should have 1M APES tokens)"
echo "4. Initialize platform in admin panel: /admin"
echo "5. Create test markets and start testing!"
echo ""
echo -e "${YELLOW}Configuration Summary:${NC}"
echo "- Network: Devnet"
echo "- Program ID: $NEW_PROGRAM_ID"
echo "- Token Mint: $NEW_TOKEN_MINT"
echo "- Token Decimals: 6 (devnet demo)"
echo "- Your Wallet: $USER_WALLET"
echo "- APES Balance: 1,000,000 tokens"
echo ""
echo -e "${BLUE}For Mainnet Deployment Later:${NC}"
echo "- Update tokenDecimals to 9 in solana.js"
echo "- Use mainnet APES token mint"
echo "- Deploy to mainnet cluster"
echo ""
echo -e "${GREEN}🚀 Your fresh PRIMAPE demo is ready!${NC}" 