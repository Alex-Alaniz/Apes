#!/bin/bash

echo "🚀 Solana Prediction Market Platform - QA Testing Setup"
echo "======================================================"
echo ""

# Check if we're in the project root
if [ ! -d "src/frontend" ]; then
  echo "❌ Error: Please run this script from the project root directory"
  exit 1
fi

echo "📋 Current Status:"
echo "- Program ID: FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib"
echo "- Token: $APES (9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts)"
echo "- Network: Solana Devnet"
echo "- Platform: Not initialized (using mock data)"
echo ""

echo "✅ Mock Markets Available for Testing:"
echo "1. Will Bitcoin reach $150,000 by December 31, 2024?"
echo "2. Will the Federal Reserve cut rates in Q1 2025?"
echo "3. Will SpaceX land humans on Mars before 2030?"
echo "4. Who will win the 2024 NBA Championship?"
echo "5. Will AI achieve AGI by 2027?"
echo ""

echo "🎯 Starting Frontend Server..."
echo ""

# Navigate to frontend directory
cd src/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🚀 Starting the development server..."
echo ""
echo "The frontend will be available at: http://localhost:3000"
echo ""
echo "📱 QA Testing Checklist:"
echo "[ ] Connect your wallet (Phantom, Solflare, etc.)"
echo "[ ] Browse available markets"
echo "[ ] Filter markets by category"
echo "[ ] Search for specific markets"
echo "[ ] View market details"
echo "[ ] Place predictions (simulated with 1M mock APES)"
echo "[ ] Create new markets"
echo "[ ] Test responsive design on mobile"
echo "[ ] Check dark mode theme"
echo "[ ] Test admin features (if using admin wallet)"
echo ""
echo "Press Ctrl+C to stop the server when done testing."
echo ""

# Start the development server
npm run dev 