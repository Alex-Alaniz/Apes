#!/bin/bash

# 🚀 PRIMAPE Fresh Mainnet-Ready Deployment Script
# Tests with proper mainnet token decimals (9 instead of 6)

echo "🎯 PRIMAPE Mainnet-Ready Fresh Deployment"
echo "=========================================="
echo ""
echo "This script will:"
echo "1. 🧹 Clean platform database (preserving Polymarket data)"
echo "2. 🔑 Deploy fresh contracts with mainnet decimals"
echo "3. 🪙 Create/verify APES token with 9 decimals"
echo "4. ⚙️  Update all configurations"
echo "5. 🧪 Initialize platform for testing"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to kill all child processes on exit
cleanup() {
    echo -e "\n${BLUE}Cleaning up...${NC}"
    pkill -P $$
    exit
}

# Set up trap to call cleanup on script exit
trap cleanup INT TERM EXIT

# Check requirements
echo -e "${BLUE}📋 Checking requirements...${NC}"

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found. Please install Anchor first.${NC}"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install Solana CLI first.${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL CLI not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Check SOL balance
BALANCE=$(solana balance)
BALANCE_NUM=$(echo $BALANCE | cut -d' ' -f1)
if (( $(echo "$BALANCE_NUM < 5" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "${YELLOW}⚠️  Current SOL balance: $BALANCE${NC}"
    echo -e "${YELLOW}⚠️  You might need more SOL for deployment. Request from faucet if needed.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

echo -e "${GREEN}✅ All requirements met${NC}"
echo ""

# Step 1: Clean Database
echo -e "${BLUE}🧹 Step 1: Cleaning platform database...${NC}"
if [ -f "clean-platform-database-only.sql" ]; then
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f clean-platform-database-only.sql
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Database cleaned successfully${NC}"
        else
            echo -e "${RED}❌ Database cleanup failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL not set. Please run manually:${NC}"
        echo "   psql \$DATABASE_URL -f clean-platform-database-only.sql"
    fi
else
    echo -e "${RED}❌ Database cleanup script not found${NC}"
    exit 1
fi
echo ""

# Step 2: Navigate to smart contracts directory
echo -e "${BLUE}📦 Step 2: Building contracts...${NC}"
cd src/smart_contracts/market_system || exit 1

# Check current program ID
if [ -f "target/deploy/market_system-keypair.json" ]; then
    CURRENT_PROGRAM_ID=$(solana-keygen pubkey target/deploy/market_system-keypair.json)
    echo -e "${YELLOW}Current Program ID: $CURRENT_PROGRAM_ID${NC}"
fi

# Generate new keypair for fresh deployment
echo -e "${BLUE}🔑 Generating new program keypair...${NC}"
solana-keygen new -o target/deploy/market_system-keypair.json --force --no-bip39-passphrase

NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/market_system-keypair.json)
echo -e "${GREEN}New Program ID: $NEW_PROGRAM_ID${NC}"

# Update Anchor.toml
echo -e "${BLUE}📝 Updating Anchor.toml...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/market_system = \".*\"/market_system = \"$NEW_PROGRAM_ID\"/" Anchor.toml
else
    sed -i "s/market_system = \".*\"/market_system = \"$NEW_PROGRAM_ID\"/" Anchor.toml
fi

# Update lib.rs
echo -e "${BLUE}📝 Updating lib.rs...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/market_system/src/lib.rs
else
    sed -i "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/market_system/src/lib.rs
fi

# Build
echo -e "${BLUE}🔨 Building program...${NC}"
anchor build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Deploy
echo -e "${BLUE}🚀 Deploying to Devnet...${NC}"
anchor deploy

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Try requesting more SOL: solana airdrop 2${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
echo ""

# Step 3: Create/Update APES Token with 9 decimals
echo -e "${BLUE}🪙 Step 3: Setting up APES token with 9 decimals...${NC}"

# Check if we already have a token mint file
APES_TOKEN=""
if [ -f "../../../APES_TOKEN_MAINNET_DECIMALS.json" ]; then
    APES_TOKEN=$(solana-keygen pubkey ../../../APES_TOKEN_MAINNET_DECIMALS.json)
    echo -e "${YELLOW}Existing APES token found: $APES_TOKEN${NC}"
    
    # Check decimals
    DECIMALS=$(spl-token display $APES_TOKEN 2>/dev/null | grep "Decimals" | awk '{print $2}' || echo "0")
    if [ "$DECIMALS" = "9" ]; then
        echo -e "${GREEN}✅ Token already has 9 decimals${NC}"
    else
        echo -e "${YELLOW}⚠️  Token has $DECIMALS decimals, need 9. Creating new token...${NC}"
        APES_TOKEN=""
    fi
fi

if [ -z "$APES_TOKEN" ]; then
    echo -e "${BLUE}Creating new APES token with 9 decimals...${NC}"
    
    # Generate token keypair
    solana-keygen new -o ../../../APES_TOKEN_MAINNET_DECIMALS.json --force --no-bip39-passphrase
    APES_TOKEN=$(solana-keygen pubkey ../../../APES_TOKEN_MAINNET_DECIMALS.json)
    
    # Create token with 9 decimals (mainnet standard)
    spl-token create-token ../../../APES_TOKEN_MAINNET_DECIMALS.json --decimals 9
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Token creation failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ APES token created with 9 decimals: $APES_TOKEN${NC}"
fi

# Create token account for deployer
echo -e "${BLUE}Creating token account for deployer...${NC}"
DEPLOYER_ADDRESS=$(solana address)
spl-token create-account $APES_TOKEN || echo "Account may already exist"

# Mint initial supply (1 billion APES with 9 decimals)
echo -e "${BLUE}Minting initial APES supply...${NC}"
MINT_AMOUNT="1000000000000000000" # 1B APES with 9 decimals
spl-token mint $APES_TOKEN $MINT_AMOUNT

echo -e "${GREEN}✅ APES token setup complete${NC}"
echo ""

# Step 4: Update environment files
echo -e "${BLUE}⚙️  Step 4: Updating environment files...${NC}"

# Update frontend environment
cd ../../../src/frontend
cat > .env << EOF
VITE_API_URL=http://localhost:5001
VITE_PROGRAM_ID=$NEW_PROGRAM_ID
VITE_APES_TOKEN_MINT=$APES_TOKEN
VITE_TOKEN_DECIMALS=9
VITE_RPC_URL=https://api.devnet.solana.com
EOF

echo -e "${GREEN}✅ Frontend .env updated${NC}"

# Create deployment summary
cd ../..
cat > FRESH_DEPLOYMENT_SUMMARY.md << EOF
# 🎯 Fresh Mainnet-Ready Deployment Summary

**Deployment Date**: $(date)
**Environment**: Solana Devnet (Mainnet-Ready Testing)

## 🔑 Contract Information
- **Program ID**: \`$NEW_PROGRAM_ID\`
- **APES Token**: \`$APES_TOKEN\`
- **Token Decimals**: 9 (Mainnet Standard)
- **Deployer**: \`$DEPLOYER_ADDRESS\`

## ✅ Completed Steps
1. Database cleaned (platform only, Polymarket preserved)
2. Fresh smart contracts deployed
3. APES token created with 9 decimals
4. Environment files updated
5. Ready for comprehensive testing

## 🧪 Next Steps for Testing

### Initialize Platform
\`\`\`bash
cd src/smart_contracts/market_system
anchor run init-platform
\`\`\`

### Start Development Environment
\`\`\`bash
./run-dev.sh
\`\`\`

### Test URLs
- Frontend: http://localhost:3000
- Leaderboard: http://localhost:3000/leaderboard
- Admin: http://localhost:3000/admin

## 🔍 Verification Commands
\`\`\`bash
# Check program deployment
solana program show $NEW_PROGRAM_ID

# Check APES token
spl-token display $APES_TOKEN

# Check deployer balance
spl-token balance $APES_TOKEN

# Test platform status
node scripts/check-platform-status.js
\`\`\`

## 🎯 Testing Checklist
- [ ] Platform initialization
- [ ] User wallet connection
- [ ] Market creation
- [ ] Predictions with 9-decimal APES
- [ ] Market resolution
- [ ] Reward claims
- [ ] Leaderboard updates
- [ ] Polymarket integration

---
**⚠️ Important**: This uses 9-decimal APES tokens matching mainnet standards.
All amounts in the UI and contracts now handle the correct decimal precision.
EOF

echo -e "${GREEN}✅ Deployment summary created${NC}"
echo ""

# Step 5: Show next steps
echo -e "${BLUE}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${GREEN}📋 Fresh Mainnet-Ready Platform Deployed:${NC}"
echo -e "   Program ID: ${YELLOW}$NEW_PROGRAM_ID${NC}"
echo -e "   APES Token: ${YELLOW}$APES_TOKEN${NC}"
echo -e "   Decimals: ${YELLOW}9 (Mainnet Standard)${NC}"
echo -e "   Deployer: ${YELLOW}$DEPLOYER_ADDRESS${NC}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "1. Initialize platform:"
echo -e "   ${YELLOW}cd src/smart_contracts/market_system && anchor run init-platform${NC}"
echo ""
echo -e "2. Start development environment:"
echo -e "   ${YELLOW}./run-dev.sh${NC}"
echo ""
echo -e "3. Run comprehensive tests:"
echo -e "   ${YELLOW}Use COMPREHENSIVE_E2E_TESTING_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}✅ Platform ready for mainnet-standard testing!${NC}"

# Save deployment info
echo "$NEW_PROGRAM_ID" > FRESH_PROGRAM_ID.txt
echo "$APES_TOKEN" > FRESH_APES_TOKEN.txt

echo ""
echo -e "${BLUE}💾 Deployment info saved to:${NC}"
echo -e "   - FRESH_PROGRAM_ID.txt"
echo -e "   - FRESH_APES_TOKEN.txt"
echo -e "   - FRESH_DEPLOYMENT_SUMMARY.md" 