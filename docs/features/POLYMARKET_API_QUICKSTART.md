# Polymarket API Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Create Polygon Wallet

```bash
# Run this once to create a new wallet
node -e "const {ethers} = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

Save the output securely!

### 2. Get API Credentials

```bash
# Save this as get-polymarket-api.js
const { ethers } = require('ethers');
const axios = require('axios');

async function getAPIKeys() {
  const wallet = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY);
  const timestamp = Math.floor(Date.now() / 1000);
  
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: 137
  };
  
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
    nonce: 0,
    message: 'Generate API Key'
  };
  
  const signature = await wallet._signTypedData(domain, types, value);
  
  const response = await axios.post('https://clob.polymarket.com/auth/api-key', {}, {
    headers: {
      'POLY_ADDRESS': wallet.address,
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': timestamp.toString(),
      'POLY_NONCE': '0'
    }
  });
  
  console.log('Add to .env:');
  console.log(`POLYMARKET_API_KEY=${response.data.apiKey}`);
  console.log(`POLYMARKET_API_SECRET=${response.data.secret}`);
  console.log(`POLYMARKET_PASSPHRASE=${response.data.passphrase}`);
}

getAPIKeys().catch(console.error);
```

Run it:
```bash
POLYGON_PRIVATE_KEY="your-private-key" node get-polymarket-api.js
```

### 3. Update .env

```env
# Add these to backend/.env
USE_POLYMARKET_CLOB=true
POLYMARKET_API_KEY=your-api-key
POLYMARKET_API_SECRET=your-api-secret
POLYMARKET_PASSPHRASE=your-passphrase
POLYGON_PRIVATE_KEY=your-private-key
POLYGON_RPC_URL=https://polygon-rpc.com
```

### 4. Test Connection

```bash
cd backend
node scripts/test-polymarket-clob.js
```

## 💡 Key Points

- **No KYC Required**: Just need a Polygon wallet
- **Free API**: No fees for API access (0% trading fees currently)
- **Instant Access**: API keys generated immediately
- **Production Ready**: Same process for dev and prod

## 🔧 Integration Status

✅ WebSocket connection implemented
✅ Order signing (EIP-712) ready
✅ Authentication flow complete
✅ Reconnection logic built
✅ Mock fallback available

⏳ Waiting for: Production API credentials

## 📝 Important URLs

- **CLOB API**: https://clob.polymarket.com
- **WebSocket**: wss://ws-subscriptions-clob.polymarket.com/ws/
- **Data API**: https://data-api.polymarket.com
- **Docs**: https://docs.polymarket.com

## 🚨 Common Issues

1. **Timestamp errors**: Use seconds, not milliseconds
2. **Chain ID**: Must be 137 for Polygon
3. **USDC needed**: For placing orders (on Polygon)

## 🎯 Next Steps

1. Generate API credentials using the script
2. Add to production environment
3. Enable with `USE_POLYMARKET_CLOB=true`
4. Monitor logs for connection status