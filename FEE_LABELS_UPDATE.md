# 🏷️ Fee Label Updates

## Overview

Updated the frontend to display clearer labels for what each fee is used for, both when placing predictions and claiming rewards.

## Fee Structure Display

### When Placing Predictions

```
Platform Fee (1%): 1.00 APES → Community Treasury
Contract Fee (2.5%): 2.50 APES → PRIMAPE
Believe Burn (Fixed): 1 APES 🔥 → Token Burn
---
You'll contribute: 96.50 APES
```

### When Claiming Rewards

```
Gross Reward: 115.50 APES
Contract Fee (1.5%): -1.73 APES → PRIMAPE
Believe Burn (Fixed): 1 APES 🔥 → Token Burn
---
You'll receive: +113.77 APES
```

## Files Modified

1. **PredictionModal.jsx**
   - Enhanced fee breakdown with destination labels
   - Added note that Believe burn applies to claims too
   - Improved visual hierarchy with colors

2. **ClaimRewardModal.jsx** (New)
   - Created dedicated modal for claiming rewards
   - Shows all fees before confirming claim
   - Integrates Believe API burn call

3. **ProfilePage.jsx**
   - Updated to use ClaimRewardModal
   - Removed direct claim function
   - Better UX with preview before claiming

## Fee Destinations

- **Community Treasury**: Platform fees support the ecosystem
- **PRIMAPE**: Contract fees (currently go to treasury address)
- **Token Burn**: Fixed amount burned via Believe API from LP wallet

## Notes

- The contract still performs a 3-way split (pool + burn + fee)
- The "burn" from contract goes to treasury as a workaround
- Real burns happen via Believe API from separate LP wallet
- Burns are non-blocking - failures don't affect transactions 