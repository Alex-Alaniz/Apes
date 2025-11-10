# Tournament Market Deployment System Audit & Implementation Guide

## 🔍 System Overview

The tournament market deployment system allows authorized users to deploy prediction markets for FIFA Club World Cup 2025 matches (first game starts in 24 hours). This document outlines the security measures, deployment flow, and critical features.

## 🏗️ Current Architecture

### Frontend (Admin Panel)
- **Location**: `/admin/tournament`
- **Features**:
  - Checkbox selection for multiple markets
  - Bulk deployment capability
  - Preview functionality
  - Asset management (banners, team logos)

### Backend (API)
- **Endpoint**: `POST /api/markets`
- **Database**: PostgreSQL with Supabase
- **Smart Contract**: Solana-based prediction market contract

## 🛡️ Security & Access Control

### Current Limitation
- Only the deployer wallet can create markets on-chain
- This creates a bottleneck for multi-admin teams

### Proposed Solutions

#### Option 1: API-Based Deployer Key (Recommended) ✅
```
Frontend (Admin Wallets) → Backend API → Deployer Private Key → Blockchain
```

**Advantages**:
- Team members use their own wallets for authentication
- Deployer key stays secure on server
- Full audit trail of who created which market
- Can be implemented immediately

**Implementation**:
1. Store deployer private key in environment variables
2. Add wallet whitelist for authorized team members
3. Backend signs and submits transactions on behalf of admins

#### Option 2: On-Chain Market Creator Role
```
Smart Contract Update → Add "Market Creator" role → Multiple authorized wallets
```

**Advantages**:
- True decentralization
- No single point of failure

**Disadvantages**:
- Requires contract upgrade
- Takes more time to implement
- Gas costs for role management

## 🚫 Duplicate Prevention System

### Problem
Markets could be accidentally deployed twice for the same match.

### Solution Implementation

```javascript
// In backend/routes/markets.js

// Add duplicate check before market creation
router.post('/', async (req, res) => {
  const { question, tournament_id, options } = req.body;
  
  // Check for existing market with same question and tournament
  const duplicateCheck = await db.query(`
    SELECT market_address, question, created_at 
    FROM markets 
    WHERE question = $1 
      AND category = 'Sports'
      AND tournament_id = $2
      AND status != 'Resolved'
    LIMIT 1
  `, [question, tournament_id]);
  
  if (duplicateCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Market already exists',
      existing_market: duplicateCheck.rows[0],
      message: `A market for "${question}" already exists in this tournament`
    });
  }
  
  // Continue with market creation...
});
```

### Frontend Validation

```javascript
// In AdminTournamentPage.jsx

// Before deployment, check for existing markets
const checkForDuplicates = async (selectedMatches) => {
  const duplicates = [];
  
  for (const matchId of selectedMatches) {
    const match = CLUB_WC_MATCHES.find(m => m.match === matchId);
    const question = `${match.home} - ${match.away}`;
    
    const response = await fetch(`/api/markets/check-duplicate?question=${encodeURIComponent(question)}&tournament_id=${TOURNAMENT_ID}`);
    const data = await response.json();
    
    if (data.exists) {
      duplicates.push({
        matchId,
        question,
        existingMarket: data.market_address
      });
    }
  }
  
  return duplicates;
};
```

## ⏰ Market Timing & Resolution Control

### Critical Requirements
1. Markets must stop accepting bets when the actual match starts
2. End time must be accurate to prevent betting during live games
3. Markets should auto-transition to "Pending Resolution" status

### Implementation

```javascript
// Time zone conversion utility
const convertToUTC = (date, time, timezone) => {
  const timezoneOffsets = {
    'ET': -5,  // Eastern Time
    'PT': -8,  // Pacific Time
    'CT': -6,  // Central Time
    'MT': -7   // Mountain Time
  };
  
  // Add buffer time (5 minutes before match start)
  const bufferMinutes = 5;
  
  const matchDateTime = new Date(`${date}T${time}:00`);
  const offsetHours = timezoneOffsets[timezone] || 0;
  
  // Adjust for timezone and buffer
  matchDateTime.setHours(matchDateTime.getHours() - offsetHours);
  matchDateTime.setMinutes(matchDateTime.getMinutes() - bufferMinutes);
  
  return matchDateTime.toISOString();
};

// In market creation
const marketData = {
  question: `${match.home} - ${match.away}`,
  endTime: convertToUTC(match.date, match.time, match.timezone),
  // ... other fields
};
```

### Auto-Resolution Monitoring

```javascript
// Backend service to monitor market end times
const monitorMarketEndTimes = async () => {
  const now = new Date();
  
  // Find markets that should have ended
  const expiredMarkets = await db.query(`
    SELECT market_address, question, resolution_date 
    FROM markets 
    WHERE status = 'Active' 
      AND resolution_date <= $1
  `, [now]);
  
  for (const market of expiredMarkets.rows) {
    // Update market status to pending resolution
    await db.query(`
      UPDATE markets 
      SET status = 'Pending Resolution', 
          updated_at = NOW() 
      WHERE market_address = $1
    `, [market.market_address]);
    
    console.log(`⏰ Market ended and pending resolution: ${market.question}`);
  }
};

// Run every minute
setInterval(monitorMarketEndTimes, 60000);
```

## 👥 Team Authorization System

### Implementation Steps

1. **Create authorized wallets table**:
```sql
CREATE TABLE authorized_market_creators (
  wallet_address VARCHAR(44) PRIMARY KEY,
  added_by VARCHAR(44) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"can_create_markets": true}'
);

-- Add initial team members
INSERT INTO authorized_market_creators (wallet_address, added_by) VALUES
  ('WALLET_ADDRESS_1', 'ADMIN_WALLET'),
  ('WALLET_ADDRESS_2', 'ADMIN_WALLET'),
  ('WALLET_ADDRESS_3', 'ADMIN_WALLET');
```

2. **Backend middleware**:
```javascript
// middleware/authorizeMarketCreator.js
const authorizeMarketCreator = async (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'Wallet address required' });
  }
  
  // Check if wallet is authorized
  const result = await db.query(`
    SELECT * FROM authorized_market_creators 
    WHERE wallet_address = $1 AND is_active = true
  `, [walletAddress]);
  
  if (result.rows.length === 0) {
    return res.status(403).json({ 
      error: 'Not authorized to create markets',
      wallet: walletAddress 
    });
  }
  
  req.authorizedCreator = result.rows[0];
  next();
};
```

3. **Market creation with deployer key**:
```javascript
// backend/services/marketDeploymentService.js
const { Connection, Keypair, Transaction } = require('@solana/web3.js');

const deployMarketOnBehalf = async (marketData, creatorWallet) => {
  // Load deployer keypair from environment
  const deployerKeypair = Keypair.fromSecretKey(
    Buffer.from(process.env.DEPLOYER_PRIVATE_KEY, 'base64')
  );
  
  // Create market transaction
  const transaction = await createMarketTransaction(marketData);
  
  // Sign with deployer key
  transaction.sign(deployerKeypair);
  
  // Send transaction
  const signature = await connection.sendTransaction(transaction);
  
  // Log for audit trail
  await db.query(`
    INSERT INTO market_deployment_log (
      market_address,
      deployed_by_wallet,
      deployed_with_key,
      transaction_signature,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())
  `, [
    marketData.address,
    creatorWallet,
    deployerKeypair.publicKey.toString(),
    signature
  ]);
  
  return { success: true, signature };
};
```

## 🚨 Pre-Launch Checklist (24 Hours)

### Immediate Actions Required:

1. **Environment Setup** (30 minutes)
   - [ ] Add `DEPLOYER_PRIVATE_KEY` to backend environment variables
   - [ ] Deploy authorized wallets table to database
   - [ ] Add team member wallets to authorized list

2. **Code Deployment** (1 hour)
   - [ ] Deploy duplicate prevention logic
   - [ ] Deploy market timing controls
   - [ ] Deploy team authorization middleware
   - [ ] Test with a dummy market

3. **Team Training** (30 minutes)
   - [ ] Show team how to use bulk deployment
   - [ ] Explain duplicate warnings
   - [ ] Review timezone conversions

4. **Market Preparation** (2 hours)
   - [ ] Upload all team logos
   - [ ] Set tournament banners
   - [ ] Configure match-specific banners for key games

5. **Monitoring Setup** (30 minutes)
   - [ ] Set up alerts for failed deployments
   - [ ] Monitor for duplicate attempts
   - [ ] Watch for timing issues

## 📊 Deployment Strategy

### Phase 1: Group Stage Markets (First 48 matches)
- Deploy in batches by group (6 matches per group)
- Start with Group A matches
- Include Draw option for all group stage matches

### Phase 2: Knockout Markets (15 matches)
- Deploy as group stage concludes
- Only 2 options (no Draw)
- Higher stakes, more attention

### Critical First Matches (June 14, 2025):
1. Match #1: Al Ahly vs Inter Miami (20:00 ET) - HIGH PROFILE
2. Deploy at least 4 hours before (16:00 ET)
3. Test market flow with small bet

## 🔧 Emergency Procedures

### If Duplicate Market Created:
1. Mark duplicate as "Cancelled" in database
2. Redirect users to correct market
3. No on-chain action needed if no bets placed

### If Wrong End Time Set:
1. Update in database immediately
2. If on-chain, may need manual intervention
3. Notify users of correct end time

### If Deployment Fails:
1. Check deployer wallet SOL balance
2. Verify network connection
3. Use backup RPC endpoint
4. Manual deployment via CLI if needed

## 📈 Success Metrics

- **Zero duplicate markets**
- **All markets close before match start**
- **No betting during live games**
- **Smooth team collaboration**
- **Quick deployment (< 5 min per batch)**

## 🎯 Go-Live Timeline

**T-24 hours**: Deploy code, setup environment
**T-20 hours**: Test deployment with dummy market
**T-16 hours**: Train team members
**T-12 hours**: Begin deploying Group A & B markets
**T-8 hours**: Deploy Groups C, D, E, F
**T-4 hours**: Deploy Groups G, H
**T-1 hour**: Final checks, monitor first match market
**T-0**: First match begins! 🚀 