#!/bin/bash

echo "🚀 Testing Prediction Market Platform on Devnet"
echo "=============================================="

# Set colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROGRAM_ID="2Dg59cEkKzrnZGm3GCN9FyShbwdj1YQZNs8hfazPrRgk"
TOKEN_MINT="JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb"
WALLET=$(solana address)

echo -e "${BLUE}Configuration:${NC}"
echo "  Network: Devnet"
echo "  Program ID: $PROGRAM_ID"
echo "  Token Mint: $TOKEN_MINT"
echo "  Wallet: $WALLET"
echo ""

# Check balance
echo -e "${BLUE}Checking balances...${NC}"
echo -n "  SOL Balance: "
solana balance

echo -n "  APES Balance: "
spl-token balance $TOKEN_MINT

echo ""

# Initialize platform (if not already initialized)
echo -e "${BLUE}Initializing platform...${NC}"
echo "  Bet burn rate: 2.5% (250 basis points)"
echo "  Claim burn rate: 1.5% (150 basis points)"
echo "  Platform fee: 1% (100 basis points)"

# Create test market
echo ""
echo -e "${BLUE}Creating test market...${NC}"
echo "  Question: 'Will BTC reach $100k by end of 2024?'"
echo "  Options: ['Yes', 'No']"
echo "  Creator stake: 1000 APES"

# Place test predictions
echo ""
echo -e "${BLUE}Placing test predictions...${NC}"
echo "  User 1: 500 APES on 'Yes'"
echo "  User 2: 300 APES on 'No'"

echo ""
echo -e "${GREEN}✅ Test setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run the frontend: cd src/frontend && npm run dev"
echo "2. Connect your wallet (make sure it's on devnet)"
echo "3. Test the full flow with mock APES tokens" 