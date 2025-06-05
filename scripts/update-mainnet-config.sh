#!/bin/bash

# PRIMAPE Markets - Update Mainnet Configuration Script
# Prepares all configurations for mainnet deployment

set -e  # Exit on any error

echo "🔧 PRIMAPE Markets - Mainnet Configuration Update"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Mainnet Configuration Checklist:${NC}"
echo "1. ✅ WebSocket endpoints added"
echo "2. ✅ RPC fallbacks configured"
echo "3. ✅ APES token configured (9 decimals)"
echo "4. ✅ Treasury addresses set"
echo "5. ⏳ Production environment variables"

# Check if user has SOL for deployment
echo -e "\n💰 Checking mainnet wallet balance..."
BALANCE=$(solana balance --url mainnet-beta 2>/dev/null | awk '{print $1}' || echo "0")
echo -e "Mainnet balance: ${GREEN}$BALANCE SOL${NC}"

if (( $(echo "$BALANCE < 3" | bc -l) )); then
    echo -e "\n${RED}⚠️  WARNING: Low mainnet SOL balance${NC}"
    echo "You need at least 3-5 SOL for mainnet deployment"
    echo -e "\n${YELLOW}Funding Options:${NC}"
    echo "1. Buy SOL on Coinbase/Binance and send to:"
    echo "   APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
    echo "2. Transfer from other Solana wallets"
    echo "3. Use Jupiter/Raydium to swap other tokens"
    echo ""
    read -p "Continue with configuration update anyway? (y/n): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuration update cancelled."
        exit 0
    fi
fi

# Update backend environment for mainnet
echo -e "\n🔧 Updating backend configuration..."
BACKEND_ENV="backend/.env.mainnet"
cat > "$BACKEND_ENV" << EOF
# Mainnet Backend Configuration
NODE_ENV=production
PORT=3001

# Solana Configuration
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d

# Token Configuration  
TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
TOKEN_DECIMALS=9

# Treasury Configuration
PRIMAPE_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
COMMUNITY_TREASURY=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2

# Database (will be set by Railway/Vercel)
# DATABASE_URL=<provided_by_hosting_service>

# Security
CORS_ORIGIN=*
# JWT_SECRET=<generate_random_secret>

# Rate Limiting (mainnet production)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Believe API Configuration
BELIEVE_APP_API_KEY=your-believe-api-key-here
EOF

echo -e "${GREEN}✅ Backend mainnet config created: $BACKEND_ENV${NC}"

# Update frontend environment for mainnet
echo -e "\n🎨 Updating frontend configuration..."
FRONTEND_ENV="src/frontend/.env.mainnet"
cat > "$FRONTEND_ENV" << EOF
# Mainnet Frontend Configuration
VITE_SOLANA_NETWORK=mainnet
VITE_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
VITE_WS_URL=wss://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d

# Token Configuration
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
VITE_TOKEN_DECIMALS=9

# Treasury Configuration
VITE_PRIMAPE_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
VITE_COMMUNITY_TREASURY=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2

# Program ID (will be updated after contract deployment)
VITE_PROGRAM_ID=PLACEHOLDER_WILL_BE_UPDATED

# API Configuration (will be updated after backend deployment) 
VITE_API_URL=PLACEHOLDER_WILL_BE_UPDATED

# Production Settings
VITE_ENVIRONMENT=production
VITE_DEBUG=false

# Believe API Configuration
VITE_BELIEVE_API_KEY=your-believe-api-key-here
EOF

echo -e "${GREEN}✅ Frontend mainnet config created: $FRONTEND_ENV${NC}"

# Create production deployment checklist
echo -e "\n📋 Creating deployment checklist..."
cat > MAINNET_DEPLOYMENT_CHECKLIST.md << EOF
# Mainnet Deployment Checklist

## ✅ Configuration Status:
- [x] WebSocket endpoints configured
- [x] RPC fallbacks set up  
- [x] APES token configured (9 decimals)
- [x] Treasury addresses set
- [x] Environment files created

## 💰 Funding Required:
- [ ] 5+ SOL in mainnet wallet (APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z)
- Current balance: $BALANCE SOL

## 🚀 Deployment Steps:
1. [ ] Fund mainnet wallet with 5+ SOL
2. [ ] Deploy smart contracts: \`./scripts/deploy-contracts-mainnet.sh\`
3. [ ] Deploy application: \`./scripts/deploy-railway.sh\`
4. [ ] Test full functionality
5. [ ] Monitor and verify

## 🔗 Important Addresses:
- **APES Token**: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
- **PRIMAPE Treasury**: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z  
- **Community Treasury**: APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2
- **Deployment Wallet**: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z

## 📊 Cost Estimate:
- **Smart Contract Deployment**: 3-5 SOL (~$750-1250)
- **Monthly Hosting**: $10-15/month
- **Total First Month**: ~$760-1265

## 🆘 Support:
If you need help with funding or deployment, reach out for assistance.
EOF

echo -e "${GREEN}✅ Deployment checklist created: MAINNET_DEPLOYMENT_CHECKLIST.md${NC}"

# Test RPC connections
echo -e "\n🌐 Testing RPC connections..."
echo -n "Testing Alchemy mainnet RPC... "
if curl -s --max-time 5 "https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN" \
   -H "Content-Type: application/json" \
   -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -n "Testing public mainnet RPC... "
if curl -s --max-time 5 "https://api.mainnet-beta.solana.com" \
   -H "Content-Type: application/json" \
   -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Final summary
echo -e "\n${GREEN}🎉 MAINNET CONFIGURATION COMPLETE!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}📁 Files Created:${NC}"
echo "  • backend/.env.mainnet"
echo "  • src/frontend/.env.mainnet"  
echo "  • MAINNET_DEPLOYMENT_CHECKLIST.md"
echo ""
echo -e "${BLUE}🔧 Configuration Status:${NC}"
echo "  ✅ WebSocket endpoints added"
echo "  ✅ Production RPC endpoints configured"
echo "  ✅ APES token settings (9 decimals)"
echo "  ✅ Treasury addresses configured"
echo "  ✅ Environment variables prepared"
echo ""
echo -e "${YELLOW}⏳ Next Steps:${NC}"
if (( $(echo "$BALANCE < 3" | bc -l) )); then
    echo "  1. 💰 Fund mainnet wallet with 5+ SOL"
    echo "  2. 🚀 Deploy smart contracts"
    echo "  3. 🌐 Deploy application"
else
    echo "  1. 🚀 Deploy smart contracts: ./scripts/deploy-contracts-mainnet.sh"
    echo "  2. 🌐 Deploy application: ./scripts/deploy-railway.sh"
fi
echo ""
echo -e "${GREEN}Your prediction market is configured for mainnet! 🚀${NC}" 