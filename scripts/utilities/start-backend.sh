#!/bin/bash

# Railway backend startup script
echo "🚂 Railway Backend Startup Script"
echo "================================"

# Debug information
echo "📍 Current directory: $(pwd)"
echo "📁 Directory contents:"
ls -la

# Navigate to backend directory
if [ -d "backend" ]; then
    echo "✅ Found backend directory"
    cd backend
    echo "📍 Now in: $(pwd)"
else
    echo "❌ Backend directory not found!"
    exit 1
fi

# Check for required files
echo ""
echo "🔍 Checking for required files..."
for file in package.json server-minimal.js server.js; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
    else
        echo "⚠️  Missing: $file"
    fi
done

# Start the server
echo ""
echo "🚀 Starting server with node server-minimal.js..."
exec node server-minimal.js