# Daily Crypto Predictions - QA Testing & Deployment Guide

## 🧪 QA Testing Checklist

### 1. Pre-Testing Setup

#### Backend Environment Setup
```bash
# 1. Add to backend/.env (use a test wallet first)
DEPLOYER_PRIVATE_KEY=<base64-encoded-test-wallet-private-key>

# 2. Run database migration
cd backend
psql $DATABASE_URL < migrations/add-transaction-signature-column.sql

# 3. Install dependencies (already done)
npm install @coral-xyz/anchor @solana/spl-token

# 4. Start backend
npm run dev
```

#### Frontend Testing
```bash
# Start frontend
cd src/frontend
npm run dev
```

### 2. Local Testing Steps

#### Test 1: Navigate to Daily Crypto Page
- [ ] Visit http://localhost:3000/daily-crypto
- [ ] Verify page loads without errors
- [ ] Check navbar shows "🔮 Daily Crypto" link
- [ ] Verify UI displays properly (no markets initially)

#### Test 2: Create Daily Markets (Admin Only)
- [ ] Connect admin wallet with APES tokens and SOL
- [ ] Click "Create Today's Markets" button
- [ ] Monitor console for creation progress
- [ ] Verify 3 markets created (BTC, ETH, SOL)
- [ ] Check transaction signatures in console
- [ ] Verify markets appear in UI

#### Test 3: Market Display Verification
- [ ] Each market shows:
  - [ ] Crypto symbol (₿, Ξ, ◎)
  - [ ] Current price in description
  - [ ] Multiple price range options
  - [ ] Countdown timer to resolution
  - [ ] Minimum bet amount (10 APES)

#### Test 4: Place Test Bets
- [ ] Connect a user wallet with APES tokens
- [ ] Select a price prediction option
- [ ] Place minimum bet (10 APES)
- [ ] Verify transaction completes
- [ ] Check "My Bets" shows position
- [ ] Verify APES balance decreased

#### Test 5: Database Verification
```sql
-- Check markets were created with transaction signatures
SELECT market_address, question, transaction_signature, created_at 
FROM markets 
WHERE category = 'Crypto' 
AND question LIKE '%tomorrow%'
ORDER BY created_at DESC;

-- Verify predictions were recorded
SELECT * FROM predictions 
WHERE market_address IN (
    SELECT market_address FROM markets 
    WHERE category = 'Crypto' AND DATE(created_at) = CURRENT_DATE
);
```

#### Test 6: API Endpoint Testing
```bash
# Test GET daily crypto markets
curl http://localhost:5001/api/markets/daily-crypto

# Test POST create markets (admin only)
curl -X POST http://localhost:5001/api/markets/daily-crypto \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 3. Edge Case Testing

- [ ] Try creating markets twice in one day (should fail without force=true)
- [ ] Test with insufficient APES balance in admin wallet
- [ ] Test with no SOL for transaction fees
- [ ] Test market creation when CoinGecko API is down
- [ ] Test betting with exactly 10 APES (minimum)
- [ ] Test betting with less than 10 APES (should fail)

## 🚀 Production Deployment Process

### Step 1: Prepare Admin Wallet

1. **Create/Designate Admin Wallet**
   ```bash
   # If creating new wallet
   solana-keygen new -o admin-wallet.json
   
   # Get public key
   solana address -k admin-wallet.json
   
   # Convert to base64 for environment variable
   cat admin-wallet.json | base64
   ```

2. **Fund Admin Wallet**
   - Transfer 500+ APES tokens (100 per market + buffer)
   - Transfer 0.1+ SOL for transaction fees

3. **Add to Access Control** (if not already admin)
   ```bash
   # Use existing admin to add new wallet
   node scripts/add-admin-wallet.js <new-admin-pubkey>
   ```

### Step 2: Database Migration

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration
\i migrations/add-transaction-signature-column.sql

# Verify column added
\d markets
```

### Step 3: Environment Variables

#### Railway Backend
1. Go to Railway dashboard
2. Select backend service
3. Add environment variable:
   ```
   DEPLOYER_PRIVATE_KEY=<base64-encoded-private-key>
   ```
4. Railway will auto-redeploy

#### Verify Configuration
```bash
# Check backend logs for initialization
railway logs -n 100 | grep "DailyCryptoPredictionsService"

# Should see:
# ✅ DailyCryptoPredictionsService initialized
# 📡 Network: mainnet-beta
# 🔑 Admin Wallet: <admin-pubkey>
```

### Step 4: Frontend Deployment

Frontend should auto-deploy to Vercel on push, but verify:

1. **Check Vercel deployment**
   - Visit Vercel dashboard
   - Verify latest commit deployed
   - Check build logs for errors

2. **Test Production URL**
   - Visit https://apes.primape.app/daily-crypto
   - Page should load (empty initially)

### Step 5: Create First Production Markets

1. **Manual Creation (Recommended for first time)**
   ```bash
   # SSH to backend or use Railway CLI
   railway run node scripts/create-daily-crypto-predictions.js
   ```

2. **Monitor Creation**
   - Check console output for each market
   - Verify transaction signatures
   - Note market addresses

3. **Verify on Solscan**
   - Visit https://solscan.io/tx/<transaction_signature>
   - Confirm successful transactions
   - Check market accounts created

### Step 6: Production Verification

1. **Frontend Check**
   - Visit https://apes.primape.app/daily-crypto
   - Verify 3 markets displayed
   - Test placing a small bet

2. **Database Check**
   ```sql
   -- Production database
   SELECT market_address, question, transaction_signature 
   FROM markets 
   WHERE category = 'Crypto' 
   AND transaction_signature IS NOT NULL
   ORDER BY created_at DESC 
   LIMIT 3;
   ```

3. **API Health Check**
   ```bash
   curl https://apes-production.up.railway.app/api/markets/daily-crypto
   ```

## 🔄 Daily Operations

### Automated Daily Creation (Future Enhancement)
```bash
# Add cron job or scheduled task
0 0 * * * curl -X POST https://apes-production.up.railway.app/api/markets/daily-crypto \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"force": false}'
```

### Manual Daily Creation
1. Visit https://apes.primape.app/daily-crypto as admin
2. Click "Create Today's Markets" button
3. Or run: `railway run node scripts/create-daily-crypto-predictions.js`

## 🚨 Rollback Plan

If issues occur:

1. **Disable Frontend Route**
   ```javascript
   // Temporarily comment out in App.jsx
   // <Route path="/daily-crypto" element={<DailyCryptoPredictionsPage />} />
   ```

2. **Disable API Endpoints**
   ```javascript
   // Comment out in backend/routes/markets.js
   // router.post('/daily-crypto', ...
   // router.get('/daily-crypto', ...
   ```

3. **Keep Markets Active**
   - Existing markets will continue to function
   - Users can still bet and claim normally

## 📊 Success Metrics

Monitor after deployment:
- [ ] Number of daily markets created
- [ ] Total volume on crypto predictions
- [ ] User participation rate
- [ ] Transaction success rate
- [ ] No increase in error logs

## 🛡️ Security Checklist

- [ ] Admin private key stored securely in Railway
- [ ] Admin wallet has limited APES (not treasury)
- [ ] Access control verified for admin wallet
- [ ] No private keys in code or logs
- [ ] Transaction signatures logged for audit trail