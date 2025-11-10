# 🎯 PRIMAPE Comprehensive End-to-End Testing Guide

## 🚀 **Overview**
This guide walks through the complete end-to-end testing flow for PRIMAPE prediction markets platform, covering everything from user onboarding to Polymarket integration.

## 📋 **Pre-Testing Setup**

### 1. Clean Database
```bash
# Run database cleanup (backup first if needed)
psql $DATABASE_URL -f clean-database-for-qa.sql
```

### 2. Environment Setup
```bash
# Ensure all services are running
./run-dev.sh
```

### 3. Update Frontend Environment
```bash
# Ensure frontend has correct API URL
echo "VITE_API_URL=http://localhost:5001" > src/frontend/.env
```

## 🧪 **Testing Phases**

### **Phase 1: User Authentication & Profiles**
- [ ] Connect Phantom wallet
- [ ] Connect Solflare wallet  
- [ ] Verify user creation in database
- [ ] Test username setting
- [ ] Test Twitter linking (X OAuth)
- [ ] Verify public profile pages work

### **Phase 2: Market Creation & Management**
- [ ] Admin access control verification
- [ ] Create binary Yes/No market
- [ ] Create multi-option market (3-4 options)
- [ ] Add market assets (banners, icons)
- [ ] Test market validation
- [ ] Verify markets appear on frontend

### **Phase 3: Prediction Flow**
- [ ] Place predictions on binary markets
- [ ] Place predictions on multi-option markets
- [ ] Test minimum bet validation
- [ ] Test wallet balance checks
- [ ] Verify position tracking
- [ ] Test multiple predictions by same user

### **Phase 4: Market Display & Statistics**
- [ ] Market cards display correctly
- [ ] Percentages update in real-time
- [ ] Volume calculations correct
- [ ] User positions show accurately
- [ ] Market detail pages work
- [ ] Mobile responsiveness

### **Phase 5: Market Resolution**
- [ ] Admin can resolve markets
- [ ] Winners can claim rewards
- [ ] Losers cannot claim
- [ ] Payout calculations correct
- [ ] User stats update (win rate, profit)
- [ ] Leaderboard updates

### **Phase 6: Leaderboard & Rankings**
- [ ] Users appear after predictions
- [ ] Profit rankings correct
- [ ] Accuracy rankings correct
- [ ] Volume rankings correct
- [ ] Twitter profiles display
- [ ] Public profile links work

### **Phase 7: Engage-to-Earn**
- [ ] Twitter account linking
- [ ] Point accumulation system
- [ ] Activity tracking
- [ ] Reward calculations
- [ ] Airdrop eligibility
- [ ] Engagement leaderboard

### **Phase 8: Polymarket Integration**
- [ ] Connect to Polymarket database
- [ ] Fetch deployable markets
- [ ] Validate market data
- [ ] Deploy to Solana
- [ ] Asset integration
- [ ] Cross-platform sync

### **Phase 9: Error Handling & Security**
- [ ] Invalid transaction handling
- [ ] Insufficient balance scenarios
- [ ] Network error recovery
- [ ] XSS prevention
- [ ] Authorization checks
- [ ] Input validation

### **Phase 10: Performance & Load Testing**
- [ ] Concurrent user predictions
- [ ] Real-time updates
- [ ] Database performance
- [ ] API response times
- [ ] Frontend load times

## 🔧 **Testing Scripts Available**

### Quick Tests
```bash
# Test core functionality
node scripts/test_core_functionality.js

# Test multi-wallet flow
node scripts/test-multi-wallet-flow.js

# Test simple claim flow
node scripts/test-simple-claim-flow.js
```

### Market Management
```bash
# Create test markets
node scripts/create-test-market.js

# Check market status
node scripts/check-markets.js

# List market status
node scripts/list-markets-status.js
```

### Polymarket Integration
```bash
# Check Polymarket database
node scripts/check-polymarket-db.js

# Deploy markets from Polymarket
node scripts/polymarket-to-solana-integration.js

# Test validated markets
node scripts/test-validated-markets.js
```

### Full End-to-End
```bash
# Complete E2E test
node scripts/full-test-flow.js

# Multi-option E2E test
node scripts/test-e2e-multi-option.js
```

## 📊 **Key Metrics to Track**

### User Metrics
- Total registered users
- Daily active users
- Twitter linking rate
- Profile completion rate

### Market Metrics
- Total markets created
- Average predictions per market
- Market resolution rate
- Creator stake amounts

### Financial Metrics
- Total volume traded
- Average bet sizes
- Platform fees collected
- Burn amounts
- Reward payouts

### Engagement Metrics
- Points earned
- Twitter interactions
- Leaderboard participation
- Airdrop claims

## 🚨 **Critical Success Criteria**

### Must Pass
- [ ] All wallet connections work
- [ ] Predictions place successfully
- [ ] Rewards claim correctly
- [ ] No funds lost or stuck
- [ ] Leaderboard accurate
- [ ] Public profiles accessible

### Performance Requirements
- [ ] Market list loads < 3 seconds
- [ ] Prediction modal opens < 1 second
- [ ] Real-time updates < 2 seconds
- [ ] Mobile responsive on all screens

### Security Requirements
- [ ] Admin functions restricted
- [ ] User can only access own data
- [ ] Input validation prevents exploits
- [ ] No XSS vulnerabilities

## 🎯 **Post-Testing Checklist**

### Documentation
- [ ] Update README with findings
- [ ] Document any known issues
- [ ] Create user guide
- [ ] Update API documentation

### Deployment Preparation
- [ ] Environment variables documented
- [ ] Monitoring setup configured
- [ ] Backup procedures tested
- [ ] Roll-back plan ready

## 🔄 **Continuous Testing**

### Daily Checks
- [ ] All services running
- [ ] No error logs
- [ ] Database connectivity
- [ ] RPC endpoint healthy

### Weekly Validation
- [ ] Full test suite run
- [ ] Performance benchmarks
- [ ] Security scan
- [ ] Backup verification

---

## 📞 **Support Contacts**

- **Development Team**: [Team Contact]
- **QA Lead**: [QA Contact]  
- **Infrastructure**: [Infra Contact]

---

**Testing Date**: _______________
**Tester**: _______________
**Environment**: Solana Devnet
**Contract**: FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib
**Status**: [ ] PASS [ ] FAIL

### Issues Found:
1. ✅ Fixed: Leaderboard Twitter display
2. ✅ Fixed: Public profile routing
3. 

### Next Steps:
1. Complete Phase 1 testing
2. Monitor performance metrics
3. Document integration flow 