# 🚀 Tournament Market Deployment - Quick Start Guide

## ⏱️ Time Critical: First match in 24 hours!

### 🔴 IMMEDIATE ACTIONS (30 minutes)

#### 1. Run Database Migration
```bash
# SSH into your backend or run locally with production DB
node setup-tournament-deployment.js
```

#### 2. Add Environment Variables to Railway/Backend
```env
# Add to Railway environment variables
DEPLOYER_PRIVATE_KEY=<base64_encoded_private_key>
AUTHORIZED_MARKET_CREATORS=wallet1,wallet2,wallet3
```

#### 3. Add Your Team's Wallets
```bash
# Quick curl commands to add team members
curl -X POST https://apes-production.up.railway.app/api/market-creators \
  -H "X-Wallet-Address: YOUR_ADMIN_WALLET" \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "TEAM_MEMBER_WALLET_1"}'

# Repeat for each team member
```

### 📊 Deployment Process

#### Step 1: Open Admin Panel
Navigate to: https://apes.primape.app/admin/tournament

#### Step 2: Select Markets
1. Filter by Group (start with Group A)
2. Click "Select All" or choose specific matches
3. Review the preview to ensure correct options

#### Step 3: Deploy Markets
1. Click "Deploy Markets"
2. System will check for duplicates automatically
3. Confirm deployment
4. Monitor deployment results

### ⚠️ Critical Features Enabled

#### 1. **Duplicate Prevention**
- System automatically checks for existing markets
- Shows warning if duplicates detected
- Prevents accidental double deployment

#### 2. **Timing Control**
- Markets close 5 minutes BEFORE match starts
- Automatic timezone conversion:
  - ET (Eastern): UTC-5
  - PT (Pacific): UTC-8
- Markets auto-transition to "Pending Resolution"

#### 3. **Team Authorization**
- Team members can deploy using their own wallets
- Backend uses deployer key for on-chain transactions
- Full audit trail of who deployed what

### 🎯 First Day Deployment Schedule

| Time (ET) | Action | Markets |
|-----------|--------|---------|
| 12:00 PM | Deploy Group A | 6 markets |
| 12:30 PM | Deploy Group B | 6 markets |
| 1:00 PM | Deploy Groups C & D | 12 markets |
| 1:30 PM | Deploy Groups E & F | 12 markets |
| 2:00 PM | Deploy Groups G & H | 12 markets |
| 3:00 PM | Final check | Verify all 48 group matches |
| 4:00 PM | Monitor first match | Al Ahly vs Inter Miami |

### 🔍 Monitoring & Verification

#### Check Deployed Markets
```bash
# View all FIFA Club World Cup markets
curl https://apes-production.up.railway.app/api/markets?tournament_id=club-world-cup-2025

# Check for duplicates
curl "https://apes-production.up.railway.app/api/markets/check-duplicate?question=Al%20Ahly%20-%20Inter%20Miami&tournament_id=club-world-cup-2025"
```

#### Monitor Market End Times
```bash
# Markets ending in next 24 hours
curl https://apes-production.up.railway.app/api/admin/upcoming-market-ends
```

### 🚨 Emergency Procedures

#### If Duplicate Created:
1. Don't panic - blockchain prevents double spending
2. Update database: Mark duplicate as "Cancelled"
3. Users will see only one active market

#### If Wrong Time Set:
1. Update immediately in database
2. Notify users if significant change
3. Contact admin for on-chain update if needed

#### If Deployment Fails:
1. Check wallet SOL balance
2. Verify network connectivity
3. Try individual market deployment
4. Contact tech support with error details

### 📱 Team Communication

1. **Before Deployment**: "Starting Group X deployment"
2. **After Success**: "Group X deployed: Y markets created"
3. **If Issues**: "@admin - Issue with market Z, please check"

### ✅ Success Checklist

- [ ] All 48 group stage markets deployed
- [ ] No duplicate markets
- [ ] All end times correct (5 min before match)
- [ ] Team logos displaying correctly
- [ ] First match market has activity

### 🎉 Go Live!

Remember:
- Group stage = 3 options (Home, Draw, Away)
- Knockout stage = 2 options (Home, Away)
- Deploy at least 4 hours before match
- Monitor the first match closely

**Good luck! The future of prediction markets starts NOW! 🚀** 