# Frontend Integration Notes

## 🔄 Integration Required

The backend is ready, but the frontend needs updates to use the API instead of localStorage:

### 1. ProfilePage.jsx
Currently uses localStorage for username. Update to:
```javascript
// Save username to backend
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: publicKey.toString(),
    username: tempUsername.trim()
  })
});
```

### 2. MarketService.js
Add methods to sync with backend:
```javascript
// After placing a prediction
await fetch(`${import.meta.env.VITE_API_URL}/api/predictions/record`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress,
    marketPubkey,
    marketQuestion,
    optionIndex,
    optionText,
    amount,
    transactionSignature
  })
});
```

### 3. Environment Setup
Create `.env` in frontend:
```
VITE_API_URL=http://localhost:5000
```

### 4. Components Ready to Use
- ✅ LeaderboardPage.jsx - Already integrated with API
- ✅ UserProfilePage.jsx - Already integrated with API
- ⚠️ ProfilePage.jsx - Needs username API integration
- ⚠️ MarketCard.jsx - Needs to sync predictions

## 🚀 Quick Start

1. **Start Backend First**:
```bash
cd backend
npm install
npm run dev
```

2. **Update Frontend .env**:
```bash
cd src/frontend
echo "VITE_API_URL=http://localhost:5000" > .env
```

3. **Test New Features**:
- Visit `/leaderboard` to see rankings
- Visit `/profile/[any-wallet-address]` to view profiles
- Username changes need backend integration

## 📝 Social Features Status

### Ready in Backend:
- ✅ Comments on markets
- ✅ Like/unlike comments
- ✅ Follow/unfollow users
- ✅ View followers/following

### Need Frontend Implementation:
- 🔨 Comment section component
- 🔨 Follow button integration
- 🔨 Social feed component
- 🔨 Notification system

The infrastructure is complete - just needs frontend components to use it! 