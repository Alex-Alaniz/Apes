# Mainnet Launch Checklist - MVP Fast Track

## 🚨 CRITICAL FIXES ONLY (Must Have for Mainnet)

### 1. **Prevent Fund Lock** ✅ Priority 1
- [x] ✅ Fix division by zero in claim_reward (DONE)
- [ ] ❌ Ensure all tokens can be withdrawn/claimed
- [ ] ❌ Add emergency withdrawal mechanism
- [ ] ❌ Test all exit paths for funds

### 2. **Access Control** 🔒 Priority 1
- [ ] ❌ Add authority check to resolve_market
- [ ] ❌ Add authority check to cancel_market
- [ ] ❌ Verify market creator whitelist working
- [ ] ❌ Test unauthorized access attempts

### 3. **Prevent Fund Loss** 💰 Priority 1
- [x] ✅ Pool overflow protection (DONE)
- [x] ✅ Arithmetic overflow in rewards (DONE)
- [ ] ❌ Verify escrow balance before transfers
- [ ] ❌ Add reentrancy protection

---

## 🎯 FAST TRACK PLAN (2-3 Days)

### Day 1: Critical Smart Contract Fixes
```rust
// 1. Add authority checks to resolve_market
require!(ctx.accounts.resolver.key() == market.authority, ErrorCode::Unauthorized);

// 2. Add authority checks to cancel_market  
require!(ctx.accounts.authority.key() == market.authority, ErrorCode::Unauthorized);

// 3. Add emergency withdrawal (circuit breaker)
pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()>
```

### Day 2: Testing & Verification
- [ ] Test fund flow end-to-end
- [ ] Test all claim scenarios
- [ ] Test authority restrictions
- [ ] Simulate attack scenarios

### Day 3: Final Deployment
- [ ] Deploy to mainnet
- [ ] Verify all functions
- [ ] Set conservative limits
- [ ] Monitor first transactions

---

## ⚡ QUICK FIXES SCRIPT

```bash
# 1. Fix critical issues
./scripts/fix-critical-security.sh

# 2. Run safety tests
./scripts/test-fund-safety.sh

# 3. Deploy to mainnet
./scripts/deploy-mainnet.sh
```

---

## 🛡️ MAINNET SAFETY SETTINGS

### Initial Conservative Limits:
- Max bet per user: 10,000 APES
- Max pool size: 1,000,000 APES  
- Creator fee cap: 5%
- Platform fee: 1%

### Post-Launch Iterations:
1. Week 1: Monitor and fix any issues
2. Week 2: Increase limits gradually
3. Week 3: UI/UX improvements
4. Week 4: Add advanced features

---

## ✅ Pre-Launch Verification

### Fund Safety Tests:
```javascript
- [ ] Can users always claim winnings?
- [ ] Can users withdraw if market cancelled?
- [ ] Are all fees calculated correctly?
- [ ] Do pools add up correctly?
```

### Access Control Tests:
```javascript
- [ ] Only authority can resolve?
- [ ] Only authority can cancel?
- [ ] Only whitelisted can create markets?
- [ ] Users can only claim their own rewards?
```

---

## 🚀 GO/NO-GO Criteria

**GO if all checked:**
- [ ] No funds can be locked
- [ ] No unauthorized access possible
- [ ] All arithmetic is safe
- [ ] Emergency withdrawal works
- [ ] Basic tests pass

**NO-GO if any:**
- [ ] Funds can get stuck
- [ ] Anyone can resolve markets
- [ ] Arithmetic overflows possible
- [ ] No emergency exit

---

## 📝 Post-Launch TODO

1. **Week 1-2: Stability**
   - Monitor all transactions
   - Fix any edge cases
   - Gather user feedback

2. **Week 3-4: UI/UX**
   - Beautiful landing page
   - Smooth animations
   - Mobile optimization
   - Better wallet integration

3. **Month 2: Features**
   - Advanced market types
   - Social features
   - Analytics dashboard
   - Liquidity incentives 