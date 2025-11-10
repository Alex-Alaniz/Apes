# PumpFun Livestream Prediction Markets

## Concept: actions.fun Clone for APES

**Formula**: Polymarket + pump.fun = actions.fun

## Core Features

### 1. Livestream Integration
- Monitor PumpFun livestreams in real-time
- Each stream has an associated SPL token (e.g., `J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump`)
- Admin-controlled whitelist of featured streams
- Embedded player or overlay on pump.fun/live

### 2. Prediction Market Mechanics
- **Duration**: 5-minute prediction windows
- **Options**: Binary YES/NO outcomes
- **Stakes**: SOL-based betting
- **Resolution**: Winners share losing pool
- **Fees**: 
  - 0.5% to creator
  - 0.5% to streamer
  - Platform fee (configurable)

### 3. Creator Incentives
- Streamers earn from market volume
- Token rewards for correct predictions
- Engagement-based bonuses
- Referral system for stream promotion

## Technical Architecture

### Frontend Changes Needed

```javascript
// New Components
├── components/
│   ├── LivestreamCard.jsx         // Display active streams
│   ├── StreamPredictionModal.jsx  // Create/bet on predictions
│   ├── StreamEmbed.jsx           // Embed pump.fun stream
│   ├── QuickBetInterface.jsx     // 5-min rapid betting UI
│   └── StreamLeaderboard.jsx     // Stream-specific rankings

// New Pages
├── pages/
│   ├── LivestreamsPage.jsx       // Browse all streams
│   ├── StreamDetailPage.jsx      // Individual stream + markets
│   └── StreamAdminPage.jsx       // Control featured streams
```

### Backend Architecture

```javascript
// New Services
├── services/
│   ├── pumpfunStreamService.js   // Monitor pump.fun streams
│   ├── streamMarketService.js    // Create 5-min markets
│   ├── streamTokenService.js     // Track SPL tokens
│   └── streamRewardService.js    // Calculate rewards

// New Routes
├── routes/
│   ├── livestreams.js            // Stream endpoints
│   ├── streamMarkets.js          // Stream-specific markets
│   └── streamAdmin.js            // Admin controls
```

### Database Schema

```sql
-- Stream tracking
CREATE TABLE livestreams (
  id SERIAL PRIMARY KEY,
  token_address VARCHAR(255) UNIQUE,
  stream_url VARCHAR(255),
  creator_wallet VARCHAR(255),
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stream markets (5-min windows)
CREATE TABLE stream_markets (
  id SERIAL PRIMARY KEY,
  stream_id INTEGER REFERENCES livestreams(id),
  question VARCHAR(255),
  options JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  resolved_at TIMESTAMP,
  winning_option INTEGER,
  total_volume DECIMAL(20, 9),
  creator_fee DECIMAL(20, 9),
  streamer_fee DECIMAL(20, 9)
);

-- Stream bets
CREATE TABLE stream_bets (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES stream_markets(id),
  user_wallet VARCHAR(255),
  option INTEGER,
  amount DECIMAL(20, 9),
  tx_signature VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. Set up PumpFun API integration
2. Create stream monitoring service
3. Build livestream database schema
4. Implement 5-minute market creation

### Phase 2: Frontend UI (Week 2)
1. Create livestream browsing page
2. Build stream embed component
3. Implement quick betting interface
4. Add stream-specific leaderboards

### Phase 3: Smart Contract Updates (Week 3)
1. Modify market contract for 5-min windows
2. Add creator/streamer fee distribution
3. Implement SPL token rewards
4. Test on devnet

### Phase 4: Integration (Week 4)
1. Connect frontend to stream APIs
2. Implement real-time updates
3. Add admin controls
4. Launch beta with select streams

## Key Differentiators

1. **Speed**: 5-minute markets for instant gratification
2. **Integration**: Seamless pump.fun experience
3. **Rewards**: SPL token incentives
4. **Social**: Stream-specific communities
5. **Mobile**: Optimized for on-the-go betting

## Revenue Model

1. **Platform Fees**: Small % on each market
2. **Featured Streams**: Paid promotions
3. **Premium Features**: Advanced analytics
4. **Token Utility**: APES staking benefits

## Technical Challenges

1. **Real-time Updates**: WebSocket for live data
2. **Scale**: Handle multiple concurrent streams
3. **Resolution**: Quick, fair market settlement
4. **Integration**: Overlay on pump.fun (if possible)

## MVP Features

- [ ] Monitor 5-10 featured PumpFun streams
- [ ] Create YES/NO predictions during streams
- [ ] 5-minute betting windows
- [ ] SOL-based betting
- [ ] Automatic resolution
- [ ] Creator/streamer rewards
- [ ] Basic leaderboard
- [ ] Mobile-responsive UI

## Future Enhancements

- Multi-option markets (not just YES/NO)
- Stream chat integration
- Prediction tournaments
- Stream analytics dashboard
- API for third-party integrations
- Cross-stream competitions

## Your Stream Strategy

As a developer building this:
1. Stream your development process 24/7
2. Create markets about your coding progress
3. "Will I fix this bug in 5 minutes?"
4. "Will the deployment succeed?"
5. Build community around development journey

## Next Steps

1. Research PumpFun API capabilities
2. Design UI mockups
3. Set up stream monitoring infrastructure
4. Create admin interface for stream control
5. Build MVP with 3-5 test streams