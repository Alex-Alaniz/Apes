# Polymarket Wallet Architecture

## Overview

This document outlines the wallet architecture for APES' Polymarket integration, addressing security, scalability, and user experience considerations.

## Current Architecture vs. Recommended Architecture

### Current Implementation (Proxy Wallet System)

```
User (Solana Wallet) → APES Platform → Proxy Wallet (Polygon) → Polymarket
```

**Pros:**
- Simple user experience (no Polygon wallet needed)
- Platform controls order execution
- Fee collection is automatic

**Cons:**
- Platform holds user funds temporarily
- Regulatory considerations
- Single point of failure

### Recommended: Hybrid Architecture

```
Option 1: Direct Trading (Power Users)
User (Polygon Wallet) → APES Platform (Read-only) → Polymarket

Option 2: Managed Trading (Casual Users)
User (Solana Wallet) → APES Platform → Dedicated Proxy Wallet → Polymarket
```

## Implementation Strategy

### Phase 1: Admin Trading (Current)

Use a single admin wallet for initial testing and market making:

```javascript
// Admin wallet for market operations
const adminWallet = new ethers.Wallet(process.env.ADMIN_POLYGON_PRIVATE_KEY);

// Use for:
// - Creating initial liquidity
// - Testing order flow
// - Market making activities
```

### Phase 2: User Proxy Wallets

Create dedicated proxy wallets per user:

```javascript
// Generate user-specific proxy wallet
async function createUserProxyWallet(userId) {
  // Generate deterministic wallet from seed
  const seed = `${process.env.WALLET_SEED}_${userId}`;
  const wallet = ethers.Wallet.fromMnemonic(
    ethers.utils.entropyToMnemonic(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes(seed))
    )
  );
  
  // Store encrypted in database
  const encrypted = await encryptWallet(wallet);
  await saveProxyWallet(userId, encrypted);
  
  return wallet;
}
```

### Phase 3: Direct Integration

Allow users to connect their own Polygon wallets:

```javascript
// Frontend: Add Polygon wallet connection
const polygonChainId = 137;

// Add to wallet adapter config
const wallets = [
  // Existing Solana wallets...
  new MetaMaskWalletAdapter({ chainId: polygonChainId }),
  new WalletConnectAdapter({ chainId: polygonChainId })
];

// Backend: Verify ownership
async function verifyPolygonWallet(address, signature) {
  const message = `Connect to APES Platform\nTimestamp: ${Date.now()}`;
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

## Security Considerations

### 1. Key Management

**Development:**
```env
# Single admin wallet for testing
ADMIN_POLYGON_PRIVATE_KEY=dev-private-key
```

**Production:**
```env
# Encrypted master seed for proxy wallets
WALLET_MASTER_SEED=encrypted-seed
WALLET_ENCRYPTION_KEY=separate-encryption-key

# Optional: Hardware Security Module (HSM)
USE_HSM=true
HSM_API_ENDPOINT=https://hsm.provider.com
```

### 2. Fund Management

**Proxy Wallet Funding:**
```javascript
// Automatic funding when balance is low
async function maintainProxyBalance(walletAddress) {
  const balance = await getUSDCBalance(walletAddress);
  const minBalance = ethers.utils.parseUnits('10', 6); // 10 USDC
  
  if (balance.lt(minBalance)) {
    // Transfer from hot wallet
    await transferUSDC(
      process.env.HOT_WALLET_ADDRESS,
      walletAddress,
      ethers.utils.parseUnits('50', 6) // Top up with 50 USDC
    );
  }
}
```

**Fund Segregation:**
```
Cold Storage (90% of platform funds)
    ↓
Hot Wallet (Operational funds)
    ↓
Proxy Wallets (User trading funds)
```

### 3. Transaction Security

```javascript
// Implement transaction limits
const DAILY_LIMIT_USDC = 1000;
const SINGLE_TX_LIMIT_USDC = 100;

async function validateTransaction(userId, amount) {
  const dailyVolume = await getDailyVolume(userId);
  
  if (amount > SINGLE_TX_LIMIT_USDC) {
    throw new Error('Transaction exceeds single transaction limit');
  }
  
  if (dailyVolume + amount > DAILY_LIMIT_USDC) {
    throw new Error('Transaction exceeds daily limit');
  }
  
  return true;
}
```

## Migration Path

### Step 1: Enable Admin Trading
```bash
# Generate admin wallet
node scripts/setup-polymarket-credentials.js

# Fund with USDC on Polygon
# Start with small amounts for testing
```

### Step 2: Test Order Flow
```javascript
// Test with minimal amounts
const testOrder = {
  tokenId: 'market-token-id',
  side: 'BUY',
  price: 0.50,
  size: 1 // 1 USDC
};
```

### Step 3: Enable User Trading
1. Create proxy wallet generation system
2. Implement funding mechanisms
3. Add security controls
4. Enable for beta users
5. Scale to all users

### Step 4: Direct Wallet Support
1. Add Polygon wallet adapters to frontend
2. Implement wallet verification
3. Create hybrid order routing
4. Enable for power users

## Compliance Considerations

### KYC/AML Requirements

**Option 1: Platform KYC**
```javascript
// Require KYC for trading features
async function enableTrading(userId) {
  const kycStatus = await checkKYCStatus(userId);
  
  if (kycStatus.verified) {
    await createUserProxyWallet(userId);
    await setTradingEnabled(userId, true);
  }
}
```

**Option 2: Threshold-Based**
```javascript
// KYC only for high-volume traders
const KYC_THRESHOLD_USDC = 2000;

async function checkKYCRequirement(userId) {
  const totalVolume = await getUserTotalVolume(userId);
  return totalVolume > KYC_THRESHOLD_USDC;
}
```

### Geographic Restrictions

```javascript
// Implement geo-blocking if required
const RESTRICTED_COUNTRIES = ['US', 'CN']; // Example

async function checkGeoRestrictions(req) {
  const country = getCountryFromIP(req.ip);
  
  if (RESTRICTED_COUNTRIES.includes(country)) {
    throw new Error('Service not available in your region');
  }
}
```

## Recommended Implementation Timeline

### Week 1-2: Admin Testing
- Generate admin wallet
- Fund with test amounts
- Verify order flow
- Test error handling

### Week 3-4: Proxy Wallet System
- Implement secure wallet generation
- Create funding mechanisms
- Add transaction limits
- Test with team accounts

### Week 5-6: Beta Launch
- Enable for select users
- Monitor performance
- Gather feedback
- Refine security controls

### Week 7-8: Production Launch
- Enable for all users
- Implement monitoring
- Add automated alerts
- Scale infrastructure

## Monitoring and Alerts

```javascript
// Monitor wallet balances
setInterval(async () => {
  const wallets = await getAllProxyWallets();
  
  for (const wallet of wallets) {
    const balance = await getUSDCBalance(wallet.address);
    
    if (balance.lt(MIN_OPERATIONAL_BALANCE)) {
      await sendAlert('Low wallet balance', {
        wallet: wallet.address,
        balance: balance.toString(),
        userId: wallet.userId
      });
    }
  }
}, 60000); // Check every minute
```

## Cost Considerations

### Polygon Transaction Costs
- Average tx cost: ~$0.01 MATIC
- Order placement: 1 transaction
- Order cancellation: 1 transaction
- Fund transfer: 1 transaction

### Operational Costs
- Maintain ~0.1 MATIC per wallet
- Maintain operational USDC buffer
- Consider bulk funding to save on gas

## Conclusion

The recommended approach is to start with admin-controlled trading for testing, then gradually roll out proxy wallets for users while building toward direct wallet integration. This provides the best balance of:

1. **Security**: Funds are segregated and limits are enforced
2. **User Experience**: Users can trade without managing Polygon wallets
3. **Scalability**: System can grow from admin to thousands of users
4. **Compliance**: KYC/AML can be implemented as needed
5. **Flexibility**: Users can eventually use their own wallets

The key is to start simple, test thoroughly, and scale gradually while maintaining security and compliance standards.