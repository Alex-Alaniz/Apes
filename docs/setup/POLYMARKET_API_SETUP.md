# Polymarket API Setup Guide

*Last Updated: January 2025*

## Overview

This guide provides step-by-step instructions for obtaining and configuring Polymarket API credentials for the APES platform integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting API Credentials](#getting-api-credentials)
3. [Storing Credentials Securely](#storing-credentials-securely)
4. [Implementation Guide](#implementation-guide)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

## Prerequisites

### 1. Polygon Wallet Setup

You need a Polygon (MATIC) wallet to interact with Polymarket's CLOB:

```bash
# Using ethers.js to create a new wallet
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
```

**Important**: Save these credentials securely. You'll need:
- **Private Key**: For L1 authentication and generating API keys
- **Address**: For all API requests

### 2. Fund Your Wallet

For production trading, you'll need:
- **MATIC**: For gas fees on Polygon
- **USDC**: For placing orders (Polymarket uses USDC on Polygon)

### 3. Technical Requirements

- Node.js 16+ or Python 3.8+
- ethers.js for wallet management
- WebSocket support for real-time updates

## Getting API Credentials

### Step 1: Generate API Keys Using L1 Authentication

Create a script to generate your API credentials:

```javascript
// scripts/generate-polymarket-credentials.js
const { ethers } = require('ethers');
const axios = require('axios');

const CLOB_URL = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon Mainnet

async function generateAPIKeys() {
  // Load your Polygon wallet
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey);
  
  // Create EIP-712 domain
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: CHAIN_ID
  };
  
  // Create auth message
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 0;
  
  const types = {
    ClobAuth: [
      { name: 'address', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' }
    ]
  };
  
  const value = {
    address: wallet.address,
    timestamp: timestamp,
    nonce: nonce,
    message: 'Generate API Key'
  };
  
  // Sign the message
  const signature = await wallet._signTypedData(domain, types, value);
  
  // Request API keys
  try {
    const response = await axios.post(`${CLOB_URL}/auth/api-key`, {}, {
      headers: {
        'POLY_ADDRESS': wallet.address,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp.toString(),
        'POLY_NONCE': nonce.toString()
      }
    });
    
    console.log('API Credentials Generated:');
    console.log('API Key:', response.data.apiKey);
    console.log('API Secret:', response.data.secret);
    console.log('Passphrase:', response.data.passphrase);
    
    return response.data;
  } catch (error) {
    console.error('Error generating API keys:', error.response?.data || error.message);
    throw error;
  }
}

// Run the script
generateAPIKeys()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

Run the script:
```bash
# Set your private key
export POLYGON_PRIVATE_KEY="your-polygon-private-key"

# Generate credentials
node scripts/generate-polymarket-credentials.js
```

### Step 2: Using Polymarket's Official Clients (Recommended)

For production, use Polymarket's official client libraries which handle authentication automatically:

```bash
# TypeScript/JavaScript
npm install @polymarket/clob-client

# Python
pip install py-clob-client
```

## Storing Credentials Securely

### 1. Environment Variables

Update your `.env` file:

```env
# Polymarket Configuration
POLYMARKET_PRIVATE_KEY=your-polygon-private-key
POLYMARKET_ADDRESS=your-polygon-address
POLYMARKET_API_KEY=generated-api-key
POLYMARKET_API_SECRET=generated-api-secret
POLYMARKET_PASSPHRASE=generated-passphrase

# Optional: Separate trading wallet
POLYMARKET_TRADING_PRIVATE_KEY=separate-trading-wallet-key
```

### 2. Encrypted Storage

For production, encrypt sensitive credentials:

```javascript
// Use the existing encryption service
const { getEncryptionService } = require('./backend/utils/encryption');
const encryptionService = getEncryptionService();

// Encrypt credentials
const encryptedKey = encryptionService.encrypt(privateKey);
const encryptedSecret = encryptionService.encrypt(apiSecret);

// Store encrypted values in database
await db.query(
  'INSERT INTO polymarket_credentials (user_id, encrypted_key, encrypted_secret) VALUES ($1, $2, $3)',
  [userId, encryptedKey, encryptedSecret]
);
```

### 3. Multi-Wallet Architecture

For the APES proxy service, implement a wallet hierarchy:

```
Main Platform Wallet (Admin)
  ├── API Generation Wallet (L1 Auth)
  ├── Trading Wallet 1 (User Proxy)
  ├── Trading Wallet 2 (User Proxy)
  └── Trading Wallet N (User Proxy)
```

## Implementation Guide

### 1. Update CLOB Service Configuration

```javascript
// backend/services/polymarketClobService.js
const POLYMARKET_CONFIG = {
  CLOB_URL: process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com',
  WS_URL: process.env.POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/',
  CHAIN_ID: 137, // Polygon Mainnet
  DATA_API_URL: 'https://data-api.polymarket.com'
};
```

### 2. Initialize with Credentials

```javascript
// backend/server.js - Add to startup sequence
const polymarketClobService = require('./services/polymarketClobService');

// Initialize Polymarket CLOB
if (process.env.POLYMARKET_API_KEY && process.env.POLYMARKET_API_SECRET) {
  try {
    await polymarketClobService.initialize(
      process.env.POLYMARKET_API_KEY,
      process.env.POLYMARKET_API_SECRET,
      process.env.POLYMARKET_PASSPHRASE
    );
    console.log('✅ Polymarket CLOB initialized');
  } catch (error) {
    console.error('Failed to initialize Polymarket CLOB:', error);
  }
}
```

### 3. WebSocket Authentication

Update the WebSocket connection to include credentials:

```javascript
// backend/services/polymarketClobService.js
authenticate() {
  const authMessage = {
    type: 'auth',
    auth: {
      apikey: this.apiKey,
      secret: this.apiSecret,
      passphrase: this.passphrase
    }
  };
  
  this.sendMessage(authMessage);
}
```

## Testing the Integration

### 1. Test Connection

```bash
# Run the CLOB test script
node backend/scripts/test-polymarket-clob.js
```

### 2. Test Order Placement (Testnet)

```javascript
// scripts/test-polymarket-order.js
const clobService = require('../backend/services/polymarketClobService');

async function testOrder() {
  // Initialize
  await clobService.initialize(
    process.env.POLYMARKET_API_KEY,
    process.env.POLYMARKET_API_SECRET,
    process.env.POLYMARKET_PASSPHRASE
  );
  
  // Test market ID (use a real one from Polymarket)
  const testMarketId = '0x...'; // Get from Polymarket UI
  
  // Create a small test order
  const testOrder = {
    tokenId: testMarketId,
    side: 'BUY',
    price: 0.50,
    size: 1, // 1 USDC
    orderType: 0 // GTC
  };
  
  try {
    const result = await clobService.createAndSubmitOrder(testOrder);
    console.log('Test order placed:', result);
  } catch (error) {
    console.error('Order placement failed:', error);
  }
}

testOrder();
```

## Troubleshooting

### Common Issues

1. **"Invalid signature" errors**
   - Ensure timestamps are in seconds (not milliseconds)
   - Verify the correct chain ID (137 for Polygon)
   - Check that private key matches the address

2. **"Insufficient balance" errors**
   - Check USDC balance on Polygon
   - Verify correct token approval

3. **WebSocket connection issues**
   - Check firewall/proxy settings
   - Verify WebSocket URL is accessible
   - Implement reconnection logic

### Debug Mode

Enable debug logging:

```javascript
// Add to polymarketClobService.js
const DEBUG = process.env.POLYMARKET_DEBUG === 'true';

if (DEBUG) {
  console.log('Request headers:', headers);
  console.log('Signature:', signature);
  console.log('Timestamp:', timestamp);
}
```

## Security Best Practices

### 1. Credential Rotation

Implement regular credential rotation:

```javascript
// Rotate API keys monthly
async function rotateAPIKeys() {
  // Generate new keys
  const newCredentials = await generateAPIKeys();
  
  // Update encrypted storage
  await updateStoredCredentials(newCredentials);
  
  // Gracefully transition services
  await transitionToNewCredentials(newCredentials);
  
  // Revoke old keys after transition
  await revokeOldAPIKeys();
}
```

### 2. Access Control

Limit API key permissions:
- Read-only keys for market data
- Trading keys with spending limits
- Admin keys stored offline

### 3. Monitoring

Implement comprehensive monitoring:

```javascript
// Log all API requests
const logAPIRequest = async (method, endpoint, userId) => {
  await db.query(
    'INSERT INTO polymarket_api_logs (method, endpoint, user_id, timestamp) VALUES ($1, $2, $3, $4)',
    [method, endpoint, userId, new Date()]
  );
};

// Monitor for suspicious activity
const checkSuspiciousActivity = async (userId) => {
  const recentRequests = await db.query(
    'SELECT COUNT(*) FROM polymarket_api_logs WHERE user_id = $1 AND timestamp > NOW() - INTERVAL \'1 minute\'',
    [userId]
  );
  
  if (recentRequests.rows[0].count > 100) {
    await alertAdmins('Suspicious API activity detected', { userId });
  }
};
```

### 4. Environment Separation

Use different credentials for each environment:

```env
# Development
POLYMARKET_API_KEY_DEV=dev-key
POLYMARKET_API_SECRET_DEV=dev-secret

# Staging
POLYMARKET_API_KEY_STAGING=staging-key
POLYMARKET_API_SECRET_STAGING=staging-secret

# Production
POLYMARKET_API_KEY_PROD=prod-key
POLYMARKET_API_SECRET_PROD=prod-secret
```

## Next Steps

1. **Generate Production Credentials**: Use the provided script to generate API keys
2. **Update Environment Variables**: Add credentials to production environment
3. **Test Integration**: Run test scripts to verify connection
4. **Enable CLOB Service**: Set `USE_POLYMARKET_CLOB=true` in production
5. **Monitor Performance**: Track API usage and response times

## Support Resources

- **Polymarket Documentation**: https://docs.polymarket.com
- **Discord Community**: Join Polymarket's Discord for developer support
- **GitHub Issues**: Report issues on Polymarket client repositories
- **APES Support**: Contact team for integration assistance

---

*Note: This guide assumes production readiness. Always test thoroughly in a development environment before deploying to production.*