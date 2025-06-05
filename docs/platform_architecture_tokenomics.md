# Platform Architecture and Tokenomics Design

## Overview
This document outlines the architecture and tokenomics for our Solana-based prediction market platform, integrating BelieveApp token burning mechanics and Meteora liquidity pools.

## Platform Architecture

### Core Components

1. **Frontend Layer**
   - Web application (responsive design)
   - Mobile application
   - Primape.app brand styling (dark theme with blue accents)

2. **Backend Layer**
   - API Gateway
   - Authentication Service
   - Market Management Service
   - User Management Service
   - Prediction Processing Service
   - Oracle Integration Service
   - Analytics Service

3. **Blockchain Layer**
   - Solana Smart Contracts
   - BelieveApp Integration
   - Meteora Liquidity Pool Integration

4. **Data Layer**
   - Market Database
   - User Database
   - Transaction Database
   - Analytics Database

### System Flow

1. **User Registration/Authentication**
   - Standard email/password
   - Wallet connection (Solana)
   - Social login options

2. **Market Creation**
   - Admin-created markets
   - User-created markets (with creator role)
   - Market validation and approval process
   - Multiple market types (binary, multi-option, timeline-based)

3. **Prediction Placement**
   - Token selection and amount
   - Burn percentage calculation
   - Transaction processing
   - Position recording

4. **Market Resolution**
   - Automated via oracles
   - Manual resolution by admins
   - Dispute resolution process

5. **Reward Distribution**
   - Calculation of winnings
   - Token distribution
   - Burn percentage on claiming

## Tokenomics

### Token Utility

1. **Native Token (9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts)**
   - Primary currency for all platform activities
   - Staking for platform benefits
   - Governance participation
   - Liquidity provision rewards

2. **Token Burning Mechanics**
   - Placing bets: 2.5% burn rate
   - Claiming rewards: 1.5% burn rate
   - Market creation: 0.5% burn rate (of required stake)
   - Failed disputes: 5% burn rate (of dispute stake)

3. **Liquidity Pool Integration**
   - Meteora.ag integration (https://www.meteora.ag/pools/881ooAUZamh41avqLzRbJz8EMzPn5vxFyjhcWmzjDRbu)
   - Additional pool for platform token/USDC
   - Liquidity provider incentives
   - Automated market making

### Economic Model

1. **Fee Structure**
   - Platform fee: 1% of bet amount
   - Creator fee: 0.5% of market volume (for user-created markets)
   - Dispute fee: 0.1% of disputed amount

2. **Reward Distribution**
   - Winners: 97% of the pool (after fees and burns)
   - Creators: 0.5% of total market volume
   - Liquidity providers: 0.5% of platform fees

3. **Incentive Mechanisms**
   - Daily login rewards
   - Streak bonuses
   - Leaderboard rewards
   - Market creation incentives
   - Referral program

## BelieveApp Integration

### Token Burning Implementation

1. **Single Burn Integration**
   - Endpoint: POST /v1/tokenomics/burn
   - Used for individual user actions (single bets, claims)
   - Proof type: "PREDICTION_BET" or "PREDICTION_CLAIM"
   - Persist on-chain: true

2. **Batch Burn Integration**
   - Endpoint: POST /v1/tokenomics/burn-batch
   - Used for batch processing during high volume periods
   - Idempotency implementation to prevent duplicate burns
   - Error handling and retry mechanisms

### Proof Schema

1. **Bet Placement Proof**
   ```json
   {
     "type": "PREDICTION_BET",
     "proof": {
       "userId": "<user_id>",
       "marketId": "<market_id>",
       "predictionOption": "<option>",
       "amount": "<amount>",
       "timestamp": "<timestamp>"
     },
     "burnAmount": "<calculated_burn_amount>",
     "persistOnchain": true
   }
   ```

2. **Reward Claim Proof**
   ```json
   {
     "type": "PREDICTION_CLAIM",
     "proof": {
       "userId": "<user_id>",
       "marketId": "<market_id>",
       "winningOption": "<option>",
       "rewardAmount": "<amount>",
       "timestamp": "<timestamp>"
     },
     "burnAmount": "<calculated_burn_amount>",
     "persistOnchain": true
   }
   ```

## Meteora Liquidity Pool Integration

1. **Pool Configuration**
   - Primary pool: Platform token/USDC
   - Secondary pools: Platform token/SOL, Platform token/USDT
   - Concentrated liquidity ranges

2. **Liquidity Provision**
   - User-provided liquidity
   - Protocol-owned liquidity
   - Fee distribution to liquidity providers

3. **Swap Functionality**
   - Direct integration in platform UI
   - Automatic token swaps for users without platform tokens
   - Slippage protection

## Security Measures

1. **Smart Contract Security**
   - Formal verification
   - Multiple audits
   - Bug bounty program

2. **Transaction Security**
   - Multi-signature requirements for admin actions
   - Rate limiting
   - Fraud detection systems

3. **User Security**
   - Two-factor authentication
   - Withdrawal limits and delays
   - Suspicious activity monitoring
