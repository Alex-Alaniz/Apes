#!/bin/bash

# Deploy to Mainnet Script
# This script deploys the prediction market platform to Solana mainnet

echo "🚀 Deploying to Solana Mainnet"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Safety check
echo -e "${RED}⚠️  WARNING: This will deploy to MAINNET!${NC}"
echo -e "${RED}Make sure you have:${NC}"
echo -e "${RED}1. Completed all security fixes${NC}"
echo -e "${RED}2. Tested thoroughly on devnet${NC}"
echo -e "${RED}3. Backed up your keys${NC}"
echo -e "${RED}4. Sufficient SOL for deployment${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

# Pre-deployment checks
echo -e "\n${YELLOW}Running pre-deployment checks...${NC}"

# Check 1: Verify all tests pass
echo -e "${YELLOW}1. Running fund safety tests...${NC}"
./test-fund-safety.sh > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Fund safety tests failed! Cannot deploy.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Fund safety tests passed${NC}"

# Check 2: Verify authority wallet
echo -e "${YELLOW}2. Verifying authority wallet...${NC}"
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ DEPLOYER_PRIVATE_KEY not set!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authority wallet configured${NC}"

# Check 3: Switch to mainnet
echo -e "${YELLOW}3. Switching to mainnet...${NC}"
cd ../src/smart_contracts/market_system

# Update Anchor.toml for mainnet
cp Anchor.toml Anchor.toml.backup
cat > Anchor.toml << EOF
[features]
seeds = false
skip-lint = false

[programs.mainnet-beta]
market_system = "FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "mainnet-beta"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF

echo -e "${GREEN}✅ Switched to mainnet configuration${NC}"

# Check 4: Build for mainnet
echo -e "${YELLOW}4. Building for mainnet...${NC}"
anchor build --verifiable

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    mv Anchor.toml.backup Anchor.toml
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Deploy to mainnet
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Deploying to mainnet...${NC}"
echo -e "${BLUE}========================================${NC}"

anchor deploy --provider.cluster mainnet-beta

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    mv Anchor.toml.backup Anchor.toml
    exit 1
fi

echo -e "${GREEN}✅ Deployed to mainnet successfully!${NC}"

# Post-deployment steps
echo -e "\n${YELLOW}Post-deployment steps:${NC}"

# 1. Copy IDL to frontend
cp target/idl/market_system.json ../../frontend/src/idl/

# 2. Update frontend config for mainnet
cd ../../../scripts
node update-frontend-mainnet.js

# 3. Initialize platform (if first deployment)
echo -e "\n${YELLOW}Do you need to initialize the platform? (yes/no):${NC}"
read -p "> " init_platform

if [ "$init_platform" == "yes" ]; then
    node initialize-mainnet.js
fi

# 4. Display deployment info
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 MAINNET DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\nDeployment Details:"
echo -e "Program ID: FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib"
echo -e "Network: Mainnet-Beta"
echo -e "Explorer: https://explorer.solana.com/address/FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib"

echo -e "\n${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "1. Monitor the first few transactions closely"
echo -e "2. Keep transaction limits conservative initially"
echo -e "3. Have emergency procedures ready"
echo -e "4. Monitor escrow balances"
echo -e "5. Set up alerts for unusual activity"

echo -e "\n${BLUE}Good luck with your mainnet launch! 🚀${NC}"

# Restore devnet config (safety)
echo -e "\n${YELLOW}Restoring devnet configuration...${NC}"
mv Anchor.toml.backup Anchor.toml 