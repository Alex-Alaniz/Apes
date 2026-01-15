# Smart Contract Deployment Guide - Multi-Option Betting Update

## What's Changed

### NEW: Multi-Option Betting System
Users can now:
- **Bet on ANY and ALL options** in the same market
- **Add to existing positions** on any option
- **Hold different positions** on multiple options simultaneously
- Support for markets with **2-4 options**

### Technical Changes
1. **PDA Seeds Updated**: `[b"prediction", market, user, option_index]`
2. **Prediction Struct Simplified**: Removed market field (now in PDA)
3. **No more restrictions** on betting different options
4. **Claim rewards per option** with updated claim instruction

## Pre-deployment Steps

1. **Navigate to the smart contract directory:**
   ```bash
   cd src/smart_contracts/market_system
   ```

2. **Build the updated program:**
   ```bash
   anchor build
   ```
   This will compile your Rust code and generate the new program binary.

3. **Run tests (optional but recommended):**
   ```bash
   anchor test
   ```

## Deployment to Devnet

1. **Deploy the program:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```
   
   ⚠️ **IMPORTANT**: This will generate a NEW program ID. Save it!

2. **Update your configuration files with the new program ID:**
   - `src/frontend/src/config/solana.js` - Update the `programId` for devnet
   - `src/frontend/src/config/networks.json` - Update the `programId` for devnet
   - `Anchor.toml` - Update the program ID in the `[programs.devnet]` section

3. **Copy the new IDL to frontend:**
   ```bash
   cp target/idl/market_system.json ../../../src/frontend/src/idl/
   ```

## Post-deployment Steps

1. **Re-initialize the platform** (required because it's a new program):
   ```bash
   cd ../../../scripts
   node initialize-platform.js
   ```

2. **Re-initialize access control:**
   ```bash
   node initialize-access-control.js
   ```

3. **Create new test markets:**
   ```bash
   node create-more-markets.js
   ```

4. **Test multi-option betting:**
   ```bash
   node test-multi-option-betting.js
   ```

## Frontend Updates Required

The frontend needs updates to handle multiple positions:

1. **MarketCard**: Show all user positions (not just one)
2. **Profile Page**: Group positions by market and option
3. **Claim Process**: Allow claiming per option
4. **marketService.js**: Update PDA derivation to include option_index

Example PDA derivation:
```javascript
const [prediction] = PublicKey.findProgramAddressSync(
  [Buffer.from("prediction"), marketPubkey.toBuffer(), userPubkey.toBuffer(), Buffer.from([optionIndex])],
  programId
);
```

## Testing the New Features

1. Place bet on option 0 (e.g., "Yes")
2. Place bet on option 1 (e.g., "No") - should work!
3. Add more to option 0 - should increase position
4. Check all positions are tracked separately

## Migration Notes

- All existing markets and predictions will be lost (new program = new state)
- The new system is NOT compatible with old predictions
- Users can now hedge their bets or spread risk across options

## Frontend Updates

The frontend should work automatically with the new contract. Users will now see:
- "Place Prediction" button for their first bet
- "Add to Position" button if they already have a position

## Testing the New Feature

1. Place an initial bet on a market
2. Try to place another bet on the same option (should work and add to position)
3. Try to place a bet on a different option (should fail with "Cannot change option" error)

## Rollback Instructions

If you need to rollback:
1. Deploy the old program (you'll need the original code)
2. Update all config files with the old program ID
3. Re-initialize platform and markets

## Important Notes

- All existing markets and predictions will be lost (new program = new state)
- Users will need to create new markets and place new predictions
- Make sure to update all references to the old program ID 