#!/bin/bash

# Mainnet Deployment Script
# This script automates the deployment of the Solana Prediction Market platform to mainnet

# Exit on error
set -e

echo "Starting Solana Prediction Market Platform Mainnet Deployment"
echo "============================================================"

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  source .env
else
  echo "No .env file found, using default or provided environment variables"
fi

# Validate required environment variables
if [ -z "$SOLANA_WALLET_KEYPAIR" ]; then
  echo "Error: SOLANA_WALLET_KEYPAIR environment variable is required"
  exit 1
fi

if [ -z "$BELIEVE_APP_API_KEY" ]; then
  echo "Error: BELIEVE_APP_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$TOKEN_MINT_ADDRESS" ]; then
  echo "Error: TOKEN_MINT_ADDRESS environment variable is required"
  exit 1
fi

# Set Solana cluster to mainnet
echo "Setting Solana cluster to mainnet-beta"
solana config set --url https://api.mainnet-beta.solana.com

# Verify wallet balance
echo "Verifying wallet balance"
BALANCE=$(solana balance)
echo "Current wallet balance: $BALANCE SOL"

# Minimum required balance (in SOL)
MIN_BALANCE=2
if (( $(echo "$BALANCE < $MIN_BALANCE" | bc -l) )); then
  echo "Error: Insufficient SOL balance for deployment. Minimum required: $MIN_BALANCE SOL"
  exit 1
fi

# Deploy smart contracts
echo "Building and deploying smart contracts"
cd smart_contracts

echo "Building Anchor program"
anchor build

echo "Deploying to mainnet"
PROGRAM_ID=$(anchor deploy --provider.cluster mainnet-beta | grep "Program Id:" | awk '{print $3}')
echo "Program deployed with ID: $PROGRAM_ID"

# Save program ID to config files
echo "Updating program ID in configuration files"
cd ..

# Update frontend config
sed -i "s/PROGRAM_ID: \".*\"/PROGRAM_ID: \"$PROGRAM_ID\"/" frontend/src/config/constants.js

# Update backend config
sed -i "s/PROGRAM_ID: \".*\"/PROGRAM_ID: \"$PROGRAM_ID\"/" backend/src/config/constants.js

# Initialize platform
echo "Initializing platform"
cd smart_contracts
node scripts/initialize_platform.js \
  --admin $SOLANA_WALLET_KEYPAIR \
  --token-mint $TOKEN_MINT_ADDRESS \
  --bet-burn-rate 250 \
  --claim-burn-rate 150 \
  --platform-fee 50
cd ..

# Deploy backend
echo "Deploying backend"
cd backend

echo "Installing dependencies"
npm install

echo "Building backend"
npm run build

echo "Deploying backend"
npm run deploy
BACKEND_URL=$(cat .deployment-url)
echo "Backend deployed at: $BACKEND_URL"
cd ..

# Update frontend with backend URL
sed -i "s|API_URL: \".*\"|API_URL: \"$BACKEND_URL\"|" frontend/src/config/api.js

# Deploy frontend
echo "Deploying frontend"
cd frontend

echo "Installing dependencies"
npm install

echo "Building frontend"
npm run build

echo "Deploying frontend"
npm run deploy
FRONTEND_URL=$(cat .deployment-url)
echo "Frontend deployed at: $FRONTEND_URL"
cd ..

# Verify deployment
echo "Verifying deployment"
cd smart_contracts
node scripts/verify_platform.js
node scripts/test_functionality.js
cd ..

echo "============================================================"
echo "Deployment completed successfully!"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Program ID: $PROGRAM_ID"
echo "============================================================"
echo "Please refer to the mainnet_deployment_guide.md for post-deployment steps and user testing instructions."
