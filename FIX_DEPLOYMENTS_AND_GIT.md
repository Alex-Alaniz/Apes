# 🔧 Fix Railway Health Check & Future Git Operations

## 🚨 Current Issue: Railway Health Check Failing

The health endpoint exists at `/health` but Railway can't reach it. This is likely because:
1. The monitoring routes might not be imported/mounted correctly
2. The server might be crashing during startup due to missing dependencies

## 🛠️ Quick Fix Script

Create this fix script to ensure health endpoint is accessible:

```bash
#!/bin/bash
# fix-health-endpoint.sh

cd /Users/alexalaniz/Documents/GitHub/apes

# 1. Add a simple health endpoint directly in server.js as fallback
cat << 'EOF' > add-health-endpoint.js
const fs = require('fs');
const path = require('path');

// Read server.js
const serverPath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Check if simple health endpoint exists
if (!content.includes("app.get('/health'")) {
  // Find where to insert (before error handling middleware)
  const insertPoint = content.indexOf('// Error handling middleware');
  
  if (insertPoint !== -1) {
    const healthEndpoint = `
// Simple health check endpoint (fallback)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

`;
    content = content.slice(0, insertPoint) + healthEndpoint + content.slice(insertPoint);
    fs.writeFileSync(serverPath, content);
    console.log('✅ Added health endpoint to server.js');
  }
}
EOF

node add-health-endpoint.js

# 2. Commit and push
git add backend/server.js
git commit -m "Fix: Add fallback health endpoint for Railway deployment"
git push origin master
```

## 🔄 Fix for Future Git Operations in New Claude Sessions

### Option 1: Git Configuration Script
Create this script to ensure git works in future Claude sessions:

```bash
#!/bin/bash
# setup-git-for-claude.sh

# Set up git configuration
git config --global user.email "claude-code@anthropic.com"
git config --global user.name "Claude Code"

# Create a test script to verify git works
cat << 'EOF' > test-git-operations.sh
#!/bin/bash
echo "Testing git operations..."
git status
git log --oneline -5
echo "Git operations working!"
EOF

chmod +x test-git-operations.sh
```

### Option 2: Environment Reset Script
If shell issues persist, create this reset script:

```bash
#!/bin/bash
# reset-claude-environment.sh

# Clear any problematic environment variables
unset GIT_DIR
unset GIT_WORK_TREE

# Set working directory
cd /Users/alexalaniz/Documents/GitHub/apes

# Test git
git status
```

## 📋 Monitoring Deployments

### Install Railway CLI (if not installed):
```bash
brew install railway
```

### Install Vercel CLI (if not installed):
```bash
npm install -g vercel
```

### Monitor deployments:
```bash
# Railway
railway status
railway logs

# Vercel
vercel ls
vercel logs
```

## 🎯 Immediate Actions

1. **Fix Health Endpoint**:
   ```bash
   # Create and run the fix script
   vim fix-health-endpoint.sh
   # Paste the script content above
   chmod +x fix-health-endpoint.sh
   ./fix-health-endpoint.sh
   ```

2. **Test New Claude Session**:
   Start a new Claude Code session and ask:
   ```
   Can you navigate to /Users/alexalaniz/Documents/GitHub/apes and run git status? 
   If that works, create a test file, commit it, and push to verify git operations are working.
   ```

3. **Monitor Deployments**:
   ```bash
   # Watch Railway deployment
   railway logs --tail

   # Watch Vercel deployment  
   vercel logs --follow
   ```

## 🔍 Root Cause Analysis

The shell issue you experienced is likely due to:
1. Corrupted shell session state
2. Missing or invalid environment variables
3. Temporary file system issues

Starting a new Claude Code session should resolve this, but the scripts above will help ensure smooth operations going forward.

## ✅ Success Criteria

1. Railway health check passes at `/health`
2. Both Railway and Vercel deploy successfully
3. New Claude Code sessions can perform git operations
4. Monitoring via CLI tools works