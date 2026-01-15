# Frontend Signature Implementation Guide

## Overview

I've implemented the wallet signature authentication for the web app. The system now requires signed messages for all referral API endpoints.

## What's Been Implemented

### 1. Wallet Authentication Utility (`src/frontend/src/utils/walletAuth.js`)

A complete authentication utility that handles:
- Message generation with timestamps
- Wallet message signing
- Signature encoding (base58)
- Authentication header generation
- Authenticated fetch wrapper

### 2. Updated Referral Service

The referral service now uses wallet authentication for all API calls:
- `processReferral()` - Now requires wallet instance
- `getReferralStats()` - Now requires wallet instance
- All requests include authentication headers

### 3. Updated React Components

- `useReferralTracking` hook - Passes wallet instance to referral processing
- `ReferralSection` component - Passes wallet instance for stats fetching

## How It Works

1. **Message Generation**
   ```javascript
   const message = `Authenticate PRIMAPE at ${timestamp}`;
   ```

2. **Signing Process**
   ```javascript
   const signature = await wallet.signMessage(messageBytes);
   const base58Signature = bs58.encode(signature);
   ```

3. **Request Headers**
   ```
   x-wallet-address: [wallet public key]
   x-wallet-signature: [base58 encoded signature]
   x-signature-message: [original message with timestamp]
   ```

## Usage Example

```javascript
import WalletAuth from '../utils/walletAuth';

// Make an authenticated request
const response = await WalletAuth.authenticatedFetch(
  'https://api.example.com/endpoint',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  },
  wallet // wallet adapter instance
);
```

## Security Features

1. **Timestamp Validation** - Messages expire after 5 minutes
2. **Replay Attack Prevention** - Each request has unique timestamp
3. **Wallet Ownership Proof** - Only wallet owner can sign messages
4. **No Private Keys Exposed** - Uses wallet adapter's secure signing

## Testing

To test the implementation:

1. Connect your wallet on the frontend
2. Visit a referral link: `https://primape.com/ref/[WALLET_ADDRESS]`
3. Check console for authentication headers
4. Verify referral processing with signed requests

## Troubleshooting

### "Wallet does not support message signing"
Some wallets don't support message signing. Phantom and Solflare both support it.

### "Invalid signature"
- Ensure the wallet is connected
- Check that the message format matches exactly
- Verify base58 encoding is correct

### "Signature expired"
Messages expire after 5 minutes. The request will automatically generate a new signature.

## Next Steps

The frontend is now ready for production with proper authentication. All sensitive referral endpoints are protected and require valid signatures.