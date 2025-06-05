# APES Mainnet Deployment Fix Guide

## Current Issues Identified

### 1. Railway Database Connection Problems
- Error: `connect ECONNREFUSED ::1:6543` and `127.0.0.1:6543`
- Railway deployment shows "Limited Access - Hobby deployments have been temporarily paused"
- Backend can't connect to Supabase database properly

### 2. Old Devnet Data Serving
- Backend serving 7 old devnet markets from database
- Frontend receiving cached devnet data instead of live mainnet data
- No live blockchain data syncing implemented

### 3. Frontend Configuration
- VITE_API_URL pointing to Railway backend that has connection issues
- Frontend falling back to old cached data when backend fails

## Solutions Implemented

### 🧹 Database Cleanup Script
Created `backend/clear-mainnet-setup.js` to clear old devnet data:

```bash
cd backend
node clear-mainnet-setup.js
```

This script:
- ✅ Clears all old devnet markets from database
- ✅ Clears prediction history, cache, comments
- ✅ Provides clean slate for mainnet deployment
- ✅ Logs progress and final counts

### 🔧 Backend API Improvements
Updated `backend/routes/markets.js` to:
- ✅ Handle empty database gracefully (return `[]` instead of error)
- ✅ Log helpful messages when no markets found
- ✅ Allow frontend to fallback to live blockchain data

### 📱 Frontend Fallback Strategy
The frontend `marketService.js` already has good fallback logic:
1. Try backend API first
2. If backend fails/empty → Show "No markets available" 
3. Frontend can potentially fetch live blockchain data directly

## Deployment Steps

### Step 1: Fix Railway Database Connection

```bash
# 1. Check Railway status
railway status

# 2. Check if database service is running
railway ps

# 3. If database connection fails, try upgrading Railway plan
# The "Limited Access" message suggests hobby plan limitations
```

**Option A: Upgrade Railway Plan**
- Railway hobby plans may have been paused
- Consider upgrading to paid plan for reliable database access

**Option B: Alternative Database**
- Switch to direct Supabase connection
- Update environment variables to use Supabase direct URLs

### Step 2: Deploy Database Cleanup

```bash
# 1. Deploy cleanup script to Railway
railway run node clear-mainnet-setup.js

# 2. Verify database is clean
railway run node -e "
const pool = require('./database/db.js');
pool.query('SELECT COUNT(*) FROM markets').then(r => {
  console.log('Markets:', r.rows[0].count);
  pool.end();
});
"
```

### Step 3: Deploy Updated Backend Code

```bash
# 1. Deploy updated backend with empty markets handling
railway up

# 2. Test API endpoint
curl https://apes-production.up.railway.app/api/markets
# Should return: []
```

### Step 4: Update Frontend Environment

```bash
# Update Vercel environment variables if needed
# VITE_API_URL should point to working backend
# Or implement direct blockchain data fetching
```

## Alternative Solutions

### Option 1: Direct Blockchain Data Fetching
If Railway continues to have issues, implement direct blockchain data fetching in frontend:

```javascript
// In marketService.js
async fetchMarketsWithStats() {
  try {
    // Try backend first
    const backendMarkets = await this.fetchFromBackend();
    if (backendMarkets.length > 0) return backendMarkets;
    
    // Fallback: Fetch directly from blockchain
    return await this.fetchLiveBlockchainMarkets();
  } catch (error) {
    console.log('Fetching live blockchain data...');
    return await this.fetchLiveBlockchainMarkets();
  }
}

async fetchLiveBlockchainMarkets() {
  // Implementation to fetch live markets from Solana program
  // This would query the mainnet program directly
  if (!this.program) return [];
  
  try {
    const programAccounts = await this.connection.getProgramAccounts(
      this.programId,
      {
        filters: [/* market account filters */]
      }
    );
    
    return programAccounts.map(account => {
      // Transform blockchain data to frontend format
      return this.transformBlockchainMarket(account);
    });
  } catch (error) {
    console.error('Error fetching live blockchain markets:', error);
    return [];
  }
}
```

### Option 2: Serverless Backend
If Railway is unreliable, consider:
- Vercel API Routes
- Netlify Functions
- Direct Supabase API calls from frontend

## Testing the Fix

### 1. Test Backend
```bash
# Test markets endpoint
curl https://apes-production.up.railway.app/api/markets

# Expected response: []
# With logs showing: "No active markets found in database"
```

### 2. Test Frontend
1. Open browser dev tools
2. Go to Markets page
3. Should see: "No markets available" or empty state
4. Console should show: "Successfully fetched 0 markets from backend API"

### 3. Test Live Blockchain Connection
The frontend already shows correct mainnet configuration:
```
MarketService: Loading with config {
  programId: 'APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS',
  tokenMint: '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts',
  treasuryAddress: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z'
}
```

## Next Steps After Fix

1. **Create Real Markets**: Use the admin panel to create actual mainnet markets
2. **Live Data Sync**: Implement periodic blockchain syncing to database
3. **Market Creation UI**: Add frontend interface for creating new markets
4. **Railway Monitoring**: Set up health checks and alerts

## Rollback Plan

If issues persist:
```bash
# 1. Revert to direct frontend blockchain fetching
# 2. Disable backend API calls temporarily
# 3. Use local mock data if needed
```

## Status Check Commands

```bash
# Check Railway deployment
railway logs --tail

# Check database connection
railway run node -e "require('./database/db.js').query('SELECT NOW()').then(console.log)"

# Check markets count
railway run node -e "require('./database/db.js').query('SELECT COUNT(*) FROM markets').then(r => console.log('Markets:', r.rows[0].count))"
``` 