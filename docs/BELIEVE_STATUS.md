# Believe API Integration Status

## ✅ What's Working Now

**PREDICTION_PLACED** is live and burning tokens!

When users place bets on your platform:
- 1 APES is automatically burned
- Burn happens after successful on-chain transaction
- Example burn tx: `3bq2Dwkvi5bwrcHLPPoBUX56ZL6BX6sbJ7RAyuRhxQBc1paffMHwqhdbnUypL5ogzY21gpLFbAXMjnSR1nc3navP`

## ⏳ What's Coming Next

Just add these two proof types to your Believe API key:

### 1. PREDICTION_CLAIMED
```json
{
  "type": "PREDICTION_CLAIMED",
  "description": "Used when a user claims rewards on APES.PRIMAPE.APP"
}
```

### 2. MARKET_CREATED
```json
{
  "type": "MARKET_CREATED",
  "description": "Used when a user creates a market on APES.PRIMAPE.APP"
}
```

## 🎯 No Code Changes Needed

Once you add these proof types in Believe:
- Claims will automatically burn 1 APES
- Market creation will automatically burn 5 APES
- Everything is already coded and ready

## 📊 Current Burn Activity

Monitor burns in your browser console:
- Look for: "🔥 Believe burn successful"
- Each burn shows the blockchain transaction hash
- Failed burns are logged but don't affect user operations

## 🚀 That's It!

Your platform is already burning tokens on predictions. Just add the two proof types above to complete the integration. 