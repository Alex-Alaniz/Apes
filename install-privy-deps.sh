#!/bin/bash

echo "🚀 Installing Privy dependencies..."

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
cd src/frontend
npm install @privy-io/react-auth@latest ethers@^6 viem

# Backend dependencies
echo "📦 Installing backend dependencies..."
cd ../../backend
npm install @privy-io/server-auth@latest

echo "✅ Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: chmod +x install-privy-deps.sh"
echo "2. Run: ./install-privy-deps.sh"
echo "3. Follow the Quick Start in PRIVY_IMPLEMENTATION_STATUS.md"