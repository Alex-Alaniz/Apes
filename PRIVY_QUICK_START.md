# Privy Quick Start Guide

## 🚀 Why Privy?

Privy solves our multi-chain wallet challenge:
- ✅ **One login** → Wallets for both Solana (APES) and Polygon (Polymarket)
- ✅ **New users** → Auto-create embedded wallets (no crypto knowledge needed)
- ✅ **Power users** → Connect existing MetaMask, Phantom, etc.
- ✅ **Security** → SOC2 compliant, we never touch private keys

## 📋 Implementation Steps

### Step 1: Get Privy Account (5 mins)

1. Go to https://dashboard.privy.io
2. Create account
3. Create new app
4. Get your App ID and Secret

### Step 2: Install Dependencies (2 mins)

```bash
cd src/frontend
npm install @privy-io/react-auth ethers@^6

cd ../../backend
npm install @privy-io/server-auth
```

### Step 3: Basic Frontend Setup (10 mins)

```javascript
// src/App.jsx
import { PrivyProvider } from '@privy-io/react-auth';
import { polygon } from 'viem/chains';

function App() {
  return (
    <PrivyProvider
      appId="YOUR_PRIVY_APP_ID" // From dashboard
      config={{
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#FF6B6B'
        },
        // Polygon for Polymarket
        defaultChain: polygon,
        supportedChains: [polygon],
        // Solana for APES
        solanaClusters: [{
          name: 'mainnet-beta',
          rpcUrl: 'https://api.mainnet-beta.solana.com'
        }],
        // Auto-create wallets
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        }
      }}
    >
      {/* Your existing app */}
    </PrivyProvider>
  );
}
```

### Step 4: Add Login Button (5 mins)

```javascript
// src/components/ConnectButton.jsx
import { usePrivy } from '@privy-io/react-auth';

function ConnectButton() {
  const { login, logout, authenticated, user } = usePrivy();
  
  if (authenticated) {
    return (
      <div>
        <span>{user?.email || 'Connected'}</span>
        <button onClick={logout}>Disconnect</button>
      </div>
    );
  }
  
  return (
    <button onClick={login}>
      Connect Wallet
    </button>
  );
}
```

### Step 5: Backend Auth (10 mins)

```javascript
// backend/middleware/privyAuth.js
const { PrivyClient } = require('@privy-io/server-auth');

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

async function verifyPrivyUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { userId } = await privy.verifyAuthToken(token);
    const user = await privy.getUser(userId);
    
    req.privyUser = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { verifyPrivyUser };
```

### Step 6: Test It! (5 mins)

1. Start your app
2. Click "Connect Wallet"
3. Login with email/social
4. Check console for wallet addresses

## 🎯 What You Get

After login, users automatically have:

1. **Solana Wallet** (for APES betting)
   ```javascript
   const solanaWallet = user.linkedAccounts.find(
     account => account.type === 'solana'
   );
   console.log('Solana:', solanaWallet.address);
   ```

2. **Polygon Wallet** (for Polymarket)
   ```javascript
   const polygonWallet = user.linkedAccounts.find(
     account => account.type === 'wallet' && 
     account.chainId === '0x89' // Polygon
   );
   console.log('Polygon:', polygonWallet.address);
   ```

## 🔧 Environment Variables

```env
# Frontend (.env)
VITE_PRIVY_APP_ID=your-app-id

# Backend (.env)
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret
```

## 📊 User Flow

```
New User:
1. Clicks "Connect" → 2. Enters email → 3. Gets both wallets → 4. Can bet on APES & Polymarket

Existing User:
1. Clicks "Connect" → 2. Connects MetaMask/Phantom → 3. Links to account → 4. Ready to trade
```

## 💡 Key Benefits

1. **No Seed Phrases**: Users login with email/social
2. **Multi-Chain**: One account, multiple blockchains
3. **Instant Onboarding**: Wallets created automatically
4. **Secure**: SOC2 compliant, enterprise-grade security
5. **Free to Start**: Up to 1,000 users free

## 🚨 Important Notes

- Privy handles ALL key management
- We never see or store private keys
- Users can export wallets if needed
- Supports all major wallets (MetaMask, Phantom, etc.)

## 📈 Next Steps

1. **Test with team** (Week 1)
2. **Enable for beta users** (Week 2)
3. **Full rollout** (Week 3-4)

## 🆘 Need Help?

- Docs: https://docs.privy.io
- Support: support@privy.io
- Dashboard: https://dashboard.privy.io

---

**Ready?** Get your Privy account and let's enable multi-chain betting! 🚀