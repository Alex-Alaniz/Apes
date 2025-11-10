# Believe API Configuration Update

## Summary of Changes

The Believe API configuration has been updated to match the official API documentation.

### Key Changes:

1. **API URL**: 
   - ❌ Old: `https://api.believe.app/v1`
   - ✅ New: `https://public.believe.app/v1`

2. **API Endpoint**:
   - Full endpoint: `https://public.believe.app/v1/tokenomics/burn`

3. **Headers**:
   - `x-believe-api-key`: Your API key (not Bearer token)
   - `x-idempotency-key`: UUID v4 for preventing duplicate operations
   - `Content-Type`: `application/json`

4. **Request Body Structure**:
   ```json
   {
     "type": "PREDICTION_BUY",
     "proof": {
       "marketId": "...",
       "userWallet": "...",
       "transactionId": "...",
       // other proof fields
     },
     "burnAmount": 1,
     "persistOnchain": true
   }
   ```

5. **Proof Types**:
   - `PREDICTION_BUY` (was PREDICTION_BET)
   - `PREDICTION_CLAIM`
   - `MARKET_CREATE` (was MARKET_CREATION)

6. **Response Format**:
   ```json
   {
     "result": "SUCCESS",
     "hash": "SHA256_hash",
     "txHash": "solana_transaction_hash",
     "type": "PREDICTION_BUY",
     "dateBurned": "2025-05-31T04:00:00.000Z"
   }
   ```

### Environment Configuration:

```env
# In /src/frontend/.env
VITE_BELIEVE_API_KEY=your-api-key-here
VITE_BELIEVE_API_URL=https://public.believe.app/v1  # Optional, this is the default
```

### Testing:

1. **Node.js Test**:
   ```bash
   npm run test:believe
   # or
   node scripts/test-believe-api-burn.js
   ```

2. **Browser Console**:
   ```javascript
   testBelieveApi()
   ```

3. **Alternative Node.js Test**:
   ```bash
   export BELIEVE_API_KEY=your-api-key
   node scripts/test-believe-integration.js
   ```

### Error Codes:

- `ERR_TOKEN_NOT_FOUND`: Token configuration issue
- `ERR_INVALID_PROOF`: Invalid proof type or structure
- `ERR_BURN_TOKENOMICS_FAILED`: Burn operation failed
- `ERR_CREATE_API_EVENT_FAILED`: Internal API error
- `ERR_KEY_SCOPES_UNAUTHORIZED`: API key needs burn scope

### Rate Limiting:

- 10 requests per second per API key

### Important Notes:

1. Burns are **non-blocking** - they won't fail user transactions
2. All burns happen from a separate LP wallet
3. Fixed amounts: 1 APES for bets/claims, 5 APES for market creation
4. Idempotency prevents duplicate burns with the same UUID 