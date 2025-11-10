# PRIMAPE Engage-to-Earn Implementation

## Overview
The Engage-to-Earn system is now implemented and ready for QA testing. Users earn points for various activities on the platform, which can be converted to APES tokens.

## Current Implementation Status

### ✅ Phase 1 Complete (Basic Infrastructure)

#### Backend Components:
- **Database Tables**: Created via migration `005_create_engagement_tables.sql`
  - `engagement_points` - Tracks all point-earning activities
  - `point_balances` - Maintains user point balances
  - `airdrop_claims` - Records APES token claims
  
- **Engagement Service** (`src/backend/services/engagementService.js`)
  - Track activities and award points
  - Calculate user tiers and multipliers
  - Check claim eligibility
  - Handle streak bonuses
  
- **API Endpoints** (`src/backend/routes/engagement.js`)
  - `POST /api/engagement/track` - Track activities
  - `GET /api/engagement/balance/:wallet` - Get user balance
  - `GET /api/engagement/leaderboard` - Engagement leaderboard
  - `GET /api/engagement/can-claim` - Check claim eligibility
  - `GET /api/engagement/calculate-apes/:points` - Calculate APES conversion

#### Frontend Components:
- **Points Widget** (`src/frontend/src/components/PointsWidget.jsx`)
  - Displays in navbar next to wallet
  - Shows points, tier, and progress
  - Tooltip with detailed breakdown
  
- **Engage-to-Earn Page** (`src/frontend/src/pages/EngageToEarnPage.jsx`)
  - Full dashboard for engagement system
  - Shows earning opportunities
  - Displays recent activities
  - Claim interface (UI only for now)

#### Integration Points:
- **Prediction Tracking**: Automatically tracks when users place predictions
- **Points Award**: 10 points per prediction + 20 bonus for first daily
- **Database Trigger**: Auto-updates balances when points are earned

## Point Values

| Activity | Points | Notes |
|----------|--------|-------|
| Place Prediction | 10 | Per prediction |
| Win Prediction | 50 | When market resolves |
| First Daily Prediction | 20 | Bonus once per day |
| Complete Profile | 50 | One-time |
| Daily Login | 5 | Once per day |
| Create Market | 100 | Admin only |

## Tier System

| Tier | Points Range | Multiplier | Badge |
|------|-------------|------------|-------|
| Bronze | 0-999 | 1.0x | 🥉 |
| Silver | 1,000-4,999 | 1.1x | 🥈 |
| Gold | 5,000-9,999 | 1.25x | 🥇 |
| Platinum | 10,000+ | 1.5x | 💎 |

## Conversion Rate
- Base: 100 points = 10 APES
- With multipliers: Higher tiers earn more APES per point

## Testing the System

### 1. View Points Widget
- Connect wallet
- Points widget appears in navbar
- Shows current points and tier

### 2. Earn Points
- Place a prediction on any market
- Check points increased by 10 (or 30 if first of day)
- View activity in `/engage-to-earn` page

### 3. Check Progress
- Navigate to `/engage-to-earn`
- See detailed stats and progress
- View recent activities

### 4. Database Verification
```sql
-- Check user's points
SELECT * FROM point_balances WHERE user_address = 'YOUR_WALLET';

-- View recent activities
SELECT * FROM engagement_points 
WHERE user_address = 'YOUR_WALLET' 
ORDER BY created_at DESC;
```

## Next Implementation Phases

### Phase 2: Activity Expansion
- [ ] Track profile completion
- [ ] Implement daily login tracking
- [ ] Add social sharing points
- [ ] Market resolution rewards

### Phase 3: Claim System
- [ ] APES distribution contract
- [ ] Actual claim functionality
- [ ] Transaction verification
- [ ] Claim history

### Phase 4: Advanced Features
- [ ] Achievements/Badges
- [ ] Referral system
- [ ] Seasonal campaigns
- [ ] Special events

## Known Limitations (Current)
1. **Claim Button**: UI only - actual APES distribution not implemented
2. **Limited Activities**: Only predictions tracked currently
3. **No Social Features**: Sharing, following not tracked yet
4. **Manual Cleanup**: Points persist through contract redeployments

## Troubleshooting

### Points Not Showing
1. Ensure wallet is connected
2. Check browser console for errors
3. Verify backend is running on port 5001

### Points Not Increasing
1. Confirm prediction transaction succeeded
2. Check network requests in browser
3. Verify `/api/predictions/place` returns 200

### Database Issues
```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt engagement_points"

# View recent errors
tail -f backend.log | grep engagement
```

## Security Notes
- Points are server-side only (cannot be manipulated client-side)
- All activities verified before awarding points
- Rate limiting prevents spam
- Minimum thresholds prevent micro-claims

---

The engage-to-earn system is ready for QA testing alongside the main platform features! 