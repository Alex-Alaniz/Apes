# 🚀 Final Deployment Checklist - Multi-Option Betting

## Pre-Deployment Verification ✅

### Code Review
- [x] Multi-option betting implemented with separate PDAs per (user, market, option)
- [x] Pool overflow protection added (MAX_POOL_SIZE = 1 billion tokens)
- [x] `init_if_needed` enabled in Cargo.toml
- [x] Smart contract builds successfully
- [x] IDL updated in frontend

### Test Coverage
- [x] Basic multi-option test: `scripts/test-multi-option-betting.js`
- [x] End-to-end test: `scripts/test-e2e-multi-option.js`
- [ ] Run full E2E test with token transfers (requires APES on devnet)

## Deployment Steps 🛠️

### 1. Deploy to Devnet
```bash
cd src/smart_contracts/market_system
anchor build
anchor deploy --provider.cluster devnet
```
**⚠️ Save the new Program ID!**

### 2. Update Configuration Files
Update the new program ID in:
- [ ] `src/frontend/src/config/solana.js`
- [ ] `src/frontend/src/config/networks.json`
- [ ] `src/smart_contracts/market_system/Anchor.toml`

### 3. Copy IDL to Frontend
```bash
cp target/idl/market_system.json ../../../src/frontend/src/idl/
```

### 4. Initialize Platform
```bash
cd ../../../scripts
node initialize-platform.js
```

### 5. Initialize Access Control
```bash
node initialize-access-control.js
```

### 6. Add Market Creators (if needed)
```bash
node add-market-creator.js <creator-pubkey>
```

### 7. Create Test Markets
```bash
node create-more-markets.js
```

### 8. Run Verification Tests
```bash
# Basic multi-option test
node test-multi-option-betting.js

# Full E2E test (requires funded test wallets)
node test-e2e-multi-option.js
```

## Frontend Updates Required 🎨

### 1. MarketCard Component
- [ ] Display all user positions (not just one)
- [ ] Show "Add to Position" for existing bets
- [ ] Show different options user has bet on

### 2. Profile Page
- [ ] Group positions by market
- [ ] Show each option position separately
- [ ] Calculate total exposure per market

### 3. Claim Process
- [ ] Update to claim per option
- [ ] Show claimable options clearly
- [ ] Handle multiple claims per market

### 4. Market Service
- [x] Updated `placeBet` with option_index in PDA
- [x] Updated `claimReward` to accept option_index
- [x] Added `getUserPositionsForMarket` function
- [ ] Update all components using these functions

## Arithmetic Verification 📊

### Expected Behavior
1. **Betting Phase**:
   - Each option maintains separate pool
   - Total pool = sum of all option pools
   - Users can bet on multiple options

2. **Resolution Phase**:
   - Winning pool gets entire total pool
   - Payout = (user_stake / winning_pool_total) * total_pool
   - Fees deducted: creator fee + burn rate

3. **Escrow Balance**:
   - Should approach zero after all claims
   - Remaining = unclaimed rewards + rounding dust

## Security Considerations 🔒

- [x] Pool overflow protection (1B token cap)
- [x] Checked arithmetic throughout
- [x] PDA isolation per (user, market, option)
- [x] Standard Anchor account validation
- [x] `init_if_needed` safe for our use case

## Mainnet Deployment (Future) 🌐

When ready for mainnet:
1. Update token decimals (9 for mainnet APES)
2. Deploy with `--provider.cluster mainnet`
3. Update all configs for mainnet
4. Thoroughly test with small amounts first

## Post-Deployment Monitoring 📈

- Monitor transaction success rates
- Track gas usage per operation
- Verify payout calculations match expectations
- Check for any unexpected errors in logs

## Rollback Plan 🔄

If issues arise:
- Old program remains at original ID
- Frontend can switch back via config
- No user funds at risk (separate programs)

---

**Ready to Deploy? 🎯**
- Run through checklist sequentially
- Test each step before proceeding
- Keep program IDs and transaction hashes documented 