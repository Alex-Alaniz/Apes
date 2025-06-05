# Railway Deployment Guide - PRIMAPE Markets Platform

## Prerequisites
1. [Railway account](https://railway.app) (sign up with GitHub)
2. [Railway CLI](https://docs.railway.app/develop/cli) installed
3. GitHub repository for your code

## Step 1: Prepare the Application

### 1.1 Environment Variables Setup
Create production environment files:

```bash
# Create production env for backend
cp backend/env.example backend/.env.production

# Create production env for frontend  
echo "VITE_SOLANA_NETWORK=mainnet
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_PROGRAM_ID=9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts" > src/frontend/.env.production
```

### 1.2 Fix Backend Path Issue
The backend package.json has incorrect paths. Let's fix this:

```bash
# Update backend package.json scripts to use correct paths
# Change from: "../src/backend/server.js" 
# To: "server.js"
```

## Step 2: Railway Deployment

### 2.1 Deploy Database First
```bash
# Login to Railway
railway login

# Create new project
railway new primape-markets

# Add PostgreSQL service
railway add postgresql

# Note down the database URL (available in Railway dashboard)
```

### 2.2 Deploy Backend
```bash
# Deploy backend service
cd backend
railway up

# Set environment variables in Railway dashboard:
# - DATABASE_URL (auto-provided by Railway PostgreSQL)
# - SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
# - SOLANA_NETWORK=mainnet
# - NODE_ENV=production
```

### 2.3 Deploy Frontend
```bash
# Deploy frontend service  
cd ../src/frontend
railway up

# Set environment variables:
# - VITE_SOLANA_NETWORK=mainnet
# - VITE_API_URL=https://your-backend-url.railway.app/api
# - VITE_PROGRAM_ID=9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7
# - VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

## Step 3: Database Migration
```bash
# Run database setup on Railway
railway run node setup-tables.js

# Apply migrations
railway run node -e "require('./database/migrate.js')"
```

## Step 4: Domain Setup
1. Go to Railway dashboard
2. Click on your frontend service
3. Go to Settings > Domain
4. Add custom domain or use Railway's provided domain

## Environment Variables Checklist

### Backend (.env):
```
DATABASE_URL=postgresql://[auto-provided-by-railway]
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SOLANA_NETWORK=mainnet
NODE_ENV=production
PORT=3001
```

### Frontend (.env.production):
```
VITE_SOLANA_NETWORK=mainnet
VITE_API_URL=https://your-backend-domain.railway.app/api
VITE_PROGRAM_ID=9xZ5yUEktrEffymMNC7G4NongQGXtPb9q3CFr4TcjZY7
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check package.json scripts match directory structure
2. **CORS Errors**: Ensure backend allows frontend domain
3. **RPC Issues**: Verify Alchemy/Solana RPC endpoints work
4. **Database Connection**: Check DATABASE_URL format

### Health Checks:
- Backend: `https://your-backend.railway.app/health`
- Frontend: Access your domain to test UI
- Database: Check Railway logs for connection status

## Cost Estimation:
- **PostgreSQL**: ~$5/month
- **Backend Service**: ~$5/month  
- **Frontend Service**: ~$5/month
- **Total**: ~$15/month for production deployment

## Next Steps After Deployment:
1. Test all market functionality on mainnet
2. Deploy smart contracts (if not already deployed)
3. Set up monitoring and alerting
4. Configure custom domain
5. Set up CI/CD pipeline for future updates 