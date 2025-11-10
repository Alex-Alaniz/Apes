# PRIMAPE Engage-to-Earn V2: Onchain Points & Twitter Integration

## Overview
Enhanced engage-to-earn system where points are SPL tokens on Solana, distributed for platform and Twitter/X engagement, and redeemable for $APES through Believe App API.

## Architecture

### 1. Onchain Points Token (SPL)
- **Token Name**: PRIMAPE Points (PMP)
- **Symbol**: PMP
- **Decimals**: 0 (whole points only)
- **Supply**: Mintable by platform authority
- **Features**:
  - Non-transferable between users (soulbound)
  - Only redeemable through official contract
  - Burnable when redeemed for APES

### 2. Twitter/X Integration Requirements
- **OAuth 2.0**: Link Twitter accounts
- **API v2**: Validate engagements
- **Required Permissions**:
  - Read user profile
  - Read tweets
  - Read likes/retweets
  - Read following status

### 3. Smart Contracts

#### Points Token Contract
```rust
pub struct PointsToken {
    pub mint_authority: Pubkey,
    pub redemption_authority: Pubkey,
    pub freeze_authority: Pubkey,
    pub total_minted: u64,
    pub total_redeemed: u64,
}

// Instructions
- initialize_points_token
- mint_points_to_user
- freeze_transfers (make soulbound)
- burn_for_redemption
```

#### Redemption Contract
```rust
pub struct RedemptionPool {
    pub authority: Pubkey,
    pub points_token_mint: Pubkey,
    pub believe_app_config: BelieveAppConfig,
    pub min_redemption: u64, // 500 points
    pub cooldown_period: i64, // 24 hours
}

// Instructions
- initialize_redemption_pool
- redeem_points_for_apes
- update_believe_config
```

## Enhanced Point System

### Platform Activities
| Activity | Points | Requirements |
|----------|--------|--------------|
| Link Twitter Account | 100 | One-time, verified |
| Follow @PrimapeApp | 50 | Verified via API |
| Place Prediction | 10 | Per prediction |
| Win Prediction | 50 | When resolved |
| First Daily Prediction | 20 | Daily bonus |
| Complete Profile | 50 | One-time |
| Daily Login | 5 | With Twitter linked |

### Twitter/X Engagement
| Activity | Points | Limits |
|----------|--------|--------|
| Like @PrimapeApp post | 5 | Per post, once |
| Repost @PrimapeApp | 10 | Per post, once |
| Comment on @PrimapeApp | 15 | Quality comments only |
| Twitter Space attendance | 100 | Verified attendance |
| Thread engagement | 25 | Full thread interaction |

### Bonus Multipliers
- **Follower Bonus**: 1.1x if 1000+ followers
- **Engagement Rate**: Up to 1.5x for high-quality engagement
- **Streak Bonus**: Maintained from V1

## Implementation Plan

### Phase 1: Twitter Integration (Week 1)
1. **OAuth Setup**
   - Twitter OAuth 2.0 integration
   - Account linking UI
   - Database schema for Twitter data

2. **API Integration**
   - Twitter API v2 client
   - Rate limiting and caching
   - Engagement validation service

3. **Updated Database**
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN twitter_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN twitter_username VARCHAR(50);
ALTER TABLE users ADD COLUMN twitter_linked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN twitter_followers INTEGER DEFAULT 0;

-- Twitter engagement tracking
CREATE TABLE twitter_engagements (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    tweet_id VARCHAR(50) NOT NULL,
    engagement_type VARCHAR(20), -- 'like', 'repost', 'comment'
    points_awarded INTEGER,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, tweet_id, engagement_type)
);

-- PrimapeApp posts cache
CREATE TABLE primape_tweets (
    tweet_id VARCHAR(50) PRIMARY KEY,
    content TEXT,
    media_urls JSONB,
    created_at TIMESTAMP,
    engagement_stats JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Phase 2: Onchain Points (Week 1-2)
1. **SPL Token Creation**
   - Deploy PMP token
   - Set up mint authority
   - Implement transfer restrictions

2. **Points Distribution Contract**
   - Automated minting based on activities
   - Batch minting for efficiency
   - Event emission for tracking

3. **Integration Updates**
   - Update engagement service to mint tokens
   - Add wallet interactions for points
   - Show onchain balance in UI

### Phase 3: Redemption System (Week 2)
1. **Redemption Contract**
   - Believe App API integration
   - Points burning mechanism
   - Cooldown enforcement

2. **Frontend Updates**
   - Redemption UI
   - Transaction status tracking
   - History display

### Phase 4: Twitter Engagement Features (Week 2-3)
1. **Post Fetching**
   - Cron job for @PrimapeApp posts
   - Real-time engagement opportunities
   - Push notifications (optional)

2. **Engagement Validation**
   - Like verification
   - Repost detection
   - Comment quality checks

3. **UI Components**
   - Twitter feed integration
   - One-click engagement
   - Progress tracking

## API Endpoints

### Twitter Integration
```javascript
POST /api/auth/twitter/link
GET /api/auth/twitter/callback
GET /api/twitter/verify-follow
POST /api/twitter/validate-engagement
GET /api/twitter/primape-posts
```

### Points Management
```javascript
GET /api/points/onchain-balance/:wallet
POST /api/points/sync-onchain
POST /api/points/redeem
GET /api/points/redemption-history
```

## Security Considerations

### Twitter API
- Rate limiting per user
- Webhook validation
- Anti-bot measures
- Engagement quality filters

### Onchain Security
- Multi-sig for mint authority
- Timelock for config changes
- Pause mechanism for emergencies
- Audit trail for all mints

### Believe App Integration
- Secure API key management
- Request signing
- Idempotency checks
- Error handling and retries

## User Flow

### Initial Setup
1. Connect Solana wallet
2. Link Twitter account via OAuth
3. Auto-follow @PrimapeApp (with permission)
4. Receive onboarding bonus points

### Daily Engagement
1. Check @PrimapeApp latest posts
2. Engage (like, repost, comment)
3. Points minted to wallet automatically
4. View balance in wallet & app

### Redemption
1. Accumulate 500+ points
2. Click "Redeem for APES"
3. Sign transaction to burn points
4. Believe App API processes distribution
5. Receive APES in wallet

## Technical Stack

### Backend
- **Twitter API**: OAuth 2.0, API v2
- **Webhooks**: Account Activity API
- **Queue**: Bull/Redis for processing
- **Cache**: Redis for API responses

### Smart Contracts
- **Framework**: Anchor
- **Token Program**: SPL Token 2022
- **Features**: Transfer hooks, metadata

### Frontend
- **Auth**: Twitter OAuth flow
- **Real-time**: WebSocket for updates
- **Wallet**: Points balance display

## Monitoring & Analytics

### Metrics to Track
- Twitter link conversion rate
- Engagement rates by type
- Points minted vs redeemed
- API rate limit usage
- Redemption patterns

### Dashboards
- Admin: Total points economy
- User: Personal engagement stats
- Public: Leaderboard with Twitter handles

## Future Enhancements
1. **Twitter Spaces Integration**
   - Live attendance tracking
   - Speaker bonuses
   - Q&A participation

2. **Content Creation Rewards**
   - User-generated content
   - Meme competitions
   - Thread rewards

3. **Influencer Program**
   - Tiered rewards
   - Referral bonuses
   - Ambassador NFTs

4. **Cross-Platform**
   - Discord integration
   - Telegram engagement
   - YouTube participation

---

This enhanced system creates a powerful flywheel:
1. Users engage on Twitter → Earn onchain points
2. Points accumulate → Visible in wallet
3. Redeem for APES → Real value
4. Share success → Attract more users 