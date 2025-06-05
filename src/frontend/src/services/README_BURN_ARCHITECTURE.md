# Token Burn Architecture

## Overview

The prediction market platform uses a two-tier approach for handling token burns:

1. **On-chain Platform Fees**: Transaction fees are collected as platform fees and sent to the treasury address
2. **Off-chain Token Burns**: Actual token burns are handled via Believe App's API to reduce blockchain complexity

## Token Decimals Configuration

**CRITICAL**: Each network uses different decimals for the APES token:
- **Devnet**: 6 decimals (Mock APES)
- **Mainnet**: 9 decimals (PRIMEAPE)

This ensures that when a user enters "10" in the UI, exactly 10 tokens are deducted from their wallet, regardless of network. The system automatically:
1. Fetches the actual decimals from the token mint
2. Converts UI amounts to the correct on-chain units
3. Verifies the configuration matches the actual mint

⚠️ **Never hardcode decimal conversions** - always use the utility functions in `tokenUtils.js`

## Network-Specific Behavior

### Devnet
- Platform fees (2.5%) are collected and sent to the treasury address
- **Off-chain burns are DISABLED** - the Believe API is mainnet-only
- Perfect for testing without API requirements

### Mainnet
- Platform fees (2.5%) are collected and sent to the treasury address
- Off-chain burns are ENABLED via Believe API
- **Requires** `VITE_BELIEVE_API_KEY` in environment variables

## On-chain Flow

When a user places a prediction:
1. 2.5% of the bet amount is calculated as the platform fee
2. This fee is transferred to the platform treasury address (`platformFeeAddress` in config)
3. The remaining amount goes to the market escrow for the prediction

## Off-chain Burn Process

The actual token burns happen through Believe's API ([docs](https://docs.believe.app/api-reference/endpoint/tokenomics/burn)):

### When to Burn
- **Immediately**: After each prediction is placed (if real-time burning is desired)
- **Batched**: Accumulate fees and burn daily/weekly to reduce API calls
- **On Resolution**: Burn accumulated fees when markets are resolved

### API Integration

```javascript
import believeApiService from './believeApiService';

// Example: Burn platform fees after a prediction
// This will be a no-op on devnet, only runs on mainnet
const burnResult = await believeApiService.burnPlatformFees(
  marketId,
  platformFeeAmount,
  transactionHash
);

// Example: Burn fees on market resolution
// This will be a no-op on devnet, only runs on mainnet
const burnResult = await believeApiService.burnMarketResolutionFees(
  marketId,
  winningOption,
  totalFeesCollected,
  resolutionTxHash
);
```

### Environment Variables

For **mainnet** deployment, add to your `.env` file:
```
VITE_BELIEVE_API_KEY=your_believe_api_key_here
VITE_SOLANA_NETWORK=mainnet
```

For **devnet** testing (default):
```
VITE_SOLANA_NETWORK=devnet
# No API key needed - burns are disabled
```

### Proof Types

The platform uses these proof types for burns:
- `PREDICTION_FEE`: Platform fees from predictions
- `MARKET_RESOLUTION`: Fees collected during market resolution

### Benefits

1. **No Failed Transactions**: Users don't need burn token accounts
2. **Flexible Burn Strategy**: Can batch burns or burn immediately
3. **Audit Trail**: Believe API provides on-chain proof of burns (mainnet only)
4. **Treasury Management**: Platform fees accumulate in treasury for operational costs
5. **Easy Testing**: Devnet testing works without API dependencies

## Migration Notes

Previous implementation attempted to burn tokens directly on-chain by sending to a burn address. This failed because:
- The burn address was set to the system program (not a valid token account)
- Creating a proper burn would require complex SPL token burn instructions

The new approach is cleaner and more maintainable. 