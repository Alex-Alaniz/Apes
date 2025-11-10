# Smart Contract Limitation

## Current Limitation: One Prediction Per User Per Market

The Solana prediction market smart contract currently **only allows one prediction per user per market**. This means:
- A user can only place ONE bet on each market
- They cannot add to their position later
- They cannot change their prediction option
- **Different users CAN bet on the same market** ✅

## Why This Happens

The smart contract uses the `init` constraint in the `PlacePrediction` instruction:

```rust
#[account(
    init,  // <-- This creates a NEW account, fails if it already exists
    payer = user,
    space = 8 + Prediction::LEN,
    seeds = [b"prediction", market.key().as_ref(), user.key().as_ref()],
    bump
)]
pub prediction: Account<'info, Prediction>,
```

The prediction account is derived from `[prediction, market, user]` which means there can only be one unique prediction account per user-market combination.

## Smart Contract Location

Your Solana smart contract (Rust/Anchor) is located at:
```
src/smart_contracts/market_system/programs/market_system/src/lib.rs
```

The `place_prediction` instruction starts around line 520.

## How to Fix This

### Option 1: Update Existing Prediction (Recommended)
Change the `place_prediction` instruction to:
1. Use `init_if_needed` instead of `init`
2. If prediction exists, add to the existing amount
3. Handle the case where user wants to bet on a different option

### Option 2: Multiple Prediction Accounts
1. Add a counter to the prediction seeds: `[b"prediction", market, user, counter]`
2. Track how many predictions each user has per market
3. More complex but allows full history

### Option 3: Single Updateable Position
1. Change `init` to `mut` for existing predictions
2. Allow users to update their position amount
3. Simpler but loses prediction history

## Deployment Steps

After modifying the smart contract, you'll need to:
1. Build the new program: `anchor build`
2. Deploy to devnet: `anchor deploy`
3. Update the frontend IDL with the new version
4. The program ID will change, so update all frontend configurations

## Current Program Details
- **Program ID**: `FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib`
- **Network**: Devnet
- **Token**: APES (6 decimals on devnet) 