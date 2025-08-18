# CS2 Parlay System - How It Works

## Current Implementation (UI/Database Only)

### 🎯 How Wagers Are Placed

1. **Frontend Selection**: Users select 2+ matches and teams
2. **Token Transfer**: APES tokens transferred from user → treasury wallet
3. **Database Record**: Bet recorded in PostgreSQL with selections
4. **No Smart Contract**: Currently pure UI + database implementation

### 💰 Liquidity & Payout System

**Current Status: CENTRALIZED LIQUIDITY POOL**

- **Treasury Wallet**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
- **All APES tokens**: Flow into this single treasury
- **Payouts**: Manual/automated from treasury (not implemented yet)
- **Risk**: All multipliers are promises - no escrow backing

### 📊 Multiplier Economics

```
Base: 1.8x for 2 selections
Each additional: +0.5x

2 selections: 1.8x
3 selections: 2.3x  
4 selections: 2.8x
5 selections: 3.3x
```

**⚠️ LIQUIDITY RISK**: Currently no caps or risk management!

### 🔥 Token Burns

- **2.5%** burned on bet placement (via Believe API)
- **1.5%** burned on payout claims
- **Burns reduce**: Total APES supply over time

## Production Recommendations

### 1. Implement Smart Contract Escrow

```solana
// Pseudo-code for proper escrow
pub fn place_parlay_bet(
    ctx: Context<PlaceParlayBet>,
    selections: Vec<Selection>,
    amount: u64,
) -> Result<()> {
    // Transfer tokens to escrow PDA
    // Lock funds until resolution
    // Calculate max payout exposure
}
```

### 2. Liquidity Management

**Option A: Pool-Based**
- Set max exposure per parlay (e.g., 10,000 APES)
- Track total outstanding liability
- Reject bets if liquidity insufficient

**Option B: Peer-to-Peer**
- Users bet against each other
- Platform takes commission
- No house risk

### 3. Risk Controls

```javascript
// Example risk management
const maxParlayPayout = 50000; // APES
const maxTotalExposure = 500000; // APES
const currentExposure = calculatePendingPayouts();

if (potentialPayout > maxParlayPayout) {
  throw new Error('Parlay too large');
}

if (currentExposure + potentialPayout > maxTotalExposure) {
  throw new Error('Insufficient liquidity');
}
```

## Current vs Ideal Architecture

### Current (Phase 1):
```
User → Frontend → Database → Treasury Wallet
             ↓
         Believe API (burns)
```

### Ideal (Phase 2):
```
User → Frontend → Smart Contract → Escrow PDA
                       ↓
                 Auto-resolution
                       ↓
                 Payout/Burn logic
```

## Smart Contract Status

**❌ NOT DEPLOYED**
- No Solana program for parlay betting
- No escrow accounts
- No automated resolution
- No on-chain payout logic

**Current escrow**: Simple token transfers to treasury

## Next Steps

1. **Deploy team logo fixes** ✅
2. **Implement payout system** (manual admin for now)
3. **Add liquidity limits** (protect treasury)
4. **Build smart contract** (long-term)
5. **Automated match resolution** (via oracles)

## Security Considerations

⚠️ **Current risks:**
- Unlimited exposure to treasury
- Manual payout dependency  
- No on-chain verification
- Centralized liquidity

✅ **Mitigations:**
- Start with small bet limits
- Monitor treasury balance
- Implement admin controls
- Plan smart contract migration