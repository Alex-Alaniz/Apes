# PRIMAPE Engage-to-Earn Feature Design

## Overview
The Engage-to-Earn system rewards users with APES tokens for actively participating in the prediction market platform. Users earn points through various engagement activities, which can be converted to APES airdrops.

## Engagement Activities & Point Values

### 1. **Prediction Activities**
- **Place a Prediction**: 10 points per prediction
- **Win a Prediction**: 50 points bonus
- **First Prediction of the Day**: 20 points bonus
- **Prediction Streak** (daily): 
  - 3 days: 50 points
  - 7 days: 150 points
  - 30 days: 1000 points

### 2. **Social Engagement**
- **Share Market on Twitter**: 25 points (once per market)
- **Comment on Market**: 5 points (max 3 per day)
- **Helpful Comment** (upvoted 5+ times): 20 points bonus
- **Follow Another User**: 10 points
- **Get Followed**: 15 points

### 3. **Market Creation & Curation**
- **Create Market** (Admin): 100 points
- **Report Resolved Market**: 30 points (if accurate)
- **Add Market to Watchlist**: 5 points

### 4. **Profile & Community**
- **Complete Profile**: 50 points (one-time)
- **Connect Twitter**: 25 points (one-time)
- **Daily Login**: 5 points
- **Refer New User**: 100 points (when they make first prediction)

## Technical Implementation

### Database Schema

```sql
-- Add to existing schema
CREATE TABLE IF NOT EXISTS engagement_points (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    activity_type VARCHAR(50) NOT NULL,
    points_earned INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS point_balances (
    user_address VARCHAR(44) PRIMARY KEY REFERENCES users(wallet_address),
    total_points INTEGER DEFAULT 0,
    claimed_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    last_claim_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS airdrop_claims (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    points_redeemed INTEGER NOT NULL,
    apes_amount DECIMAL(20, 6) NOT NULL,
    transaction_signature VARCHAR(88),
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Indexes
CREATE INDEX idx_engagement_user ON engagement_points(user_address);
CREATE INDEX idx_engagement_type ON engagement_points(activity_type);
CREATE INDEX idx_engagement_date ON engagement_points(created_at);
```

### API Endpoints

#### Track Engagement
```javascript
POST /api/engagement/track
{
  "activity_type": "PLACE_PREDICTION",
  "metadata": {
    "market_address": "...",
    "amount": 100
  }
}
```

#### Get Points Balance
```javascript
GET /api/engagement/balance/:walletAddress
Response: {
  "total_points": 1250,
  "available_points": 750,
  "claimed_points": 500,
  "next_milestone": 1500,
  "rank": "Bronze"
}
```

#### Claim Airdrop
```javascript
POST /api/engagement/claim
{
  "points_to_redeem": 500
}
```

### Frontend Components

#### 1. **Points Display Widget**
- Shows in navbar next to wallet
- Displays current points balance
- Click to see breakdown

#### 2. **Engagement Dashboard**
- `/engage-to-earn` page
- Shows all activities and points
- Progress bars for streaks
- Claim APES button

#### 3. **Activity Feed**
- Recent engagement activities
- Points earned per activity
- Leaderboard integration

### Conversion Rate
- **Initial Rate**: 100 points = 10 APES
- **Bonus Tiers**:
  - Bronze (0-999 points): 1x multiplier
  - Silver (1000-4999): 1.1x multiplier
  - Gold (5000-9999): 1.25x multiplier
  - Platinum (10000+): 1.5x multiplier

### Anti-Abuse Measures
1. **Rate Limiting**: Max activities per day
2. **Minimum Thresholds**: Min 500 points to claim
3. **Cooldown Periods**: 24hr between claims
4. **Verification**: Some activities require verification
5. **IP Tracking**: Prevent multi-account abuse

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database tables and migrations
- [ ] Points tracking service
- [ ] Basic API endpoints
- [ ] Points display in UI

### Phase 2: Activity Tracking (Week 1-2)
- [ ] Prediction activity tracking
- [ ] Login/streak tracking
- [ ] Social engagement hooks
- [ ] Testing and validation

### Phase 3: Rewards System (Week 2)
- [ ] APES distribution smart contract
- [ ] Claim functionality
- [ ] Transaction verification
- [ ] UI for claiming

### Phase 4: Gamification (Week 3)
- [ ] Leaderboards
- [ ] Achievements/Badges
- [ ] Referral system
- [ ] Analytics dashboard

## Smart Contract Integration

### Airdrop Contract Functions
```rust
pub fn initialize_airdrop_pool(
    ctx: Context<InitializePool>,
    total_allocation: u64,
) -> Result<()>

pub fn claim_airdrop(
    ctx: Context<ClaimAirdrop>,
    points_redeemed: u64,
) -> Result<()>

pub fn update_conversion_rate(
    ctx: Context<UpdateRate>,
    new_rate: u64,
) -> Result<()>
```

## Security Considerations
1. **Sybil Resistance**: Require minimum account age
2. **Bot Detection**: Monitor unusual patterns
3. **Rate Limiting**: Implement at API level
4. **Wallet Verification**: Ensure real wallets
5. **Admin Controls**: Pause/adjust system

## Metrics to Track
- Daily Active Users (DAU)
- Average points per user
- Conversion rate (points to claims)
- Most popular activities
- Retention improvement
- APES distribution rate

## Future Enhancements
1. **NFT Rewards**: Special NFTs for milestones
2. **Seasons**: Quarterly resets with prizes
3. **Team Competitions**: Group challenges
4. **Merchant Integration**: Spend APES on platform
5. **Governance Rights**: Points = voting power

---

## Quick Start Implementation

### 1. Add Engagement Service
```javascript
// src/backend/services/engagementService.js
class EngagementService {
  async trackActivity(userAddress, activityType, metadata) {
    // Implementation
  }
  
  async getBalance(userAddress) {
    // Implementation
  }
  
  async claimAirdrop(userAddress, points) {
    // Implementation
  }
}
```

### 2. Add UI Components
```jsx
// src/frontend/components/PointsWidget.jsx
// src/frontend/pages/EngageToEarnPage.jsx
```

### 3. Integrate with Existing Features
- Hook into prediction placement
- Add to user profile updates
- Track market interactions

This design provides a comprehensive engage-to-earn system that incentivizes platform usage while maintaining fairness and preventing abuse. 