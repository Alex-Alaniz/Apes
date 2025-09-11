#!/bin/bash

echo "🚀 Deploying APES to Railway with Puppeteer fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm install

# Check if puppeteer is installed
if ! npm list puppeteer > /dev/null 2>&1; then
    echo "⚠️  Puppeteer not found, installing..."
    npm install puppeteer@^21.11.0
fi

cd ..

# Verify configuration files
echo "🔍 Verifying configuration files..."

if [ ! -f "nixpacks.toml" ]; then
    echo "❌ Error: nixpacks.toml not found"
    exit 1
fi

if [ ! -f "railway.json" ]; then
    echo "❌ Error: railway.json not found"
    exit 1
fi

echo "✅ Configuration files verified"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
echo "Make sure you have Railway CLI installed and are logged in"
echo "Run: railway login && railway up"

echo ""
echo "📋 Deployment checklist:"
echo "✅ Added puppeteer dependency"
echo "✅ Created nixpacks.toml with Chromium"
echo "✅ Updated railway.json with Puppeteer environment variables"
echo "✅ Updated Puppeteer launch configuration for Railway"
echo ""
echo "🔧 Environment variables set:"
echo "   - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
echo "   - PUPPETEER_EXECUTABLE_PATH=/nix/store/*-chromium-*/bin/chromium"
echo ""
echo "🚀 Ready to deploy! Run: railway up"


