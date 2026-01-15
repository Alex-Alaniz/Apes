#!/bin/bash

echo "=== Checking Git Status ==="
git status

echo -e "\n=== Files to be committed ==="
# Check if there are changes to commit
if git diff --cached --quiet && git diff --quiet; then
    echo "No changes to commit!"
    exit 0
fi

# Stage all changes
echo -e "\n=== Staging changes ==="
git add -A

# Show what will be committed
echo -e "\n=== Changes to be committed ==="
git diff --cached --name-status

# Create commit
echo -e "\n=== Creating commit ==="
git commit -m "Add optional Privy wallet integration (disabled by default)

- Added Privy dependencies to frontend and backend
- Created Privy configuration and middleware  
- Made Privy completely optional via environment variables
- Frontend only uses Privy if VITE_ENABLE_PRIVY=true
- Backend gracefully handles missing Privy configuration
- No breaking changes to existing wallet authentication
- Security: Removed all hardcoded credentials

IMPORTANT: User must regenerate Privy App Secret before deployment

Co-Authored-By: Claude <noreply@anthropic.com>
🤖 Generated with Claude Code"

echo -e "\n=== Pushing to GitHub ==="
git push origin master

echo -e "\n=== Deployment Instructions ==="
echo "1. CRITICAL: Regenerate your Privy App Secret at https://dashboard.privy.io"
echo "2. Set environment variables in Railway:"
echo "   - PRIVY_APP_ID=cmfmo7so5004ojz0bl03kuy1l"
echo "   - PRIVY_APP_SECRET=<your-new-regenerated-secret>"
echo "3. Set environment variables in Vercel:"
echo "   - VITE_PRIVY_APP_ID=cmfmo7so5004ojz0bl03kuy1l"
echo "   - VITE_ENABLE_PRIVY=false (keep false until tested)"
echo "4. Backend will deploy automatically to Railway"
echo "5. Frontend will deploy automatically to Vercel"
echo "6. Test deployment with Privy disabled first"
echo "7. Enable Privy by setting VITE_ENABLE_PRIVY=true in Vercel after testing"