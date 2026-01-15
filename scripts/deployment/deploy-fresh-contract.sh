#!/bin/bash

# PRIMAPE Fresh Contract Deployment Script

echo "🚀 PRIMAPE Fresh Contract Deployment"
echo "===================================="
echo ""
echo "This script will deploy a brand new prediction market contract"
echo "with zero markets for QA testing."
echo ""

# Check if Anchor CLI is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first."
    echo "   Visit: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Navigate to smart contracts directory
cd src/smart_contracts || exit 1

echo "📦 Building the program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix any compilation errors."
    exit 1
fi

echo ""
echo "🔑 Generating new program keypair..."
# Generate a new keypair for the fresh contract
solana-keygen new -o target/deploy/prediction_market-keypair.json --force --no-bip39-passphrase

echo ""
echo "📄 New Program ID:"
NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/prediction_market-keypair.json)
echo "   $NEW_PROGRAM_ID"

echo ""
echo "📝 Updating Anchor.toml with new Program ID..."
# Update Anchor.toml with new program ID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/prediction_market = \".*\"/prediction_market = \"$NEW_PROGRAM_ID\"/" Anchor.toml
else
    # Linux
    sed -i "s/prediction_market = \".*\"/prediction_market = \"$NEW_PROGRAM_ID\"/" Anchor.toml
fi

echo ""
echo "📝 Updating lib.rs with new Program ID..."
# Update lib.rs with new program ID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/prediction_market/src/lib.rs
else
    # Linux
    sed -i "s/declare_id!(\".*\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/prediction_market/src/lib.rs
fi

echo ""
echo "🔨 Rebuilding with new Program ID..."
anchor build

echo ""
echo "🚀 Deploying to Solana Devnet..."
anchor deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Contract deployed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update your frontend .env.local file:"
    echo "   VITE_PROGRAM_ID=$NEW_PROGRAM_ID"
    echo ""
    echo "2. Initialize the platform (run from src/smart_contracts):"
    echo "   npm run init-platform"
    echo ""
    echo "3. Clear your database to start fresh:"
    echo "   - Backup any important data first"
    echo "   - Clear markets, predictions, and engagement tables"
    echo ""
    echo "4. Restart your development environment"
    echo ""
    echo "🎉 Your fresh contract is ready for QA testing!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

# Save program ID to a file for easy reference
echo "$NEW_PROGRAM_ID" > ../../FRESH_PROGRAM_ID.txt
echo ""
echo "💾 Program ID saved to FRESH_PROGRAM_ID.txt" 