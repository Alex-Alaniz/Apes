#!/bin/bash

echo "Installing scraper dependencies..."

# Navigate to backend directory
cd "$(dirname "$0")/.." || exit

# Install required packages
npm install --save \
  node-cron \
  puppeteer-extra \
  puppeteer-extra-plugin-stealth \
  ethers

echo "✅ Scraper dependencies installed successfully"