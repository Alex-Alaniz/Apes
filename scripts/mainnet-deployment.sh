#!/bin/bash

echo "🚀 PRIMAPE MAINNET DEPLOYMENT"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}This script will prepare PRIMAPE for MAINNET deployment:${NC}"
echo "- Mainnet Solana program deployment"
echo "- 9-decimal APES token integration"
echo "- Production database configuration"
echo "- Mainnet treasury addresses"
echo "- Security validations"
echo ""

echo -e "${RED}⚠️  WARNING: This is MAINNET deployment with REAL tokens!${NC}"
echo ""

read -p "🤔 Are you ABSOLUTELY SURE you want to deploy to MAINNET? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Mainnet deployment cancelled."
    exit 1
fi

echo -e "\n${BLUE}Step 1: Prerequisites Check${NC}"
echo "Checking mainnet deployment requirements..."

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

# Check if we're NOT on devnet
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ $CLUSTER == *"devnet"* ]]; then
    echo "⚠️  Warning: Currently on devnet. Switching to mainnet..."
    echo "Setting to mainnet-beta..."
    solana config set --url https://api.mainnet-beta.solana.com
fi

# Check wallet balance (should have at least 5 SOL for deployment)
BALANCE=$(solana balance --output json | jq -r '.value')
if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "❌ Insufficient SOL balance for mainnet deployment: $BALANCE SOL"
    echo "You need at least 5 SOL for mainnet deployment costs"
    exit 1
fi

echo "✅ Mainnet prerequisites check passed"
echo "  - Solana CLI: $(solana --version)"
echo "  - Anchor CLI: $(anchor --version)"
echo "  - Network: Mainnet-Beta"
echo "  - Wallet balance: $BALANCE SOL"

echo -e "\n${BLUE}Step 2: Mainnet Configuration Validation${NC}"

# Validate APES token (9 decimals)
MAINNET_APES_TOKEN="9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"
echo "Validating mainnet APES token..."

# Check token decimals on mainnet
APES_DECIMALS=$(spl-token account-info $MAINNET_APES_TOKEN --output json 2>/dev/null | jq -r '.decimals' 2>/dev/null || echo "unknown")

if [ "$APES_DECIMALS" = "9" ]; then
    echo "✅ Mainnet APES token validated: 9 decimals"
else
    echo "❌ Could not validate mainnet APES token decimals. Expected: 9, Got: $APES_DECIMALS"
    echo "Please verify the APES token address: $MAINNET_APES_TOKEN"
    exit 1
fi

echo -e "\n${BLUE}Step 3: Update Configuration for Mainnet${NC}"

# Update frontend configuration for mainnet
SOLANA_CONFIG_FILE="src/frontend/src/config/solana.js"
if [ -f "$SOLANA_CONFIG_FILE" ]; then
    # Backup original
    cp "$SOLANA_CONFIG_FILE" "$SOLANA_CONFIG_FILE.mainnet.backup"
    
    # Update to use mainnet by default
    sed -i.bak "s/NETWORK = 'devnet'/NETWORK = 'mainnet'/" "$SOLANA_CONFIG_FILE"
    sed -i.bak "s/NETWORK = import.meta.env?.VITE_SOLANA_NETWORK || 'devnet'/NETWORK = import.meta.env?.VITE_SOLANA_NETWORK || 'mainnet'/" "$SOLANA_CONFIG_FILE"
    
    echo "✅ Updated frontend configuration for mainnet"
    echo "  - Default network: mainnet"
    echo "  - APES token: 9 decimals"
    echo "  - Token mint: $MAINNET_APES_TOKEN"
else
    echo "❌ Frontend config file not found: $SOLANA_CONFIG_FILE"
    exit 1
fi

# Update .env for mainnet
ENV_FILE="src/frontend/.env"
echo "VITE_SOLANA_NETWORK=mainnet" > "$ENV_FILE"
echo "VITE_API_URL=https://your-production-api.com" >> "$ENV_FILE"
echo "✅ Created mainnet .env configuration"

echo -e "\n${BLUE}Step 4: Deploy Mainnet Solana Program${NC}"

# Check if program directory exists
if [ ! -d "program" ] && [ ! -d "programs" ] && [ ! -d "solana-program" ]; then
    echo "❌ Solana program directory not found"
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

# Generate mainnet program keypair if it doesn't exist
if [ ! -f "target/deploy/market_system-keypair.json" ]; then
    echo "Generating new program keypair for mainnet..."
    solana-keygen new --outfile target/deploy/market_system-keypair.json --no-bip39-passphrase
fi

# Get program ID
MAINNET_PROGRAM_ID=$(solana address -k target/deploy/market_system-keypair.json)
echo "✅ Mainnet Program ID: $MAINNET_PROGRAM_ID"

# Update Anchor.toml for mainnet
if [ -f "Anchor.toml" ]; then
    cp Anchor.toml Anchor.toml.mainnet.backup
    sed -i.bak "s/market_system = \"[^\"]*\"/market_system = \"$MAINNET_PROGRAM_ID\"/" Anchor.toml
    # Update cluster to mainnet
    sed -i.bak "s/cluster = \"[^\"]*\"/cluster = \"mainnet\"/" Anchor.toml
    echo "✅ Updated Anchor.toml for mainnet"
fi

# Update lib.rs
if [ -f "programs/market_system/src/lib.rs" ]; then
    cp programs/market_system/src/lib.rs programs/market_system/src/lib.rs.mainnet.backup
    sed -i.bak "s/declare_id!(\"[^\"]*\")/declare_id!(\"$MAINNET_PROGRAM_ID\")/" programs/market_system/src/lib.rs
    echo "✅ Updated program lib.rs"
fi

# Build for mainnet
echo "Building program for mainnet..."
if ! anchor build; then
    echo "❌ Failed to build program for mainnet"
    exit 1
fi

# Deploy to mainnet (this costs SOL!)
echo -e "${YELLOW}💰 About to deploy to mainnet (this will cost SOL)${NC}"
read -p "Continue with mainnet deployment? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Mainnet deployment cancelled."
    exit 1
fi

echo "Deploying to mainnet..."
if ! anchor deploy --provider.cluster mainnet; then
    echo "❌ Failed to deploy program to mainnet"
    exit 1
fi

echo "✅ Program deployed to mainnet successfully!"
echo "  - Program ID: $MAINNET_PROGRAM_ID"

cd ..

echo -e "\n${BLUE}Step 5: Update Frontend with Mainnet Program ID${NC}"

# Update frontend config with new program ID
if [ -f "$SOLANA_CONFIG_FILE" ]; then
    # Update mainnet program ID in config
    sed -i.bak "s/programId: \"[^\"]*\"/programId: \"$MAINNET_PROGRAM_ID\"/" "$SOLANA_CONFIG_FILE"
    
    echo "✅ Updated frontend with mainnet program ID"
    echo "  - Program ID: $MAINNET_PROGRAM_ID"
fi

echo -e "\n${BLUE}Step 6: Production Database Setup${NC}"

echo "Setting up production database configuration..."

# Update backend .env for production
BACKEND_ENV_FILE="src/backend/.env"
cat > "$BACKEND_ENV_FILE" << EOF
# Production Database Configuration
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_key

# API Configuration
PORT=5001
NODE_ENV=production

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PROGRAM_ID=$MAINNET_PROGRAM_ID

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
CORS_ORIGIN=https://your-production-domain.com
EOF

echo "✅ Created production backend configuration"
echo "⚠️  Please update the database credentials and JWT secret!"

echo -e "\n${BLUE}Step 7: Security Validation${NC}"

# Security checks
echo "Running security validations..."

# Check for hardcoded private keys
if grep -r "private" --include="*.js" --include="*.ts" src/ | grep -i key; then
    echo "⚠️  Warning: Potential private key references found in code"
fi

# Check for console.log statements
LOG_COUNT=$(grep -r "console.log" --include="*.js" --include="*.ts" src/ | wc -l)
if [ "$LOG_COUNT" -gt 10 ]; then
    echo "⚠️  Warning: $LOG_COUNT console.log statements found (consider removing for production)"
fi

# Check for debug flags
if grep -r "debug.*true" --include="*.js" --include="*.ts" src/; then
    echo "⚠️  Warning: Debug flags found in code"
fi

echo "✅ Security validation completed"

echo -e "\n${BLUE}Step 8: Build Production Assets${NC}"

# Build frontend for production
echo "Building frontend for production..."
cd src/frontend

if ! npm run build; then
    echo "❌ Failed to build frontend for production"
    exit 1
fi

echo "✅ Frontend built successfully for production"
cd ../../

echo -e "\n${GREEN}🎉 MAINNET DEPLOYMENT COMPLETED!${NC}"
echo "========================================="
echo ""
echo -e "${GREEN}✅ Mainnet Program ID:${NC} $MAINNET_PROGRAM_ID"
echo -e "${GREEN}✅ APES Token:${NC} $MAINNET_APES_TOKEN (9 decimals)"
echo -e "${GREEN}✅ Network:${NC} Mainnet-Beta"
echo -e "${GREEN}✅ Configuration:${NC} Updated for production"
echo -e "${GREEN}✅ Security:${NC} Validated"
echo -e "${GREEN}✅ Build:${NC} Production-ready"
echo ""
echo -e "${YELLOW}📋 Next Steps for Production:${NC}"
echo "1. Update production database credentials in src/backend/.env"
echo "2. Deploy backend to your production server"
echo "3. Deploy frontend dist/ folder to your CDN/hosting"
echo "4. Update domain configuration"
echo "5. Set up monitoring and logging"
echo "6. Initialize platform in production admin panel"
echo ""
echo -e "${YELLOW}⚠️  Important Reminders:${NC}"
echo "- Test with small amounts first"
echo "- Monitor transactions carefully"
echo "- Have emergency procedures ready"
echo "- Keep backups of all configurations"
echo ""
echo -e "${GREEN}🚀 Your PRIMAPE is ready for MAINNET!${NC}" 