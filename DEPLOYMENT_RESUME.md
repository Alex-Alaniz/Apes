# 🚀 Resume Fresh Mainnet-Ready Deployment

## Current Status
- ✅ Fresh contracts compiled (Program ID: A8Ufe9GCsmWeowd2JBkNXq45wbe14ppQWhD9uZRoKFX5)
- ✅ Database cleanup script ready
- ✅ 9-decimal APES token setup ready
- ⏳ Waiting for more SOL (need 5+ SOL total)

## When You Have Enough SOL:

### Option 1: Complete Automated Deployment
```bash
# Once you have 5+ SOL, run:
./deploy-fresh-mainnet-ready.sh
```

### Option 2: Manual Step-by-Step (If Automated Fails)

#### 1. Clean Database
```bash
# If you have PostgreSQL access, run:
psql $DATABASE_URL -f clean-platform-database-only.sql

# OR if using local PostgreSQL:
psql -h localhost -d prediction_market -f clean-platform-database-only.sql
```

#### 2. Deploy Fresh Contract
```bash
cd src/smart_contracts/market_system
anchor deploy
```

#### 3. Create 9-Decimal APES Token
```bash
# Generate token keypair
solana-keygen new -o APES_TOKEN_MAINNET_DECIMALS.json --force --no-bip39-passphrase

# Create token with 9 decimals
APES_TOKEN=$(solana-keygen pubkey APES_TOKEN_MAINNET_DECIMALS.json)
spl-token create-token APES_TOKEN_MAINNET_DECIMALS.json --decimals 9

# Create account and mint initial supply
spl-token create-account $APES_TOKEN
spl-token mint $APES_TOKEN 1000000000000000000  # 1B APES with 9 decimals
```

#### 4. Update Environment Files
```bash
# Update frontend/.env
cat > src/frontend/.env << EOF
VITE_API_URL=http://localhost:5001
VITE_PROGRAM_ID=A8Ufe9GCsmWeowd2JBkNXq45wbe14ppQWhD9uZRoKFX5
VITE_APES_TOKEN_MINT=$APES_TOKEN
VITE_TOKEN_DECIMALS=9
VITE_RPC_URL=https://api.devnet.solana.com
EOF
```

#### 5. Initialize Platform
```bash
cd src/smart_contracts/market_system
# Create initialization script if needed
anchor run init-platform
```

#### 6. Start Testing
```bash
# Start development environment
./run-dev.sh

# Run tests
node scripts/check-platform-status.js
```

## Verification After Deployment

### Check Contract
```bash
solana program show A8Ufe9GCsmWeowd2JBkNXq45wbe14ppQWhD9uZRoKFX5
```

### Check APES Token (9 decimals)
```bash
spl-token display $APES_TOKEN
```

### Check Platform Status
```bash
node scripts/check-platform-status.js
```

## Testing Focus Areas

### 1. Token Decimal Handling
- ✅ 9 decimals instead of 6
- ✅ All UI amounts display correctly
- ✅ Predictions work with proper decimals
- ✅ Rewards calculate correctly

### 2. Fresh Database
- ✅ No old test data
- ✅ Polymarket data preserved
- ✅ Clean user onboarding
- ✅ Fresh leaderboards

### 3. Mainnet Readiness
- ✅ Contract deployment process
- ✅ Token creation process  
- ✅ Environment configuration
- ✅ End-to-end user flow

## Expected Results
- **Fresh platform** with zero prior data
- **9-decimal APES** matching mainnet standards
- **Clean testing environment** for mainnet validation
- **Preserved Polymarket data** for integration testing

---
**Next**: Once SOL is available, run the deployment and begin comprehensive testing! 