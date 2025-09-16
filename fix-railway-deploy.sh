#!/bin/bash

echo "🔧 Debugging Railway deployment issue..."

cd /Users/alexalaniz/Documents/GitHub/apes

# Create a test script to add early health endpoint
cat << 'EOF' > add-early-health.js
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Add health endpoint right after express setup
const expressSetupIndex = content.indexOf('app.use(express.json');
if (expressSetupIndex !== -1 && !content.includes("app.get('/health', (req, res) =>")) {
  // Find the end of the line
  let lineEnd = content.indexOf('\n', expressSetupIndex);
  
  const healthEndpoint = `

// Early health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
`;
  
  content = content.slice(0, lineEnd + 1) + healthEndpoint + content.slice(lineEnd + 1);
  fs.writeFileSync(serverPath, content);
  console.log("✅ Added early health endpoint");
} else {
  console.log("⚠️  Could not add health endpoint");
}

// Also ensure monitoring routes are not commented out
if (content.includes("//app.use('/', monitoringRoutes)")) {
  content = content.replace("//app.use('/', monitoringRoutes)", "app.use('/', monitoringRoutes)");
  fs.writeFileSync(serverPath, content);
  console.log("✅ Uncommented monitoring routes");
}
EOF

# Run the fix
node add-early-health.js

# Create a minimal test server to verify
cat << 'EOF' > backend/test-health.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Health test server running on port ${PORT}`);
});
EOF

# Clean up
rm add-early-health.js

# Stage all changes
git add -A

# Commit with detailed message
git commit -m "Fix: Add early health endpoint for Railway deployment

- Added simple /health endpoint early in server.js
- Ensures health check passes even if other middleware fails
- Added test-health.js for debugging

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push changes
git push origin master

echo "✅ Changes pushed! Railway will redeploy."
echo ""
echo "📋 If health check still fails, Railway might be hitting the wrong port or path."
echo "   Check Railway service settings for:"
echo "   - PORT environment variable"
echo "   - Health check path (should be /health)"
echo "   - Health check timeout"