# Multi-Wallet Testing Guide

## ✅ Fixes Applied

1. **Session Storage Issue**: Changed from popup to same-window OAuth flow
2. **Backend Missing Methods**: Added all missing methods to TwitterServiceV2
3. **Better Error Handling**: Improved debugging and fallback for session storage
4. **State Parameter**: Using wallet address as OAuth state for fallback

## Step-by-Step Testing

### 1. Test Basic Twitter Linking

1. **Connect Wallet A** in your frontend
2. Go to `/engage-to-earn`
3. Click "Link 𝕏 Account"
4. **Check console logs** for debugging info
5. Complete Twitter OAuth
6. Verify successful linking

**Expected:**
- Points awarded: 100 for linking Twitter
- Twitter username displayed
- No "Missing verification data" error

### 2. Test Multi-Wallet Linking

1. **Disconnect Wallet A**
2. **Connect Wallet B** (different wallet address)
3. Go to `/engage-to-earn`
4. Click "Link 𝕏 Account" with **same Twitter account**
5. Complete OAuth

**Expected:**
- Success message: "Additional wallet linked to your Twitter account!"
- **No additional points** awarded (only first link gets 100 points)
- Wallet B now linked to same Twitter ID

### 3. Verify Database State

```bash
# Check Twitter accounts
node -e "require('dotenv').config(); const db = require('./config/database'); db.query('SELECT * FROM twitter_accounts').then(r => console.log('Twitter Accounts:', r.rows))"

# Check wallet links
node -e "require('dotenv').config(); const db = require('./config/database'); db.query('SELECT * FROM wallet_twitter_links').then(r => console.log('Wallet Links:', r.rows))"

# Check aggregated stats
node -e "require('dotenv').config(); const db = require('./config/database'); db.query('SELECT * FROM twitter_wallet_stats').then(r => console.log('Aggregated Stats:', r.rows))"
```

### 4. Test Points Aggregation

1. **With Wallet A connected**: Place a prediction (earn 10 points)
2. **With Wallet B connected**: Place a prediction (earn 10 points)
3. Check aggregated stats

**Expected:**
- Each wallet has its own point balance (10 points each)
- Twitter account shows aggregated total (120 points: 100 link + 10 + 10)

### 5. Test API Endpoints

```javascript
// Test getting linked wallets (replace with actual Twitter ID)
fetch('/api/twitter/linked-wallets/1869551350175961089')
  .then(r => r.json())
  .then(console.log);

// Test aggregated stats
fetch('/api/twitter/aggregated-stats/1869551350175961089')
  .then(r => r.json())
  .then(console.log);
```

## Debugging Session Storage Issues

### Check Browser Console

Look for these logs:
```
Stored in session: { code_verifier: "...", wallet: "..." }
Callback received: { code: true, state: "...", error: null }
Session storage: { code_verifier: "...", wallet: "..." }
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Missing verification data" | Session storage cleared | Use state parameter fallback |
| "Session expired" | OAuth took too long | Try linking again quickly |
| "Already linked to different account" | Wallet linked to different Twitter | Unlink first or use different wallet |

### Manual Session Storage Test

```javascript
// In browser console before OAuth:
sessionStorage.setItem('twitter_code_verifier', 'test');
sessionStorage.setItem('twitter_linking_wallet', 'test_wallet');

// After redirect:
console.log(sessionStorage.getItem('twitter_code_verifier'));
console.log(sessionStorage.getItem('twitter_linking_wallet'));
```

## Testing Multi-Wallet Features

### 1. Profile Page Updates (Future)

**What to Build:**
```jsx
// Show all linked wallets
<div>
  <h3>@{twitterUsername}</h3>
  <p>Linked Wallets:</p>
  <ul>
    {linkedWallets.map(wallet => (
      <li key={wallet.address}>
        {wallet.address} {wallet.is_primary && '(Primary)'}
      </li>
    ))}
  </ul>
  <button>Link Additional Wallet</button>
</div>
```

### 2. Aggregated Points Display

**What to Build:**
```jsx
// Show total points across all wallets
<div>
  <h3>Total Points: {aggregatedStats.total_points_all_wallets}</h3>
  <p>From {aggregatedStats.linked_wallets_count} wallets</p>
  <p>Total Volume: ${aggregatedStats.total_invested_all_wallets}</p>
</div>
```

### 3. Leaderboard Updates

**What to Build:**
```jsx
// Rank by Twitter account, not wallet
<div>
  <h3>@{user.twitter_username}</h3>
  <p>Points: {user.total_points_all_wallets}</p>
  <p>Wallets: {user.linked_wallets_count}</p>
</div>
```

## Expected Database Structure

After successful multi-wallet linking:

```sql
-- twitter_accounts table
twitter_id: '1869551350175961089'
twitter_username: 'YourTwitterHandle'
linked_wallets_count: 2

-- wallet_twitter_links table
wallet_address: 'WalletA...', twitter_id: '186...', is_primary: true
wallet_address: 'WalletB...', twitter_id: '186...', is_primary: false

-- point_balances table
user_address: 'WalletA...', total_points: 110
user_address: 'WalletB...', total_points: 10

-- twitter_wallet_stats view
total_points_all_wallets: 120
linked_wallets_count: 2
```

## Success Criteria

✅ **Basic Linking**: First wallet links successfully, gets 100 points
✅ **Multi-Wallet**: Second wallet links to same Twitter, no extra points
✅ **Points Separation**: Each wallet has separate point balance
✅ **Aggregation**: View shows combined stats across wallets
✅ **No Session Errors**: OAuth works without "Missing verification data"
✅ **Database Integrity**: All tables properly populated

## Next Development Steps

1. **Update Frontend**: Add wallet management UI
2. **API Endpoints**: Build additional wallet endpoints
3. **Leaderboard**: Update to show Twitter-based rankings
4. **Profile Management**: Allow wallet unlinking/switching
5. **Points Display**: Show aggregated totals in UI

---

🎉 **Your PRIMAPE platform now supports multiple wallets per Twitter account!** 