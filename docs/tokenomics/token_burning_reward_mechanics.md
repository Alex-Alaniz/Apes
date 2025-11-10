# Token Burning and Reward Mechanics

## Overview
This document details the token burning and reward mechanics for our Solana-based prediction market platform, implementing differentiated burn rates for various platform activities through BelieveApp integration.

## Token Burning Mechanics

### Burn Rates by Activity

1. **Placing Bets**
   - Burn Rate: 2.5% of bet amount
   - Implementation: Real-time burn via BelieveApp API
   - Example: For a 100 token bet, 2.5 tokens are burned
   - Proof Type: "PREDICTION_BET"

2. **Claiming Rewards**
   - Burn Rate: 1.5% of claimed amount
   - Implementation: Real-time burn at claim time
   - Example: For a 200 token reward, 3 tokens are burned
   - Proof Type: "PREDICTION_CLAIM"

3. **Market Creation (for users with creator role)**
   - Burn Rate: 0.5% of required stake
   - Implementation: One-time burn at market creation
   - Example: For a market requiring 1000 token stake, 5 tokens are burned
   - Proof Type: "MARKET_CREATION"

4. **Failed Disputes**
   - Burn Rate: 5% of dispute stake
   - Implementation: Conditional burn after dispute resolution
   - Example: For a 100 token dispute stake, 5 tokens are burned if dispute fails
   - Proof Type: "FAILED_DISPUTE"

### Implementation Details

1. **Single User Actions**
   - API Endpoint: POST /v1/tokenomics/burn
   - Authentication: X-Believe-API-Key header
   - Idempotency: X-Idempotency-Key header with UUID
   - Error Handling: Retry mechanism for network failures

2. **Batch Processing**
   - API Endpoint: POST /v1/tokenomics/burn-batch
   - Trigger: High volume periods or scheduled batch processing
   - Maximum Batch Size: 100 transactions per batch
   - Rate Limiting: Respect 10 requests per second limit

3. **On-Chain Persistence**
   - All burns are recorded on-chain for transparency
   - Parameter: persistOnchain = true
   - Transaction hash stored in platform database for reference

### Proof Schema Implementations

1. **Bet Placement Proof**
   ```json
   {
     "type": "PREDICTION_BET",
     "proof": {
       "userId": "user123",
       "marketId": "market456",
       "predictionOption": "Yes",
       "amount": "100",
       "odds": "2.5",
       "timestamp": "2025-05-22T03:45:12Z",
       "transactionId": "tx789"
     },
     "burnAmount": "2.5",
     "persistOnchain": true
   }
   ```

2. **Reward Claim Proof**
   ```json
   {
     "type": "PREDICTION_CLAIM",
     "proof": {
       "userId": "user123",
       "marketId": "market456",
       "winningOption": "Yes",
       "originalBet": "100",
       "rewardAmount": "250",
       "timestamp": "2025-05-25T14:22:05Z",
       "transactionId": "tx790"
     },
     "burnAmount": "3.75",
     "persistOnchain": true
   }
   ```

3. **Market Creation Proof**
   ```json
   {
     "type": "MARKET_CREATION",
     "proof": {
       "userId": "user123",
       "marketId": "market456",
       "marketTitle": "Will BTC reach $200k in 2025?",
       "stakeAmount": "1000",
       "timestamp": "2025-05-20T09:15:33Z",
       "transactionId": "tx788"
     },
     "burnAmount": "5",
     "persistOnchain": true
   }
   ```

4. **Failed Dispute Proof**
   ```json
   {
     "type": "FAILED_DISPUTE",
     "proof": {
       "userId": "user123",
       "marketId": "market456",
       "disputeId": "dispute101",
       "stakeAmount": "100",
       "resolution": "rejected",
       "timestamp": "2025-05-26T11:30:45Z",
       "transactionId": "tx791"
     },
     "burnAmount": "5",
     "persistOnchain": true
   }
   ```

## Reward Mechanics

### Reward Calculation

1. **Binary Markets (Yes/No)**
   - Winning Pool Distribution: Total pool * (individual stake / total winning stake)
   - Example: If Yes wins with 400 total Yes stake, a user with 100 Yes stake gets 25% of the pool

2. **Multi-Option Markets**
   - Winning Pool Distribution: Total pool * (individual stake / total winning option stake)
   - Example: For a market with options A, B, C, if A wins and user bet on A, they get proportional share

3. **Odds-Based Markets**
   - Fixed Odds: Payout = Stake * Odds
   - Example: 100 token bet at 2.5x odds pays 250 tokens if won

### Reward Distribution Process

1. **Market Resolution**
   - Triggered by oracle data or admin action
   - All winning positions identified
   - Total reward pool calculated (total bets - fees - burns)

2. **Claim Process**
   - User initiates claim through UI
   - System verifies winning position
   - Burn amount calculated (1.5% of reward)
   - Remaining tokens transferred to user wallet

3. **Automated Distribution**
   - Optional auto-claim feature for users
   - Triggered when market resolves
   - Same burn mechanics applied
   - Reduces friction for users

### Special Reward Features

1. **Streak Bonuses**
   - Consecutive winning predictions earn bonus rewards
   - Bonus Structure: 5% extra for 3 wins, 10% for 5 wins, 15% for 10+ wins
   - Bonus applied before burn calculation

2. **Volume Discounts**
   - High-volume bettors receive reduced burn rates
   - Tiers: 2.3% burn for 1000+ tokens monthly, 2.0% for 10,000+ tokens
   - Tracked on rolling 30-day basis

3. **Creator Rewards**
   - Market creators earn 0.5% of total market volume
   - Paid at market resolution
   - No burn applied to creator rewards

4. **Referral Rewards**
   - Users earn 5% of friends' burn amounts for first month
   - No cap on referral earnings
   - Paid in real-time as friends place bets

## Error Handling and Edge Cases

1. **Insufficient Balance**
   - Pre-check balance before attempting burn
   - Clear error message to user
   - Option to add funds directly from UI

2. **Failed Burns**
   - Transaction logged for retry
   - Automatic retry up to 3 times with exponential backoff
   - Admin alert for persistent failures

3. **Market Cancellations**
   - All bets refunded without burn
   - Cancellation reason recorded
   - Creator stake returned minus platform fee

4. **Disputed Outcomes**
   - Temporary hold on all rewards
   - Resolution committee review
   - Burn applied only to losing dispute stakes

## Monitoring and Analytics

1. **Burn Metrics Dashboard**
   - Total tokens burned (daily, weekly, monthly)
   - Burn by activity type
   - Burn rate effectiveness

2. **Reward Distribution Metrics**
   - Average reward size
   - Claim time after resolution
   - Unclaimed rewards tracking

3. **Economic Impact Analysis**
   - Supply reduction rate
   - Price impact correlation
   - User behavior changes based on burn rates
