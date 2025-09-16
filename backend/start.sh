#!/bin/bash
echo "🚀 Starting APES Backend..."
echo "📊 Environment Variables:"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "PWD: $PWD"
echo "POSTGRES_URL: ${POSTGRES_URL:0:50}..."
echo "📁 Directory contents:"
ls -la | head -20
echo "📦 Node version:"
node --version
echo "📦 NPM version:"
npm --version
echo "🔍 Checking if server.js exists:"
if [ -f "server.js" ]; then
    echo "✅ server.js found"
else
    echo "❌ server.js NOT found!"
fi
echo "🔄 Starting server with npm start..."
exec npm start