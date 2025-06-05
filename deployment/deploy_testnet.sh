#!/bin/bash

# Testnet Deployment Script
# This script automates the deployment of the Solana Prediction Market platform to testnet (devnet)

# Exit on error
set -e

echo "Starting Solana Prediction Market Platform Testnet Deployment"
echo "============================================================"

# Load environment variables
if [ -f .env.testnet ]; then
  echo "Loading environment variables from .env.testnet file"
  source .env.testnet
else
  echo "No .env.testnet file found, creating one with default values"
  cat > .env.testnet << EOL
# Solana testnet configuration
SOLANA_CLUSTER=devnet
BELIEVE_APP_API_KEY=test_api_key
BELIEVE_APP_SANDBOX=true
METEORA_TEST_POOL=true
EOL
  source .env.testnet
fi

# Set Solana cluster to devnet
echo "Setting Solana cluster to devnet"
solana config set --url https://api.devnet.solana.com

# Check if wallet exists
if [ ! -f ~/.config/solana/id.json ]; then
    echo "No Solana wallet found. Creating new wallet for testing..."
    solana-keygen new --no-passphrase
fi

# Display wallet address
WALLET_ADDRESS=$(solana address)
echo "Your wallet address: $WALLET_ADDRESS"

# Airdrop SOL for testing
echo "Airdropping 2 SOL to your wallet for testing"
solana airdrop 2
echo "New balance: $(solana balance) SOL"

# Create test token to simulate the actual token
echo "Creating test token to simulate the platform token"
TEST_TOKEN_KEYPAIR=test_token_keypair.json
solana-keygen new --no-passphrase -o $TEST_TOKEN_KEYPAIR

# Create token mint
echo "Creating token mint"
TOKEN_MINT=$(spl-token create-token $TEST_TOKEN_KEYPAIR | grep "Creating token" | awk '{print $3}')
echo "Test token created with address: $TOKEN_MINT"

# Create token account
echo "Creating token account"
spl-token create-account $TOKEN_MINT

# Mint test tokens
echo "Minting test tokens"
spl-token mint $TOKEN_MINT 1000000000 # 1 billion tokens with 0 decimals

# Export token mint address for use in deployment
export TOKEN_MINT_ADDRESS=$TOKEN_MINT
echo "TOKEN_MINT_ADDRESS=$TOKEN_MINT" >> .env.testnet

# Deploy smart contracts
echo "Building and deploying smart contracts to testnet"
cd smart_contracts

echo "Building Anchor program"
anchor build

echo "Deploying to devnet"
PROGRAM_ID=$(anchor deploy --provider.cluster devnet | grep "Program Id:" | awk '{print $3}')
echo "Program deployed with ID: $PROGRAM_ID"
echo "PROGRAM_ID=$PROGRAM_ID" >> ../.env.testnet

# Save program ID to config files
echo "Updating program ID in configuration files"
cd ..

# Create testnet config files
mkdir -p frontend/src/config/testnet
mkdir -p backend/src/config/testnet

# Update frontend testnet config
cat > frontend/src/config/testnet/constants.js << EOL
export const CONSTANTS = {
  PROGRAM_ID: "$PROGRAM_ID",
  TOKEN_MINT: "$TOKEN_MINT",
  NETWORK: "devnet",
  BELIEVE_APP_SANDBOX: true,
  METEORA_TEST_POOL: true
};
EOL

# Update backend testnet config
cat > backend/src/config/testnet/constants.js << EOL
module.exports = {
  PROGRAM_ID: "$PROGRAM_ID",
  TOKEN_MINT: "$TOKEN_MINT",
  NETWORK: "devnet",
  BELIEVE_APP_SANDBOX: true,
  METEORA_TEST_POOL: true
};
EOL

# Initialize platform
echo "Initializing platform on testnet"
cd smart_contracts
node scripts/initialize_platform.js \
  --network devnet \
  --admin $WALLET_ADDRESS \
  --token-mint $TOKEN_MINT \
  --bet-burn-rate 250 \
  --claim-burn-rate 150 \
  --platform-fee 50
cd ..

# Deploy backend for testnet
echo "Deploying backend for testnet"
cd backend

echo "Installing dependencies"
npm install

echo "Building backend"
npm run build:testnet

echo "Starting backend server for testnet"
pm2 delete testnet-backend 2>/dev/null || true
pm2 start dist/index.js --name testnet-backend -- --config testnet
BACKEND_URL="http://localhost:3001"
echo "Backend running at: $BACKEND_URL"
cd ..

# Update frontend with backend URL for testnet
cat > frontend/src/config/testnet/api.js << EOL
export const API = {
  BASE_URL: "$BACKEND_URL",
  ENDPOINTS: {
    MARKETS: "/markets",
    PREDICTIONS: "/predictions",
    USERS: "/users",
    TOKENS: "/tokens",
    STATS: "/stats"
  }
};
EOL

# Deploy frontend for testnet
echo "Deploying frontend for testnet"
cd frontend

echo "Installing dependencies"
npm install

echo "Building frontend for testnet"
npm run build:testnet

echo "Starting frontend server for testnet"
pm2 delete testnet-frontend 2>/dev/null || true
pm2 start --name testnet-frontend serve -- -s build -l 3000
FRONTEND_URL="http://localhost:3000"
echo "Frontend running at: $FRONTEND_URL"
cd ..

# Create test data
echo "Creating test data"
cd scripts
node create_test_markets.js --network devnet --token $TOKEN_MINT
node create_test_predictions.js --network devnet --token $TOKEN_MINT
cd ..

echo "============================================================"
echo "Testnet deployment completed successfully!"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Program ID: $PROGRAM_ID"
echo "Token Mint: $TOKEN_MINT"
echo "============================================================"
echo "Please refer to the testnet_validation_plan.md for testing instructions."
