# 🚀 PRIMAPE Fresh Deployment Guide

This guide will help you deploy a completely fresh instance of PRIMAPE with new contracts, clean database, and proper configuration.

## 📋 Prerequisites

- Solana CLI installed and configured
- Node.js 18+ and npm
- PostgreSQL or Supabase account
- Phantom/Solflare wallet with SOL for deployments

## 🔧 Step 1: Deploy Fresh Solana Program

### 1.1 Build and Deploy New Program

```bash
# Navigate to your Solana program directory
cd program  # or wherever your Rust program is

# Build the program
anchor build

# Get the new program ID
solana address -k target/deploy/market_system-keypair.json

# Update Anchor.toml with new program ID
# Update lib.rs declare_id! with new program ID

# Rebuild with correct ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the program ID - you'll need this for frontend config
```

### 1.2 Create Fresh APES Token

```bash
# Create new token mint
spl-token create-token --decimals 6

# Note the token mint address - you'll need this for frontend config
```

## 🗄️ Step 2: Setup Fresh Database

### 2.1 For Supabase (Recommended)

1. Create new Supabase project
2. Run the following SQL in Supabase SQL Editor:

```sql
-- Create markets table
CREATE TABLE markets (
  id BIGSERIAL PRIMARY KEY,
  market_address VARCHAR(44) UNIQUE NOT NULL,
  creator VARCHAR(44) NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  resolution_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'Active',
  min_bet DECIMAL(20,6) DEFAULT 10.0,
  resolved_option INTEGER,
  options TEXT[] NOT NULL,
  option_volumes DECIMAL(20,6)[] DEFAULT '{}',
  total_volume DECIMAL(20,6) DEFAULT 0.0,
  participant_count INTEGER DEFAULT 0,
  poly_id VARCHAR(100),
  apechain_market_id VARCHAR(100),
  market_type VARCHAR(20) DEFAULT 'binary',
  options_metadata JSONB DEFAULT '[]',
  assets JSONB DEFAULT '{}',
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prediction_history table
CREATE TABLE prediction_history (
  id BIGSERIAL PRIMARY KEY,
  market_pubkey VARCHAR(44) NOT NULL,
  wallet_address VARCHAR(44) NOT NULL,
  option_index INTEGER NOT NULL,
  amount DECIMAL(20,6) NOT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(market_pubkey, wallet_address, option_index)
);

-- Create user_engagement table
CREATE TABLE user_engagement (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  markets_won INTEGER DEFAULT 0,
  total_volume DECIMAL(20,6) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_prediction_history_market ON prediction_history(market_pubkey);
CREATE INDEX idx_prediction_history_wallet ON prediction_history(wallet_address);
CREATE INDEX idx_user_engagement_wallet ON user_engagement(wallet_address);
```

### 2.2 For Local PostgreSQL

```bash
# Create database
createdb primape_production

# Run the same SQL as above in your PostgreSQL client
```

## ⚙️ Step 3: Update Configuration Files

### 3.1 Update Frontend Solana Config

Edit `src/frontend/src/config/solana.js`:

```javascript
export const NETWORK_CONFIG = {
  devnet: {
    rpcUrl: getPrimaryRpc('devnet'),
    rpcEndpoints: RPC_ENDPOINTS.devnet,
    name: "Devnet",
    programId: "YOUR_NEW_PROGRAM_ID_HERE",  // New program ID from Step 1.1
    tokenMint: "YOUR_NEW_TOKEN_MINT_HERE",  // New token mint from Step 1.2
    tokenSymbol: "APES",
    tokenDecimals: 6,  // Confirmed correct decimals
    tokenName: "PRIMAPE",
    // Treasury addresses (use your wallet addresses)
    platformFeeAddress: "YOUR_PLATFORM_FEE_WALLET_HERE", 
    treasuryAddress: "YOUR_TREASURY_WALLET_HERE",
    primeapeTreasury: "YOUR_PRIMAPE_TREASURY_HERE",
    communityTreasury: "YOUR_COMMUNITY_TREASURY_HERE"
  }
};
```

### 3.2 Update Backend Database Config

Create `src/backend/.env`:

```env
# Database Configuration (for Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OR for local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=primape_production
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# API Configuration
PORT=5001
NODE_ENV=production

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=YOUR_NEW_PROGRAM_ID_HERE
```

### 3.3 Update Access Control

Edit `src/frontend/src/config/access.js`:

```javascript
// Add your wallet addresses as authorized admins
const AUTHORIZED_WALLETS = [
  'YOUR_ADMIN_WALLET_ADDRESS_1',
  'YOUR_ADMIN_WALLET_ADDRESS_2',
  // Add more admin wallets as needed
];
```

## 🚀 Step 4: Initialize Platform

### 4.1 Initialize Solana Program

```bash
# Start frontend and backend
cd src/frontend && npm run dev &
cd src/backend && npm run dev &

# Connect your admin wallet to the frontend
# Navigate to admin panel: http://localhost:3000/admin
# Click "Initialize Platform" (this sets up program state)
```

### 4.2 Create Initial APES Tokens

```bash
# Create tokens for testing
spl-token mint YOUR_NEW_TOKEN_MINT_HERE 1000000 YOUR_WALLET_ADDRESS
```

## 🧪 Step 5: Test Deployment

### 5.1 Basic Functionality Test

1. **Navigate to**: `http://localhost:3000`
2. **Connect wallet** with APES tokens
3. **Create test market** in admin panel
4. **Place prediction** on test market
5. **Verify** all percentages and volumes are correct

### 5.2 API Health Check

```bash
# Test backend health
curl http://localhost:5001/health

# Test markets endpoint
curl http://localhost:5001/api/markets

# Test individual market
curl http://localhost:5001/api/markets/MARKET_ADDRESS_HERE
```

## 🔧 Step 6: Production Configuration

### 6.1 Environment Variables

Create production `.env` files with:
- Mainnet RPC endpoints
- Production database credentials  
- Proper treasury addresses
- Security configurations

### 6.2 Security Checklist

- [ ] Updated all default wallet addresses
- [ ] Set proper admin access controls
- [ ] Configured rate limiting
- [ ] Set up monitoring and logging
- [ ] Validated all smart contract interactions

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Health Checks

Set up monitoring for:
- Backend API uptime
- Database connectivity
- Solana RPC connectivity
- Token balance monitoring

### 7.2 Regular Maintenance

- Monitor participant counts accuracy
- Verify volume calculations
- Check for invalid market data
- Update RPC endpoints as needed

---

## 🎯 Quick Start Script

Run the comprehensive platform fix script:

```bash
chmod +x scripts/complete-platform-fix.sh
./scripts/complete-platform-fix.sh
```

This will:
✅ Clean invalid test data
✅ Verify token configuration  
✅ Clear all caches
✅ Test backend health
✅ Provide status summary

---

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid public key" errors**: Clear browser cache and restart servers
2. **Market pages not loading**: Check backend API endpoints
3. **Percentage calculations wrong**: Verify token decimals configuration
4. **Participant counts incorrect**: Run participant recount script

### Support Commands

```bash
# Clean database of invalid markets
npm run clean-db

# Recount all participants  
npm run recount-participants

# Reset platform state
npm run reset-platform

# Full cache clear
npm run clear-all-caches
```

---

**🎉 Your fresh PRIMAPE deployment is ready for production testing!** 