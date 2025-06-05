# Mainnet Deployment Guide

## Overview
This document provides instructions for deploying the Solana Prediction Market platform to mainnet. It covers all necessary steps from environment setup to post-deployment verification.

## Prerequisites
- Solana CLI tools installed and configured
- Anchor framework installed
- Node.js and npm installed
- Access to deployment wallet with sufficient SOL for deployment costs
- BelieveApp API key
- Meteora liquidity pool access

## Deployment Steps

### 1. Environment Setup

```bash
# Set up environment variables
export SOLANA_CLUSTER=mainnet-beta
export BELIEVE_APP_API_KEY=your_api_key_here
export METEORA_POOL_ADDRESS=881ooAUZamh41avqLzRbJz8EMzPn5vxFyjhcWmzjDRbu
export TOKEN_MINT_ADDRESS=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

### 2. Smart Contract Deployment

```bash
# Navigate to smart contracts directory
cd /home/ubuntu/prediction_market_project/smart_contracts

# Build the program
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# Verify program ID
solana address -k target/deploy/prediction_market-keypair.json
```

### 3. Initialize Platform

```bash
# Run initialization script
node scripts/initialize_platform.js \
  --admin YOUR_ADMIN_WALLET \
  --token-mint 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts \
  --bet-burn-rate 250 \
  --claim-burn-rate 150 \
  --platform-fee 50
```

### 4. Backend Deployment

```bash
# Navigate to backend directory
cd /home/ubuntu/prediction_market_project/backend

# Install dependencies
npm install

# Build the application
npm run build

# Deploy to server
npm run deploy
```

### 5. Frontend Deployment

```bash
# Navigate to frontend directory
cd /home/ubuntu/prediction_market_project/frontend

# Install dependencies
npm install

# Build the application
npm run build

# Deploy to hosting service
npm run deploy
```

### 6. Post-Deployment Verification

```bash
# Verify program is deployed
solana program show PROGRAM_ID

# Verify platform state is initialized
node scripts/verify_platform.js

# Test basic functionality
node scripts/test_functionality.js
```

## Configuration

### Program IDs and Addresses

After deployment, update the following configuration files with the deployed program IDs and addresses:

- `/home/ubuntu/prediction_market_project/frontend/src/config/constants.js`
- `/home/ubuntu/prediction_market_project/backend/src/config/constants.js`

### API Endpoints

Update the API endpoint configuration in:

- `/home/ubuntu/prediction_market_project/frontend/src/config/api.js`

## User Testing Guide

### Setting Up a Test Wallet

1. Install a Solana wallet (Phantom, Solflare, etc.)
2. Create a new wallet or import an existing one
3. Add the platform token to your wallet using the token address: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
4. Acquire test tokens through the faucet or token swap

### Testing Platform Features

#### Market Creation
1. Connect your wallet to the platform
2. Navigate to "Create Market" page
3. Fill in market details (question, options, end date, category)
4. Stake tokens to create the market
5. Confirm transaction in your wallet

#### Placing Predictions
1. Browse available markets
2. Select a market to participate in
3. Choose your prediction option
4. Enter the amount to stake
5. Confirm transaction in your wallet

#### Claiming Rewards
1. Navigate to "My Predictions" page
2. Find resolved markets where you predicted correctly
3. Click "Claim Reward" button
4. Confirm transaction in your wallet

#### Token Swapping
1. Navigate to "Token Swap" page
2. Enter amount to swap
3. Review swap details (price impact, fee, minimum received)
4. Confirm transaction in your wallet

### Admin Testing

For admin users, additional testing steps:

1. Market resolution
2. Platform pause/unpause
3. Burn rate adjustments
4. Emergency market pause

## Troubleshooting

### Common Issues

#### Transaction Errors
- Check wallet connection
- Ensure sufficient SOL for transaction fees
- Verify token balance for operations

#### Market Creation Issues
- Ensure stake amount meets minimum requirement
- Verify question and options meet length requirements
- Check end date is in the future

#### Reward Claiming Issues
- Verify market is resolved
- Ensure you predicted the winning option
- Check if rewards were already claimed

## Support

For technical support during deployment or testing:
- Email: support@solanapredictions.com
- Discord: https://discord.gg/solanapredictions
