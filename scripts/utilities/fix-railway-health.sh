#!/bin/bash

echo "🔧 Fixing Railway health check endpoint..."

cd /Users/alexalaniz/Documents/GitHub/apes

# Create a simple Node.js script to add health endpoint
cat << 'EOF' > fix-health.js
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Check if monitoring routes are properly imported
if (!content.includes("require('./routes/monitoring')")) {
  console.log("⚠️  Monitoring routes not imported properly");
}

// Add a simple health endpoint before the error handling middleware
const errorHandlerIndex = content.indexOf('// Error handling middleware');
if (errorHandlerIndex !== -1 && !content.includes("app.get('/health'")) {
  const healthEndpoint = `
// Simple health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    service: 'apes-backend'
  });
});

`;
  content = content.slice(0, errorHandlerIndex) + healthEndpoint + content.slice(errorHandlerIndex);
  fs.writeFileSync(serverPath, content);
  console.log("✅ Added health endpoint to server.js");
} else {
  console.log("ℹ️  Health endpoint already exists or couldn't find insertion point");
}
EOF

# Run the fix
node fix-health.js

# Clean up
rm fix-health.js

# Commit and push
git add backend/server.js
git commit -m "Fix: Add simple health endpoint for Railway deployment

- Added direct /health endpoint in server.js
- Ensures Railway health checks pass
- Fallback for monitoring routes

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin master

echo "✅ Fix pushed! Railway should redeploy automatically."