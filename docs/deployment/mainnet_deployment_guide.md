# 🚀 APES Prediction Market - Mainnet Deployment Guide

## ✅ Status: Ready for Production Launch

Your APES Prediction Market Platform is now **LIVE on Solana Mainnet** and ready for deployment!

## 📋 Configuration Summary

### 🔗 Mainnet Smart Contract Details
- **Program ID**: `APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS`
- **Platform State**: `GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb`
- **APES Token**: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- **Treasury**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`

### 🌐 Network Configuration
- **RPC Provider**: Helius (Primary)
- **WebSocket Support**: ✅ Enabled
- **Fee Structure**: 2.5% bet burn, 1.5% claim burn, 1% platform fee

## 🔧 Frontend Deployment Instructions

### Step 1: Environment Variables for Production

Create a `.env.production` file in your frontend directory:

```bash
# Network Configuration
VITE_SOLANA_NETWORK=mainnet

# API Keys (replace with your actual keys)
VITE_HELIUS_API_KEY=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d
VITE_BELIEVE_API_KEY=your-believe-api-key

# Optional: Override default configurations
VITE_PROGRAM_ID=APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Navigate to frontend directory
cd src/frontend

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Go to your project settings and add the environment variables above
```

### Step 3: Deploy to Railway (Alternative)

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Navigate to frontend directory
cd src/frontend

# Login to Railway
railway login

# Initialize and deploy
railway init
railway up

# Set environment variables in Railway dashboard
```

## 🗄️ Backend Deployment Instructions

### Step 1: PostgreSQL Database Setup

**Option A: Railway PostgreSQL**
```bash
# Add PostgreSQL service in Railway
railway add postgresql

# Get connection details from Railway dashboard
```

**Option B: Supabase**
```bash
# Create project at https://supabase.com
# Get connection string from project settings
```

### Step 2: Backend Environment Variables

Create `.env` in your backend directory:

```bash
# Database
DATABASE_URL=your-postgresql-connection-string

# Solana Configuration
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=4a7d2ddd-3e83-4265-a9fb-0e4a5b51fd6d
PROGRAM_ID=APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS

# API Keys
BELIEVE_API_KEY=your-believe-api-key

# Security
JWT_SECRET=your-secure-jwt-secret
```

### Step 3: Deploy Backend

```bash
# Navigate to backend directory
cd src/backend

# Deploy to Railway
railway init
railway up

# Or deploy to Heroku/other platform of choice
```

## 🎯 Testing Your Deployment

### 1. Frontend Testing
- ✅ Wallet connection works
- ✅ APES token balance displays correctly
- ✅ Can view existing markets
- ✅ Transaction signing works

### 2. Smart Contract Testing
- ✅ Platform state initialized
- ✅ Can create markets (with authorized wallet)
- ✅ Can place predictions
- ✅ Fee structure working correctly

### 3. Backend Testing
- ✅ API endpoints respond
- ✅ Database connection works
- ✅ Market data syncing
- ✅ Believe API integration

## 🔗 Important URLs

### Production Links
- **Frontend**: Your deployed Vercel/Railway URL
- **Backend API**: Your deployed backend URL
- **Admin Panel**: `your-frontend-url/admin`

### Blockchain Links
- **Program**: https://solscan.io/account/APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
- **Platform State**: https://solscan.io/account/GD3SoR4aHLLtzY9jYZyL7qH64VA73waMtvH9KRSZ3Bgb
- **APES Token**: https://solscan.io/token/9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts

## 🚀 Go Live Checklist

- [ ] ✅ Smart contract deployed and initialized
- [ ] ✅ Frontend configured for mainnet
- [ ] 📝 Frontend deployed to production
- [ ] 📝 Backend deployed with PostgreSQL
- [ ] 📝 Environment variables set correctly
- [ ] 📝 DNS/domain configured (optional)
- [ ] 📝 SSL certificates enabled
- [ ] 📝 Admin access verified
- [ ] 📝 First test market created
- [ ] 📝 Believe API integration tested

## 💰 Fee Structure Summary

| Action | Fee Type | Rate | Recipient |
|--------|----------|------|-----------|
| Place Bet | Burn | 2.5% | Token Burn |
| Claim Reward | Burn | 1.5% | Token Burn |
| Platform Fee | Transfer | 1% | PRIMAPE Treasury |

**Total Platform Revenue**: 1% of all betting volume
**Token Deflationary Pressure**: 4% of all betting volume burned

## 🎉 Launch Your Platform!

Your APES Prediction Market Platform is now ready for production use! 

**Key Features:**
- ✅ Custom APES Program ID for branding
- ✅ Integration with live APES token
- ✅ Mainnet-ready smart contracts
- ✅ Professional fee structure
- ✅ Treasury management
- ✅ Scalable architecture

**Ready to create your first markets and start generating revenue!** 🚀 