# 💰 Treasury Wallet Configuration

## Overview

The platform uses two separate treasury wallets on mainnet to properly manage different types of fees:

### Treasury Addresses

#### Mainnet Addresses (MUST BE USED IN PRODUCTION)
- **PRIMAPE Treasury**: `APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z`
  - Receives: Contract fees (2.5% from bets, 1.5% from claims)
  - Purpose: PRIMAPE ecosystem development

- **Community Treasury**: `APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2`
  - Receives: Platform fees (1% from all bets)
  - Purpose: Community initiatives and platform operations

#### Devnet Address (FOR TESTING ONLY)
- **All Fees**: `4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS`
  - Used for all treasury functions during development

## Fee Distribution

### When Placing Predictions (100 APES example)
```
User Pays: 100 APES
├── Market Pool: 96.5 APES (goes to escrow for winners)
├── Platform Fee (1%): 1 APES → Community Treasury
└── Contract Fee (2.5%): 2.5 APES → PRIMAPE Treasury*
```

*Note: Due to current smart contract limitations, all fees go to a single address. On mainnet, this will be the PRIMAPE Treasury address.

### When Claiming Rewards
```
Gross Reward: X APES
├── User Receives: X - 1.5% APES
└── Contract Fee (1.5%): → PRIMAPE Treasury
```

## Configuration Files

### Frontend (src/frontend/src/config/solana.js)
```javascript
mainnet: {
  // ... other config
  primeapeTreasury: "APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z",
  communityTreasury: "APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2"
}
```

### Backend (.env)
```env
# Mainnet Treasury Addresses
PRIMAPE_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z
COMMUNITY_TREASURY=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpMBPWwJKGi2
```

## Important Notes

1. **DO NOT** use test addresses on mainnet - always use the official treasury addresses
2. The smart contract currently sends all fees to one address (limitation to be fixed in v2)
3. Platform initialization must use the PRIMAPE Treasury as the main treasury address
4. Believe API burns happen separately from a liquidity pool wallet

## Verification

Always verify treasury addresses before mainnet deployment:
1. Check that `platformFeeAddress` points to the correct treasury
2. Ensure initialization scripts use proper addresses
3. Verify in Solana Explorer that fees are going to correct wallets

## Future Improvements

In the next smart contract version, we plan to:
- Separate platform fees and contract fees to different addresses
- Remove the "burn" fee from user transactions (use Believe API only)
- Add configurable treasury addresses without redeployment 