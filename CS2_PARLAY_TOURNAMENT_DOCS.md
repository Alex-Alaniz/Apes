# CS2 Parlay Tournament Documentation

## Overview

We've successfully implemented a parlay-style betting tournament for the CS2 Esports World Cup 2025. This system allows users to create multi-match parlays using APES tokens, inspired by clutch.markets.

## Architecture

### Database Schema

1. **parlay_tournaments** - Tournament configuration
   - `tournament_id`: Unique identifier (cs2-ewc-2025)
   - `min_selections`: 2 (minimum matches for parlay)
   - `base_multiplier`: 1.8x
   - `multiplier_increment`: 0.5x per additional selection
   - `prize_pool`: 100,000 APES

2. **cs2_matches** - Match data
   - Team information and logos
   - Match dates and venues
   - Status tracking (scheduled/live/completed)
   - Results and scores

3. **parlay_bets** - User parlay bets
   - User selections (array of match predictions)
   - Stake amount in APES
   - Total multiplier calculation
   - Status tracking (pending/won/lost)

4. **parlay_bet_selections** - Individual match selections
   - Links to specific matches
   - Selected team
   - Result tracking

### Backend API Endpoints

- `GET /api/parlay-tournaments/:tournamentId` - Tournament details
- `GET /api/parlay-tournaments/:tournamentId/matches` - Get all matches
- `POST /api/parlay-tournaments/:tournamentId/bet` - Place parlay bet
- `GET /api/parlay-tournaments/:tournamentId/bets/:userAddress` - User's bets
- `GET /api/parlay-tournaments/:tournamentId/leaderboard` - Tournament rankings
- `PUT /api/parlay-tournaments/matches/:matchId/result` - Update match results (admin)

### Frontend Components

1. **CS2ParlayTournamentPage** (`/parlay/cs2-ewc-2025`)
   - Main tournament interface
   - Match selection grid
   - Bet slip with real-time multiplier calculation
   - User bet history
   - Leaderboard

2. **CS2ParlayBanner**
   - Homepage promotional component
   - Quick stats and entry button

3. **parlayService**
   - Handles APES token transactions
   - Integrates with Believe API for burns

## Setup Instructions

### 1. Database Setup

Run the migration to create tables:

```bash
cd backend
node scripts/setup-cs2-parlay.js
```

This will:
- Create all necessary tables
- Insert the CS2 tournament configuration
- Add sample matches for testing

### 2. Backend Configuration

The parlay routes are already added to `server.js`:
```javascript
app.use('/api/parlay-tournaments', parlayTournamentRoutes);
```

### 3. Frontend Access

The tournament is accessible at:
- Direct URL: `http://localhost:3000/parlay/cs2-ewc-2025`
- Via homepage banner

## Key Features

### Parlay Rules
- **Minimum 2 selections** required
- **All selections must win** for payout
- **Multiplier calculation**: 1.8x base + 0.5x per additional selection
- Example: 3 selections = 1.8 + (0.5 × 2) = 2.8x multiplier

### Token Integration
- Uses APES token (9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts)
- 2.5% burn fee on bet placement
- 1.5% burn fee on payout claims
- Integrates with Believe API for burn tracking

### User Flow
1. Select at least 2 matches
2. Choose winner for each match
3. Enter stake amount
4. Place bet (APES tokens transferred)
5. Wait for match results
6. Claim winnings if all selections correct

## Issues Fixed

### 1. SVG Pattern Syntax Error
**Problem**: Complex SVG data URL in background pattern caused JSX parsing error
**Solution**: Replaced with simple gradient background

### 2. Missing Dependencies
**Status**: Need to install uuid package for bet ID generation
```bash
cd backend
npm install uuid
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Sample matches appear in UI
- [ ] Match selection works (minimum 2)
- [ ] Multiplier calculates correctly
- [ ] Bet placement with wallet connected
- [ ] User bet history displays
- [ ] Leaderboard shows rankings
- [ ] Admin can update match results
- [ ] Winning bets marked correctly

## Production Deployment

### Environment Variables

Backend needs:
```env
ADMIN_WALLETS=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z,... # Admin wallets for match result updates
```

Frontend needs:
```env
VITE_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
VITE_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
```

### Smart Contract Integration

Currently using direct token transfers. For production:
1. Deploy parlay-specific smart contract
2. Implement escrow for bet stakes
3. Automated payout distribution
4. On-chain result verification

## Next Steps

1. **Add Real Match Data**
   - Integrate with Liquipedia API
   - Pull live CS2 tournament data
   - Automated result updates

2. **Enhanced UI Features**
   - Live match tracking
   - Bet builder with saved parlays
   - Social sharing of parlays
   - Mobile optimization

3. **Additional Tournament Types**
   - League of Legends
   - Valorant
   - Dota 2
   - Traditional sports

4. **Smart Contract Development**
   - Parlay-specific program
   - Automated payout logic
   - Fee distribution
   - Prize pool management

## API Usage Examples

### Place a Parlay Bet
```javascript
POST /api/parlay-tournaments/cs2-ewc-2025/bet
{
  "userAddress": "wallet_address",
  "selections": [
    { "match_id": "cs2-ewc-2025-001", "selected_team": "FaZe Clan" },
    { "match_id": "cs2-ewc-2025-002", "selected_team": "NAVI" }
  ],
  "stakeAmount": 100
}
```

### Get User's Bets
```javascript
GET /api/parlay-tournaments/cs2-ewc-2025/bets/wallet_address
```

### Update Match Result (Admin)
```javascript
PUT /api/parlay-tournaments/matches/cs2-ewc-2025-001/result
Headers: { "x-wallet-address": "admin_wallet" }
{
  "winner": "team_a",
  "scoreA": 2,
  "scoreB": 1
}
```

## Troubleshooting

### Frontend Build Error
If you see JSX parsing errors, check for:
- Unescaped quotes in strings
- Complex inline SVG patterns
- Missing closing tags

### Token Transfer Failures
- Ensure user has sufficient APES balance
- Check wallet connection
- Verify token account exists

### Database Connection
- Run migration script first
- Check Supabase connection string
- Verify table permissions

## Security Considerations

1. **Admin Access**
   - Only authorized wallets can update match results
   - Wallet addresses checked server-side

2. **Bet Validation**
   - Minimum/maximum stake limits
   - Match status verification
   - Duplicate selection prevention

3. **Payout Security**
   - Results must be confirmed by admin
   - Automated payout calculation
   - Burn fees applied correctly