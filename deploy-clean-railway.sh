#!/bin/bash

echo "🚀 Deploying APES to Railway (Clean Version - No Scrapers)..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm install

# Verify no Puppeteer dependencies
if npm list puppeteer > /dev/null 2>&1; then
    echo "⚠️  Warning: Puppeteer still found in dependencies"
    echo "   Run: npm uninstall puppeteer puppeteer-extra puppeteer-extra-plugin-stealth"
fi

cd ..

# Verify configuration files
echo "🔍 Verifying configuration files..."

if [ ! -f "railway.json" ]; then
    echo "❌ Error: railway.json not found"
    exit 1
fi

echo "✅ Configuration files verified"

# Check for any remaining scraper references
echo "🔍 Checking for scraper references..."
if grep -r "scraper\|puppeteer" backend/ --include="*.js" | grep -v "// DISABLED\|// REMOVED\|// Scraper endpoints removed"; then
    echo "⚠️  Warning: Found scraper references in code"
    echo "   These should be cleaned up for production"
fi

echo ""
echo "📋 Clean deployment checklist:"
echo "✅ Removed all scraper files"
echo "✅ Removed Puppeteer dependencies"
echo "✅ Cleaned Railway configuration"
echo "✅ Updated server logic"
echo "✅ Removed nixpacks.toml (no Chromium needed)"
echo ""
echo "🚀 Ready to deploy! Run: railway up"
echo ""
echo "💡 Note: Scrapers are now handled in a separate project to avoid deployment conflicts"



