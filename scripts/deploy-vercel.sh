#!/bin/bash

# PRIMAPE Markets - Vercel + Railway Deployment Script
# Frontend on Vercel (best performance) + Backend on Railway

set -e  # Exit on any error

echo "🚀 PRIMAPE Markets - Vercel + Railway Deployment"
echo "================================================"

# Check if required CLIs are installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ CLIs are ready"

# Step 1: Deploy Backend + Database on Railway
echo "🛤️  Deploying backend and database on Railway..."

# Login to Railway if needed
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
fi

# Create Railway project for backend
read -p "Enter Railway project name (default: primape-backend): " RAILWAY_PROJECT
RAILWAY_PROJECT=${RAILWAY_PROJECT:-primape-backend}

railway new "$RAILWAY_PROJECT"
railway add postgresql

# Deploy backend
cd backend

# Create production env for backend
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN
CORS_ORIGIN=*
EOF

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

railway up --detach
BACKEND_URL=$(railway domain)
echo "✅ Backend deployed at: https://$BACKEND_URL"

# Setup database
railway run npm run db:migrate
echo "✅ Database tables created"

# Step 2: Deploy Frontend on Vercel
echo "🎨 Deploying frontend on Vercel..."
cd ../src/frontend

# Create production environment for frontend
cat > .env.production << EOF
VITE_SOLANA_NETWORK=mainnet
VITE_API_URL=https://$BACKEND_URL/api
VITE_PROGRAM_ID=9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
EOF

# Create vercel.json configuration
cat > vercel.json << EOF
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "VITE_SOLANA_NETWORK": "mainnet",
    "VITE_API_URL": "https://$BACKEND_URL/api",
    "VITE_PROGRAM_ID": "9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7",
    "VITE_TOKEN_MINT": "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
EOF

# Deploy to Vercel
vercel --prod
FRONTEND_URL=$(vercel ls --scope=team | grep -E "primape|prediction" | head -1 | awk '{print $2}')

echo "✅ Frontend deployed at: https://$FRONTEND_URL"

# Step 3: Update CORS in backend
echo "🔧 Updating CORS configuration..."
cd ../../backend
railway run -e "CORS_ORIGIN=https://$FRONTEND_URL" npm start

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo "Frontend (Vercel): https://$FRONTEND_URL"
echo "Backend (Railway):  https://$BACKEND_URL"
echo "API URL:           https://$BACKEND_URL/api"
echo ""
echo "🚀 Performance Optimized Deployment:"
echo "  • Frontend: Vercel Edge Network (Ultra Fast)"
echo "  • Backend: Railway (Reliable & Scalable)"
echo "  • Database: Railway PostgreSQL (Managed)"
echo ""
echo "💰 Cost Breakdown:"
echo "  • Vercel Frontend: $0 (Hobby Plan)"
echo "  • Railway Backend: ~$5/month"
echo "  • Railway Database: ~$5/month"
echo "  • Total: ~$10/month"
echo ""
echo "✅ Your Solana prediction market is now live!" 