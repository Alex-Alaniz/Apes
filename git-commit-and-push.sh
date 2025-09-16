#!/bin/bash

cd /Users/alexalaniz/Documents/GitHub/apes

echo "📦 Staging all changes..."
git add -A

echo "📝 Creating commit..."
git commit -m "$(cat <<'EOF'
Add optional Privy wallet integration (disabled by default)

- Added Privy dependencies to frontend and backend  
- Created Privy configuration and middleware
- Made Privy completely optional via environment variables
- Frontend only uses Privy if VITE_ENABLE_PRIVY=true
- Backend gracefully handles missing Privy configuration
- No breaking changes to existing wallet authentication
- Security: Removed all hardcoded credentials

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

echo "🚀 Pushing to GitHub..."
git push origin master

echo "✅ Done! Check Railway and Vercel for deployment status."