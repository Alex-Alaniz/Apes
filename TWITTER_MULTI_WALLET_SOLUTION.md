# Twitter Multi-Wallet Architecture Solution

## Overview
This document outlines the solution for allowing multiple wallets per Twitter account while maintaining the integrity of the points system.

## Current Issues Addressed

### 1. Terminal Errors
The errors you're seeing are due to:
- **Invalid authorization code**: OAuth codes expire quickly and can only be used once
- **Duplicate key constraint**: The Twitter ID is already linked to another wallet

### 2. False Error Flash
The "Failed to link" message appears because the frontend doesn't handle specific error cases properly. This has been fixed in `TwitterCallback.jsx`.

### 3. Architecture Change: Multiple Wallets per Twitter Account

## Points System & $APES Redemption

### Current Points System
Points are earned through various activities:
- **Twitter Linking**: 100 points (one-time per Twitter account)
- **Following @PrimapeApp**: 50 points
- **Likes**: 5 points per tweet
- **Reposts**: 10 points per tweet
- **Comments**: 15 points per tweet
- **Placing Predictions**: 10 points
- **First Daily Prediction**: 20 points bonus

### Points Storage
- **`engagement_points`**: Records all point-earning activities
- **`point_balances`**: Maintains user totals with automatic triggers
- **Tier System**: Bronze → Silver → Gold → Platinum with multipliers

### $APES Redemption Strategy
- **Conversion Rate**: 100 points = 10 APES (base rate)
- **Tier Multipliers**: Up to 1.5x for Platinum tier
- **Integration**: Ready for Believe App API integration
- **Claims Table**: `airdrop_claims` tracks redemptions

## Proposed Multi-Wallet Architecture

### Benefits
1. Users can manage multiple wallets under one Twitter identity
2. Aggregate trading volume and P&L across all linked wallets
3. Points earned per Twitter account, not per wallet
4. Better user experience for power users

### Implementation Strategy

#### Phase 1: Database Structure (Migration 007)
```sql
-- New tables:
- twitter_accounts: Stores Twitter profiles independently
- wallet_twitter_links: Maps wallets to Twitter accounts
- twitter_wallet_stats: View for aggregated statistics
```

#### Phase 2: Service Updates
The Twitter service needs to:
1. Check if Twitter account exists before linking
2. Allow linking additional wallets to existing Twitter accounts
3. Award points only once per Twitter account
4. Aggregate stats across all linked wallets

#### Phase 3: Frontend Updates
- Show all linked wallets in profile
- Add "Link Additional Wallet" button
- Display aggregated stats
- Update leaderboard to show Twitter-based rankings

### Security Considerations
1. Each wallet can only link to ONE Twitter account
2. Twitter OAuth tokens stored per Twitter account, not wallet
3. Points awarded based on Twitter ID to prevent double-earning
4. Wallet verification required for each link

## Implementation Plan

### Option 1: Gradual Migration (Recommended)
1. Deploy new tables alongside existing structure
2. Update services to support both architectures
3. Migrate users gradually
4. Remove old constraints once complete

### Option 2: Big Bang Migration
1. Take system offline for maintenance
2. Run migration 007 to restructure database
3. Deploy updated services
4. Test thoroughly before reopening

## Code Changes Required

### 1. TwitterService.js
- Update `handleCallback` to check for existing Twitter accounts
- Create new `linkAdditionalWallet` method
- Modify points awarding to check Twitter ID, not wallet

### 2. EngagementService.js
- Update points queries to aggregate by Twitter ID
- Modify leaderboard to show Twitter-based rankings
- Add methods for cross-wallet statistics

### 3. Frontend Components
- Update profile page to show linked wallets
- Add wallet management interface
- Update points display to show aggregated totals

## Testing Plan
1. Test linking same Twitter to multiple wallets
2. Verify points only awarded once per Twitter account
3. Check aggregated statistics accuracy
4. Test wallet unlinking/relinking
5. Verify OAuth token management

## Rollback Plan
If issues arise:
1. Restore database from backup
2. Revert service code
3. Clear browser caches
4. Communicate with users

## Next Steps
1. Review and approve architecture changes
2. Schedule maintenance window
3. Implement database migration
4. Update services and frontend
5. Thorough testing in staging
6. Deploy to production

## FAQ

**Q: Will existing users lose their points?**
A: No, all existing data will be preserved and migrated.

**Q: Can I unlink a wallet?**
A: Yes, but the Twitter account remains linked to prevent gaming the system.

**Q: What happens to points when linking additional wallets?**
A: Points remain with the Twitter account and are shared across all linked wallets.

**Q: Can I link my Twitter to someone else's wallet?**
A: No, wallet ownership verification is required. 