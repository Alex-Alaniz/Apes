#!/bin/bash

# Simple script to push Privy changes to GitHub

echo "📦 Pushing Privy integration to GitHub..."
echo "This will trigger automatic deployment to Railway and Vercel"
echo ""

# Add all changes
git add -A

# Create commit
git commit -m "Add optional Privy wallet integration (disabled by default)

- Added Privy dependencies to frontend and backend  
- Created Privy configuration and middleware
- Made Privy completely optional via environment variables
- Frontend only uses Privy if VITE_ENABLE_PRIVY=true
- Backend gracefully handles missing Privy configuration
- No breaking changes to existing wallet authentication
- Security: Removed all hardcoded credentials

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin master

echo ""
echo "✅ Pushed to GitHub!"
echo ""
echo "🚀 What happens next:"
echo "1. Railway will automatically detect the push and redeploy the backend"
echo "2. Vercel will automatically detect the push and redeploy the frontend"
echo "3. Check your deployment dashboards to monitor progress"
echo ""
echo "⏱️ Deployments usually take 2-5 minutes"