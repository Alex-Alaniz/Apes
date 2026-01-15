#!/bin/bash

# Script to run local frontend with production backend

echo "🦍 Starting APES Frontend (Local) with Production Backend..."
echo "================================================"
echo "Frontend: http://localhost:3000"
echo "Backend: https://apes-production.up.railway.app"
echo "================================================"

# Check if frontend .env is configured correctly
if grep -q "VITE_API_URL=https://apes-production.up.railway.app" src/frontend/.env; then
    echo "✅ Frontend configured to use production backend"
else
    echo "⚠️  Warning: Frontend not configured for production backend"
    echo "Please update src/frontend/.env with:"
    echo "VITE_API_URL=https://apes-production.up.railway.app"
fi

# Start frontend
cd src/frontend
echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting frontend development server..."
npm run dev