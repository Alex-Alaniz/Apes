#!/bin/bash

# Configuration
PROGRAM_ID="FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib"
WALLET_PATH="./APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z.json"
RPC_URL="https://api.devnet.solana.com"

echo "🚀 Solana Prediction Market Platform - Initialization Check"
echo "=========================================================="
echo ""

# Set the cluster
solana config set --url $RPC_URL

# Check wallet
echo "Wallet:"
solana address -k $WALLET_PATH
echo ""

# Check balance
echo "SOL Balance:"
solana balance -k $WALLET_PATH
echo ""

# Check program
echo "Program ID: $PROGRAM_ID"
echo "Checking if program is deployed..."
solana program show $PROGRAM_ID
echo ""

# Since we can't initialize without proper Anchor compatibility,
# Let's create a script that uses the already deployed program
echo "⚠️  IMPORTANT: Platform initialization requires Anchor compatibility"
echo ""
echo "The platform initialization has issues due to Anchor version mismatch."
echo "However, the program IS deployed on devnet at: $PROGRAM_ID"
echo ""
echo "To properly initialize and test:"
echo "1. We need to fix the Rust program to include proper platform state initialization"
echo "2. Redeploy with the fixed version"
echo "3. Then initialize and create markets"
echo ""
echo "The current program at $PROGRAM_ID has these issues:"
echo "- The initialize() function is empty (just prints a message)"
echo "- There's no InitializePlatformState instruction"
echo "- PlatformState is referenced but never initialized"
echo ""
echo "Would you like me to:"
echo "1. Fix the Rust program to add proper initialization"
echo "2. Redeploy the fixed version"
echo "3. Then initialize and create real on-chain markets" 