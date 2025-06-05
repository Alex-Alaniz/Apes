# Mainnet Deployment Checklist

## Pre-Deployment Requirements

### 1. Token Configuration
- [ ] Verify PRIMEAPE $APES token mint address: `9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts`
- [ ] Determine burn address for BelieveApp integration
- [ ] Set treasury address for platform fees
- [ ] Obtain BelieveApp API key for token burn integration

### 2. Wallet Setup
- [ ] Create deployment wallet with private key backup
- [ ] Fund wallet with ~5 SOL for deployment and testing
- [ ] Create separate wallets for:
  - [ ] Platform authority
  - [ ] Treasury
  - [ ] Test users

### 3. Smart Contract Preparation
- [ ] Update program ID in `lib.rs` with mainnet keypair
- [ ] Update `Anchor.toml` with mainnet configuration
- [ ] Remove any test/debug code
- [ ] Audit smart contract code
- [ ] Test all functions on devnet

### 4. Configuration Updates
- [ ] Update `src/config/networks.json` with mainnet addresses:
  ```json
  "mainnet": {
    "programId": "YOUR_MAINNET_PROGRAM_ID",
    "tokenMint": "9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts",
    "burnAddress": "TO_BE_DETERMINED",
    "treasuryAddress": "YOUR_TREASURY_ADDRESS"
  }
  ```

## Deployment Steps

### 1. Program Deployment
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Check balance
solana balance

# Build program
anchor build

# Deploy program
anchor deploy --program-name market_system --program-keypair target/deploy/market_system-mainnet-keypair.json

# Verify deployment
solana program show YOUR_PROGRAM_ID
```

### 2. Platform Initialization
```bash
# Run initialization script
SOLANA_NETWORK=mainnet node scripts/initialize-platform.js

# Verify initialization
solana account PLATFORM_STATE_PDA --output json
```

### 3. Token Account Setup
- [ ] Create burn token account for BelieveApp
- [ ] Create treasury token account
- [ ] Verify all token accounts have correct ownership

### 4. BelieveApp Integration
- [ ] Configure BelieveApp service with API key
- [ ] Test burn endpoint with small amount
- [ ] Verify burn events are being logged
- [ ] Set up monitoring for burn failures

## Post-Deployment Verification

### 1. Functional Testing
- [ ] Create test market with minimum stake
- [ ] Place small test predictions
- [ ] Resolve test market
- [ ] Claim test rewards
- [ ] Verify token burns are processed

### 2. Security Checks
- [ ] Verify program upgrade authority
- [ ] Check all PDAs have correct seeds
- [ ] Confirm token accounts have proper constraints
- [ ] Test error conditions

### 3. Frontend Integration
- [ ] Update frontend to use mainnet configuration
- [ ] Test wallet connection on mainnet
- [ ] Verify all transactions work correctly
- [ ] Check explorer links point to mainnet

### 4. Monitoring Setup
- [ ] Set up transaction monitoring
- [ ] Configure error alerting
- [ ] Monitor token burn success rate
- [ ] Track platform metrics

## Emergency Procedures

### Rollback Plan
1. Keep devnet deployment active as fallback
2. Document all mainnet addresses and transactions
3. Have emergency pause mechanism ready
4. Maintain communication channels for users

### Known Issues to Monitor
- Token burn API failures
- High transaction volume handling
- Market resolution disputes
- Reward calculation accuracy

## Launch Communication

### Internal Team
- [ ] All team members have mainnet configuration
- [ ] Support team trained on common issues
- [ ] Developers have access to logs

### External Communication
- [ ] Announcement prepared for launch
- [ ] Documentation updated with mainnet info
- [ ] Support channels ready
- [ ] Terms of service updated

## Final Checklist

- [ ] All tests passing on devnet
- [ ] Security audit completed
- [ ] Backup of all keys and configurations
- [ ] Monitoring systems operational
- [ ] Team briefed on launch procedures
- [ ] Emergency contacts available
- [ ] Launch announcement scheduled

## Post-Launch Tasks

### First 24 Hours
- [ ] Monitor all transactions
- [ ] Check burn integration working
- [ ] Verify no unexpected errors
- [ ] Respond to user issues

### First Week
- [ ] Analyze usage patterns
- [ ] Optimize gas usage if needed
- [ ] Gather user feedback
- [ ] Plan first updates

## Important Addresses

```
Mainnet Program ID: [TO BE FILLED]
Platform State PDA: [TO BE FILLED]
Treasury Address: [TO BE FILLED]
Burn Address: [TO BE FILLED]
APES Token Mint: 9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
```

## Contact Information

- Technical Lead: [NAME] - [CONTACT]
- DevOps: [NAME] - [CONTACT]
- Security: [NAME] - [CONTACT]
- BelieveApp Support: [CONTACT] 