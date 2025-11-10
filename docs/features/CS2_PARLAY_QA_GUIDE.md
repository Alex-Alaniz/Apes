# CS2 Parlay Tournament - Quick Launch Guide

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Backend - Install uuid package
cd backend
npm install

# Frontend - Already installed
cd ../src/frontend
# npm install (if needed)
```

### 2. Run Database Migration

```bash
# From backend directory
cd backend
node scripts/setup-cs2-parlay.js
```

Expected output:
```
🎮 Setting up CS2 Parlay Tournament...
📝 Creating parlay tournament tables...
✅ Parlay tournament tables created successfully
🎯 Adding sample CS2 matches...
✅ Added 6 sample CS2 matches
📊 CS2 Parlay Tournament Status:
   Name: CS2 Esports World Cup 2025
   Status: upcoming
   Prize Pool: 100000 APES
   Min Selections: 2
   Base Multiplier: 1.8x
✅ CS2 Parlay Tournament setup complete!
🎮 Access the tournament at: /parlay/cs2-ewc-2025
```

### 3. Start the Application

**Option 1: Using run script**
```bash
cd /Users/alexalaniz/Documents/GitHub/apes
./run-local-with-prod-backend.sh
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd src/frontend
npm run dev
```

### 4. Access the Tournament

1. Open browser: http://localhost:3000
2. Look for the **CS2 Esports World Cup 2025** banner on homepage
3. Click "Enter Tournament" or go directly to: http://localhost:3000/parlay/cs2-ewc-2025

## 🧪 QA Testing Checklist

### Basic Functionality

- [ ] **Homepage Banner**
  - CS2 tournament banner appears
  - Shows correct prize pool (100,000 APES)
  - "Enter Tournament" button works

- [ ] **Tournament Page Loads**
  - URL: `/parlay/cs2-ewc-2025`
  - Shows tournament stats
  - Displays 6 sample matches

- [ ] **Match Selection**
  - Can select teams by clicking
  - Selected teams highlighted in green
  - Can deselect by clicking again
  - Cannot select from completed matches

- [ ] **Bet Slip**
  - Shows selected matches
  - Requires minimum 2 selections
  - Multiplier updates correctly:
    - 2 selections: 2.3x
    - 3 selections: 2.8x
    - 4 selections: 3.3x
  - Shows potential payout

- [ ] **Wallet Connection**
  - Connect wallet button works
  - Shows "Connect wallet to place bet" when disconnected
  - "Place Parlay Bet" enabled when connected

### Advanced Testing

- [ ] **Place a Bet** (requires APES tokens)
  1. Connect wallet
  2. Select 2+ matches
  3. Enter stake amount (min 10 APES)
  4. Click "Place Parlay Bet"
  5. Approve transaction
  6. See success message

- [ ] **My Bets Tab**
  - Shows placed bets
  - Displays selections and status
  - Shows potential payout

- [ ] **Leaderboard Tab**
  - Displays user rankings
  - Shows profit and win rate

## 🐛 Known Issues & Fixes

### Issue 1: "Cannot find module 'uuid'"
**Fix**: Run `npm install` in backend directory

### Issue 2: Frontend build error
**Status**: Fixed - removed complex SVG pattern

### Issue 3: Database tables missing
**Fix**: Run `node scripts/setup-cs2-parlay.js`

## 📱 Test Scenarios

### Scenario 1: First Time User
1. Visit homepage
2. See CS2 banner
3. Click to enter tournament
4. Browse matches
5. Try to bet without wallet (should prompt to connect)

### Scenario 2: Place a Parlay
1. Connect wallet with APES tokens
2. Select FaZe Clan and NAVI to win
3. Stake 50 APES
4. Multiplier should show 2.3x
5. Potential payout: 115 APES
6. Place bet

### Scenario 3: Invalid Bet Attempt
1. Select only 1 match
2. Try to place bet
3. Should see "Please select at least 2 matches"

## 🔧 Admin Functions

To update match results (admin only):

1. Must be logged in with admin wallet
2. Use API endpoint:
```bash
curl -X PUT http://localhost:5001/api/parlay-tournaments/matches/cs2-ewc-2025-001/result \
  -H "x-wallet-address: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z" \
  -H "Content-Type: application/json" \
  -d '{
    "winner": "team_a",
    "scoreA": 2,
    "scoreB": 1
  }'
```

## 📊 Success Metrics

- Page loads < 2 seconds
- Match selection responsive
- Multiplier calculates instantly
- Wallet transactions complete
- No console errors

## 🚨 Emergency Fixes

If something breaks:

1. **Reset database**:
```bash
cd backend
node scripts/setup-cs2-parlay.js
```

2. **Clear browser cache**:
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

3. **Check logs**:
- Backend: Terminal running `npm run dev`
- Frontend: Browser console (F12)

## 📞 Support

- Check `CS2_PARLAY_TOURNAMENT_DOCS.md` for detailed documentation
- Review error logs in browser console
- Backend logs show API requests/responses