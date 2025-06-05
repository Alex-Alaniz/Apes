#!/bin/bash

# Testnet Validation Script
# This script automates the validation testing of the Solana Prediction Market platform on testnet

# Exit on error
set -e

echo "Starting Solana Prediction Market Platform Testnet Validation"
echo "============================================================"

# Load environment variables
if [ -f .env.testnet ]; then
  echo "Loading environment variables from .env.testnet file"
  source .env.testnet
else
  echo "Error: .env.testnet file not found. Please run deploy_testnet.sh first."
  exit 1
fi

# Check if required variables are set
if [ -z "$PROGRAM_ID" ] || [ -z "$TOKEN_MINT" ]; then
  echo "Error: Required environment variables not set. Please run deploy_testnet.sh first."
  exit 1
fi

echo "Validation Environment:"
echo "Program ID: $PROGRAM_ID"
echo "Token Mint: $TOKEN_MINT"
echo "Network: Devnet"

# Create test wallets if they don't exist
echo "Setting up test wallets"
mkdir -p test_wallets

if [ ! -f test_wallets/admin.json ]; then
  echo "Creating admin wallet"
  solana-keygen new --no-passphrase -o test_wallets/admin.json
fi

if [ ! -f test_wallets/user1.json ]; then
  echo "Creating user1 wallet"
  solana-keygen new --no-passphrase -o test_wallets/user1.json
fi

if [ ! -f test_wallets/user2.json ]; then
  echo "Creating user2 wallet"
  solana-keygen new --no-passphrase -o test_wallets/user2.json
fi

if [ ! -f test_wallets/creator.json ]; then
  echo "Creating creator wallet"
  solana-keygen new --no-passphrase -o test_wallets/creator.json
fi

# Airdrop SOL to test wallets
echo "Airdropping SOL to test wallets"
solana airdrop 2 $(solana-keygen pubkey test_wallets/admin.json) --url https://api.devnet.solana.com
solana airdrop 2 $(solana-keygen pubkey test_wallets/user1.json) --url https://api.devnet.solana.com
solana airdrop 2 $(solana-keygen pubkey test_wallets/user2.json) --url https://api.devnet.solana.com
solana airdrop 2 $(solana-keygen pubkey test_wallets/creator.json) --url https://api.devnet.solana.com

# Create token accounts for test wallets
echo "Creating token accounts for test wallets"
spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey test_wallets/admin.json)
spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey test_wallets/user1.json)
spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey test_wallets/user2.json)
spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey test_wallets/creator.json)

# Mint tokens to test wallets
echo "Minting tokens to test wallets"
spl-token mint $TOKEN_MINT 10000 $(spl-token address --owner $(solana-keygen pubkey test_wallets/admin.json))
spl-token mint $TOKEN_MINT 5000 $(spl-token address --owner $(solana-keygen pubkey test_wallets/user1.json))
spl-token mint $TOKEN_MINT 5000 $(spl-token address --owner $(solana-keygen pubkey test_wallets/user2.json))
spl-token mint $TOKEN_MINT 5000 $(spl-token address --owner $(solana-keygen pubkey test_wallets/creator.json))

echo "Test wallets setup complete"

# Run smart contract tests
echo "Running smart contract tests"
cd smart_contracts
npm test -- --network devnet
cd ..

# Run Phase 2: Core Functionality Testing
echo "Running core functionality tests"
cd scripts
node test_core_functionality.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
cd ..

# Run Phase 3: User Flow Testing
echo "Running user flow tests"
cd scripts
node test_user_flows.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
cd ..

# Run Phase 4: Integration Testing
echo "Running integration tests"
cd scripts
node test_believeapp_integration.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
node test_meteora_integration.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
cd ..

# Run Phase 5: Security Testing
echo "Running security tests"
cd scripts
node test_security.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
cd ..

# Run Phase 6: Performance Testing
echo "Running performance tests"
cd scripts
node test_performance.js --network devnet --program $PROGRAM_ID --token $TOKEN_MINT
cd ..

# Generate validation report
echo "Generating validation report"
node scripts/generate_validation_report.js --output testnet_validation_report.md

echo "============================================================"
echo "Testnet validation completed!"
echo "Validation report: testnet_validation_report.md"
echo "============================================================"
