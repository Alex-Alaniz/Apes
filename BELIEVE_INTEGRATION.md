# 🔥 Believe API Integration

## Overview

The platform now integrates with [Believe API](https://docs.believe.app/api-reference/introduction) to burn tokens from a separate LP wallet, instead of deducting burn amounts from user transactions.

## Architecture Changes

### Previous Architecture (3-way split)
```
User Transaction (100 APES)
├── Market Pool: 96.5 APES
├── Burn: 2.5 APES (deducted from user)
└── Platform Fee: 1 APES
```

### New Architecture (2-way split + API burn)
```
User Transaction (100 APES)
├── Market Pool: 96.5 APES
└── Platform Fee: 3.5 APES (includes contract's "burn" fee)

Believe API (separate transaction)
└── Burns fixed amount from LP wallet
```

## Fixed Burn Amounts

Instead of percentage-based burns, we now use fixed amounts:
- **Prediction Bet**: 1 APES per bet
- **Claim Reward**: 1 APES per claim  
- **Market Creation**: 5 APES per market

## Configuration

### Frontend Setup

1. Add your Believe API key to `.env`:
```env
VITE_BELIEVE_API_KEY=your_api_key_here
```

2. The configuration is in `src/frontend/src/config/believe.js`

### Testing the Integration

Run the test script to verify your API key works:
```bash
export BELIEVE_API_KEY=your_api_key_here
node scripts/test-believe-integration.js
```

## How It Works

1. **User places a bet** → Contract does 2-way split (pool + fees)
2. **Frontend calls Believe API** → Burns fixed amount from LP wallet
3. **API returns transaction hash** → Can be displayed to user

## API Features

- **Idempotency**: Prevents duplicate burns with unique keys
- **Proof Schema**: Detailed event data for tracking
- **On-chain Persistence**: Burn proofs stored on blockchain
- **Error Handling**: Non-blocking - API failures don't affect predictions

## Current Status

- ✅ Believe API service implemented
- ✅ Fixed burn amounts configured
- ✅ Integration in PredictionModal
- ✅ Test script available
- ⏳ Contract still does 3-way split (workaround: "burn" goes to treasury)

## Next Steps

1. Get API key from https://believe.app/projects
2. Enable "burn" scope on your API key
3. Set `VITE_BELIEVE_API_KEY` in frontend `.env`
4. Test on devnet with small burns
5. Monitor burns in Believe dashboard

## Important Notes

- The smart contract still deducts 2.5% "burn" fee (goes to treasury)
- Real burns happen via API from separate LP wallet
- API calls are non-blocking - won't fail user transactions
- Devnet testing is fully supported 