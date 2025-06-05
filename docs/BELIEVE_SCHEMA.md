# Believe API Schema for PRIMAPE

## Current Status

✅ **PREDICTION_PLACED** - Already configured and working

## Recommended Schema to Add

To complete the integration, please add these proof types to your Believe API key:

```json
{
  "proofTypes": [
    {
      "type": "PREDICTION_PLACED",
      "description": "Used when a user predicts on APES.PRIMAPE.APP"
    },
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

## Expected Proof Schema

All proof types use the same simple schema:

```json
{
  "transactionId": "solana-transaction-signature",
  "value": "amount-as-string"
}
```

## Fixed Burn Amounts

- **PREDICTION_PLACED**: 1 APES
- **PREDICTION_CLAIMED**: 1 APES
- **MARKET_CREATED**: 5 APES

## API Request Example

```bash
curl --request POST \
  --url https://public.believe.app/v1/tokenomics/burn \
  --header 'Content-Type: application/json' \
  --header 'x-believe-api-key: YOUR-API-KEY' \
  --header 'x-idempotency-key: unique-request-id' \
  --data '{
    "type": "PREDICTION_PLACED",
    "proof": {
      "transactionId": "5xY8...transaction-signature",
      "value": "100"
    },
    "burnAmount": 1,
    "persistOnchain": true
  }'
```

## Integration Status

| Proof Type | Status | Usage |
|------------|--------|-------|
| PREDICTION_PLACED | ✅ Working | When users place bets |
| PREDICTION_CLAIMED | ❌ Needs to be added | When users claim rewards |
| MARKET_CREATED | ❌ Needs to be added | When users create markets |

## Next Steps

1. Add the two missing proof types to your Believe API configuration
2. No code changes needed - the integration will automatically start working
3. The burns will happen automatically after each successful transaction

## Testing

Once the new proof types are added, test with:

```bash
# Test all proof types
node scripts/test-believe-proof-types.js

# Test full integration flow
node scripts/test-believe-integration.js
``` 