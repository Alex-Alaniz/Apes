#!/bin/bash

# PRIMAPE Markets - Railway Deployment Script
# This script automates the deployment of the Solana prediction market platform to Railway

set -e  # Exit on any error

echo "🚀 PRIMAPE Markets - Railway Deployment"
echo "======================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    railway login
fi

echo "✅ Railway CLI is ready"

# Step 1: Create production environment files
echo "📝 Creating production environment files..."

# Create backend production env
cat > backend/.env.production << EOF
NODE_ENV=production
PORT=3001
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
CORS_ORIGIN=*
# DATABASE_URL will be auto-provided by Railway PostgreSQL
EOF

# Create frontend production env
cat > src/frontend/.env.production << EOF
VITE_SOLANA_NETWORK=mainnet
VITE_PROGRAM_ID=9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
# VITE_API_URL will be set after backend deployment
EOF

echo "✅ Environment files created"

# Step 2: Initialize Railway project
echo "🛤️  Creating Railway project..."
read -p "Enter project name (default: primape-markets): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-primape-markets}

railway new "$PROJECT_NAME"
echo "✅ Railway project '$PROJECT_NAME' created"

# Step 3: Deploy PostgreSQL Database
echo "🗄️  Adding PostgreSQL database..."
railway add postgresql
echo "✅ PostgreSQL database added"

# Wait for database to be ready
echo "⏳ Waiting for database to initialize..."
sleep 10

# Step 4: Deploy Backend
echo "🔧 Deploying backend service..."
cd backend

# Create railway.json for backend
cat > railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "on_failure"
  }
}
EOF

# Deploy backend
railway up --detach
BACKEND_URL=$(railway domain)

echo "✅ Backend deployed at: $BACKEND_URL"

# Step 5: Update frontend env with backend URL
cd ../src/frontend
echo "VITE_API_URL=https://$BACKEND_URL/api" >> .env.production

# Step 6: Deploy Frontend
echo "🎨 Deploying frontend service..."

# Create railway.json for frontend
cat > railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l 3000",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "on_failure"
  }
}
EOF

# Add serve dependency for static file serving
npm install --save-dev serve

# Deploy frontend
railway up --detach
FRONTEND_URL=$(railway domain)

echo "✅ Frontend deployed at: $FRONTEND_URL"

# Step 7: Setup Database Tables
echo "🏗️  Setting up database tables..."
cd ../../backend
railway run npm run db:migrate

echo "✅ Database tables created"

# Step 8: Final Summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo "Frontend URL: https://$FRONTEND_URL"
echo "Backend URL:  https://$BACKEND_URL"
echo "API URL:      https://$BACKEND_URL/api"
echo ""
echo "🔧 Next Steps:"
echo "1. Test your application at the frontend URL"
echo "2. Check Railway dashboard for logs and monitoring"
echo "3. Set up custom domain (optional)"
echo "4. Configure monitoring and alerts"
echo ""
echo "📊 Estimated Monthly Cost: ~$15"
echo "🔐 Railway Dashboard: https://railway.app/dashboard"
echo ""
echo "✅ Your Solana prediction market is now live!" 