# Multi-Wallet Implementation Plan

## Decision: Big Bang Migration (Recommended)

Since you have no active users and are preparing for launch, implementing multi-wallet support NOW is the best approach.

## Step-by-Step Implementation

### Phase 1: Database Migration (30 minutes)
```bash
# From src/backend directory:
./implement-multi-wallet.sh
```

This will:
- Backup your current schema
- Create new tables for multi-wallet support
- Migrate existing data
- Verify the new structure

### Phase 2: Update Backend Services (1-2 hours)

#### 1. Update TwitterService.js
Key changes needed:
- Modify `handleCallback` to check if Twitter account already exists
- If exists, link to new wallet instead of creating duplicate
- Update token storage to use Twitter ID instead of wallet address

#### 2. Update EngagementService.js
- Aggregate points by Twitter ID across all linked wallets
- Update leaderboard queries
- Modify point balance calculations

#### 3. Create New Endpoints
```javascript
// New routes needed:
POST /api/twitter/link-additional-wallet
GET /api/twitter/linked-wallets/:twitterId
DELETE /api/twitter/unlink-wallet
```

### Phase 3: Frontend Updates (2-3 hours)

#### 1. Profile Page
- Show all linked wallets
- Add "Link Additional Wallet" button
- Display aggregated stats

#### 2. Engage-to-Earn Page
- Update points display to show Twitter-based totals
- Show which wallet is currently active
- Allow switching between linked wallets

#### 3. Leaderboard
- Rank by Twitter account, not wallet
- Show Twitter username as primary identifier
- Display total across all wallets

## Testing Checklist

### Before Launch:
- [ ] Link Twitter to Wallet A
- [ ] Link same Twitter to Wallet B
- [ ] Verify points only awarded once
- [ ] Test wallet switching
- [ ] Verify aggregated stats
- [ ] Test unlinking wallets
- [ ] Check leaderboard accuracy

### Edge Cases to Test:
- [ ] Linking Twitter that's already linked
- [ ] Unlinking primary wallet
- [ ] Points calculation with multiple wallets
- [ ] OAuth token refresh with multiple wallets

## Quick Start Commands

### 1. List Linked Accounts
```bash
node unlink-twitter-for-testing.js list
```

### 2. Unlink for Testing
```bash
node unlink-twitter-for-testing.js unlink <username>
```

### 3. Unlink All (Testing Only)
```bash
node unlink-twitter-for-testing.js unlink-all
```

## Benefits for Launch

1. **Better UX**: Users can manage multiple wallets naturally
2. **Accurate Analytics**: True user metrics based on Twitter identity
3. **Fair Points System**: Prevents gaming through multiple accounts
4. **Future-Proof**: No migration needed after launch

## Risk Assessment

**Low Risk** because:
- No existing users to migrate
- Can test thoroughly before launch
- Easy rollback if needed
- Better to fix architecture now than later

## Next Action

Run the migration script now:
```bash
cd src/backend
./implement-multi-wallet.sh
```

Then update the services to support the new architecture. 