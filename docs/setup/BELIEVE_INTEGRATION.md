# Believe API Integration Documentation

## Current Status

The Believe API integration is **PARTIALLY ACTIVE** - predictions are burning tokens successfully!

### ✅ What's Working

- **PREDICTION_PLACED** proof type is configured and operational
- When users place bets, 1 APES is burned automatically
- Burns happen asynchronously after successful on-chain transactions

### ⏳ Waiting for Configuration

We need these proof types added to complete the integration:
- **PREDICTION_CLAIMED** - for claiming rewards (1 APES burn)
- **MARKET_CREATED** - for creating markets (5 APES burn)

### What's Implemented

1. **Frontend Integration**
   - `believeApiService.js` - Service layer for API calls
   - `believeMonitor.js` - Monitoring and logging burns
   - Integration points in:
     - `PredictionModal.jsx` (betting) ✅ WORKING
     - `ClaimRewardModal.jsx` (claiming) ⏳ Waiting for PREDICTION_CLAIMED
     - `CreateMarketPage.jsx` (market creation) ⏳ Waiting for MARKET_CREATED

2. **Burn Amounts**
   - Prediction Bet: 1 APES ✅
   - Claim Reward: 1 APES ⏳
   - Market Creation: 5 APES ⏳

3. **Architecture**
   - Burns happen off-chain via API after on-chain transactions
   - Burns are non-blocking (failures don't affect main operations)
   - Proper error handling and monitoring

## Next Steps

### Add Missing Proof Types

Please add these to your Believe API configuration:

```json
{
  "proofTypes": [
    {
      "type": "PREDICTION_CLAIMED",
      "description": "Used when a user claims rewards on APES.PRIMAPE.APP"
    },
    {
      "type": "MARKET_CREATED",
      "description": "Used when a user creates a market on APES.PRIMAPE.APP"
    }
  ]
}
```

Both should use the same proof schema as PREDICTION_PLACED:
```json
{
  "transactionId": "solana-tx-signature",
  "value": "amount"
}
```

### No Code Changes Needed

Once the proof types are added to Believe:
1. The integration will automatically start working
2. Claims and market creation will trigger burns
3. Monitor the console for burn confirmations

## Testing

### Current Testing Status

```bash
# Test proof types - PREDICTION_PLACED works!
node scripts/test-believe-proof-types.js

# Test full integration
node scripts/test-believe-integration.js
```

### Manual Testing

1. **Place a bet** ✅ - Check console for "🔥 Believe burn successful"
2. **Claim a reward** ⏳ - Will work once PREDICTION_CLAIMED is added
3. **Create a market** ⏳ - Will work once MARKET_CREATED is added

## Monitoring

The `believeMonitor` utility tracks all burn attempts:

```javascript
// Access burn history
import believeMonitor from './utils/believeMonitor';
const burns = believeMonitor.getBurns();

// Check recent burns in console
console.log(believeMonitor.getRecentBurns(10));
```

Each burn record includes:
- Type (PREDICTION_BET, PREDICTION_CLAIM, MARKET_CREATION)
- Timestamp
- Success/failure status
- Error messages (if any)
- Transaction hash (for successful burns)

## Configuration

Current configuration in `src/frontend/src/config/believe.js`:
- API is **ENABLED**
- Using PREDICTION_PLACED for bets
- Ready for PREDICTION_CLAIMED and MARKET_CREATED

## Support

- See `docs/BELIEVE_SCHEMA.md` for detailed schema requirements
- Believe API Documentation: https://docs.believe.app/

## Support Contacts

- Believe API Documentation: https://docs.believe.app/
- Support Email: [To be added]
- Discord: [To be added] 