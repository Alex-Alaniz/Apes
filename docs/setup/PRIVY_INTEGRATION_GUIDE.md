# Privy Integration Guide for APES Platform

## Overview

This guide details the integration of Privy as the wallet infrastructure provider for APES, enabling seamless multi-chain support for both Solana (APES tokens) and Polygon (Polymarket trading).

## Architecture Benefits

### Why Privy?

1. **Unified Wallet Management**: Single provider for both Solana and Polygon
2. **Embedded Wallets**: Auto-create wallets for new users (no crypto experience needed)
3. **External Wallet Support**: Power users can connect existing wallets
4. **Security**: SOC2 compliant, key management handled by Privy
5. **User Experience**: Seamless onboarding with social logins

### Architecture Flow

```
New Users:
Email/Social Login → Privy Creates Embedded Wallets → Trade on APES (Solana) + Polymarket (Polygon)

Existing Users:
Connect External Wallet → Link to Privy → Use Existing Wallets for Trading
```

## Implementation Plan

### Phase 1: Basic Integration

#### 1.1 Install Dependencies

```bash
cd src/frontend
npm install @privy-io/react-auth ethers@^6
```

#### 1.2 Configure Privy Provider

Create `src/config/privy.js`:

```javascript
import { polygon, mainnet } from 'viem/chains';
import { addRpcUrlOverrideToChain } from '@privy-io/react-auth';

// Custom RPC configuration
export const polygonWithCustomRpc = addRpcUrlOverrideToChain(
  polygon,
  process.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com'
);

export const privyConfig = {
  appId: process.env.VITE_PRIVY_APP_ID,
  config: {
    // Branding
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/logo.png',
    },
    
    // Login methods
    loginMethods: ['email', 'google', 'twitter', 'wallet'],
    
    // EVM configuration (Polygon for Polymarket)
    defaultChain: polygonWithCustomRpc,
    supportedChains: [polygonWithCustomRpc],
    
    // Solana configuration (for APES)
    solanaClusters: [{
      name: 'mainnet-beta',
      rpcUrl: process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }],
    
    // Embedded wallets
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
    },
    
    // External wallets
    walletConnectCloudProjectId: process.env.VITE_WALLETCONNECT_PROJECT_ID,
  }
};
```

#### 1.3 Update Main App Component

```javascript
// src/App.jsx
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from './config/privy';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

function App() {
  return (
    <PrivyProvider {...privyConfig}>
      <WalletModalProvider>
        {/* Existing app content */}
      </WalletModalProvider>
    </PrivyProvider>
  );
}
```

### Phase 2: Wallet Management

#### 2.1 Create Wallet Hook

Create `src/hooks/useMultiChainWallet.js`:

```javascript
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { ethers } from 'ethers';

export function useMultiChainWallet() {
  const { user, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const solanaWallet = useSolanaWallet();
  
  // Get Polygon wallet for Polymarket
  const polygonWallet = wallets.find(w => 
    w.chainId === 'eip155:137' // Polygon chain ID
  );
  
  // Get Solana wallet for APES
  const privySolanaWallet = wallets.find(w => 
    w.chainId === 'solana:mainnet'
  );
  
  // Prefer Privy Solana wallet, fallback to adapter
  const activesolanaWallet = privySolanaWallet || solanaWallet;
  
  // Connect or create wallet
  const connectWallet = async (chain = 'both') => {
    if (!authenticated) {
      await login();
    }
    
    // Ensure wallets exist for both chains
    if (chain === 'polygon' || chain === 'both') {
      if (!polygonWallet) {
        // Privy will create embedded wallet
        console.log('Creating Polygon wallet...');
      }
    }
  };
  
  // Get ethers signer for Polygon transactions
  const getPolygonSigner = async () => {
    if (!polygonWallet) throw new Error('No Polygon wallet connected');
    
    const provider = await polygonWallet.getEthersProvider();
    return provider.getSigner();
  };
  
  // Sign message with appropriate wallet
  const signMessage = async (message, chain = 'solana') => {
    if (chain === 'polygon' && polygonWallet) {
      const signer = await getPolygonSigner();
      return await signer.signMessage(message);
    } else if (chain === 'solana' && activesolanaWallet) {
      // Use Solana wallet adapter
      return await activesolanaWallet.signMessage(new TextEncoder().encode(message));
    }
    
    throw new Error(`No ${chain} wallet connected`);
  };
  
  return {
    authenticated,
    user,
    solanaWallet: activesolanaWallet,
    polygonWallet,
    connectWallet,
    getPolygonSigner,
    signMessage,
    login,
    logout,
    hasPolygonWallet: !!polygonWallet,
    hasSolanaWallet: !!activesolanaWallet,
  };
}
```

#### 2.2 Update Navbar Component

```javascript
// src/components/Navbar.jsx
import { useMultiChainWallet } from '../hooks/useMultiChainWallet';

function Navbar() {
  const { 
    authenticated, 
    user, 
    connectWallet, 
    logout,
    hasSolanaWallet,
    hasPolygonWallet,
    solanaWallet,
    polygonWallet
  } = useMultiChainWallet();
  
  return (
    <nav>
      {authenticated ? (
        <div className="wallet-info">
          <div className="wallet-status">
            <span>Solana: {hasSolanaWallet ? '✅' : '❌'}</span>
            <span>Polygon: {hasPolygonWallet ? '✅' : '❌'}</span>
          </div>
          
          {solanaWallet && (
            <div className="wallet-address">
              APES: {solanaWallet.publicKey?.toBase58().slice(0, 4)}...
            </div>
          )}
          
          {polygonWallet && (
            <div className="wallet-address">
              Polymarket: {polygonWallet.address.slice(0, 6)}...
            </div>
          )}
          
          <button onClick={logout}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connectWallet('both')}>
          Connect Wallet
        </button>
      )}
    </nav>
  );
}
```

### Phase 3: Polymarket Integration

#### 3.1 Create Polymarket Service

Create `src/services/polymarketPrivyService.js`:

```javascript
import { ethers } from 'ethers';

export class PolymarketPrivyService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL;
  }
  
  async placeOrder(wallet, orderParams) {
    // Get signer from Privy wallet
    const provider = await wallet.getEthersProvider();
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Create order signature (EIP-712)
    const domain = {
      name: 'ClobAuthDomain',
      version: '1',
      chainId: 137
    };
    
    const types = {
      Order: [
        { name: 'maker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'size', type: 'uint256' },
        { name: 'side', type: 'uint8' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
      ]
    };
    
    const order = {
      maker: address,
      tokenId: orderParams.tokenId,
      price: ethers.parseUnits(orderParams.price.toString(), 6),
      size: ethers.parseUnits(orderParams.size.toString(), 6),
      side: orderParams.side === 'BUY' ? 0 : 1,
      expiration: Math.floor(Date.now() / 1000) + 86400,
      nonce: Date.now()
    };
    
    // Sign with Privy wallet
    const signature = await signer._signTypedData(domain, types, order);
    
    // Submit to backend
    const response = await fetch(`${this.apiUrl}/api/polymarket/place-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify({
        order,
        signature,
        walletAddress: address
      })
    });
    
    return response.json();
  }
  
  async getAuthToken() {
    // Get auth token from Privy
    const privyToken = localStorage.getItem('privy:token');
    return privyToken;
  }
}
```

#### 3.2 Update PredictionModal

```javascript
// src/components/PredictionModal.jsx
import { useMultiChainWallet } from '../hooks/useMultiChainWallet';
import { PolymarketPrivyService } from '../services/polymarketPrivyService';

function PredictionModal({ market, isPolymarket }) {
  const { solanaWallet, polygonWallet, connectWallet } = useMultiChainWallet();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  
  const handlePlaceBet = async () => {
    setIsPlacingBet(true);
    
    try {
      if (isPolymarket) {
        // Ensure Polygon wallet exists
        if (!polygonWallet) {
          await connectWallet('polygon');
          return;
        }
        
        // Place Polymarket order
        const polymarketService = new PolymarketPrivyService();
        const result = await polymarketService.placeOrder(polygonWallet, {
          tokenId: market.tokenId,
          side: selectedOption === 'Yes' ? 'BUY' : 'SELL',
          price: currentPrice,
          size: betAmount
        });
        
        console.log('Polymarket order placed:', result);
      } else {
        // Place APES bet on Solana
        // ... existing Solana betting logic
      }
    } catch (error) {
      console.error('Bet placement failed:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };
  
  return (
    <div className="prediction-modal">
      {/* Modal content */}
      <button 
        onClick={handlePlaceBet}
        disabled={isPlacingBet || (!solanaWallet && !isPolymarket) || (!polygonWallet && isPolymarket)}
      >
        {isPlacingBet ? 'Placing bet...' : 'Place Bet'}
      </button>
    </div>
  );
}
```

### Phase 4: Backend Integration

#### 4.1 Add Privy Verification

Create `backend/middleware/privyAuth.js`:

```javascript
const { PrivyClient } = require('@privy-io/server-auth');

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

async function verifyPrivyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { userId } = await privy.verifyAuthToken(token);
    
    // Get user details
    const user = await privy.getUser(userId);
    req.privyUser = user;
    
    // Extract wallet addresses
    req.walletAddresses = {
      solana: user.linkedAccounts.find(a => a.type === 'solana')?.address,
      polygon: user.linkedAccounts.find(a => a.type === 'ethereum' && a.chainId === '0x89')?.address
    };
    
    next();
  } catch (error) {
    console.error('Privy auth error:', error);
    res.status(401).json({ error: 'Invalid authentication' });
  }
}

module.exports = { verifyPrivyAuth };
```

#### 4.2 Update Polymarket Routes

```javascript
// backend/routes/polymarket.js
const { verifyPrivyAuth } = require('../middleware/privyAuth');

router.post('/place-order', verifyPrivyAuth, async (req, res) => {
  const { order, signature, walletAddress } = req.body;
  const { polygon: userPolygonAddress } = req.walletAddresses;
  
  // Verify the wallet address matches
  if (walletAddress !== userPolygonAddress) {
    return res.status(403).json({ error: 'Wallet mismatch' });
  }
  
  // Process order through proxy service
  try {
    const result = await polymarketProxyService.placeOrderWithSignature(
      req.privyUser.id,
      order,
      signature
    );
    
    res.json(result);
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Phase 5: Migration Strategy

#### 5.1 Gradual Migration

1. **Week 1**: Add Privy alongside existing wallet adapter
2. **Week 2**: Enable for new users only
3. **Week 3**: Prompt existing users to link wallets
4. **Week 4**: Full migration

#### 5.2 User Migration Flow

```javascript
// src/components/WalletMigration.jsx
function WalletMigration() {
  const { publicKey } = useWallet(); // Existing Solana wallet
  const { linkWallet } = usePrivy();
  
  const handleMigration = async () => {
    // Link existing Solana wallet to Privy
    await linkWallet();
    
    // Backend will associate Privy user with existing account
    await fetch('/api/users/migrate-to-privy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': publicKey.toBase58()
      }
    });
  };
  
  return (
    <div className="migration-banner">
      <h3>Upgrade to Multi-Chain Wallet</h3>
      <p>Link your wallet to enable Polymarket trading!</p>
      <button onClick={handleMigration}>Upgrade Now</button>
    </div>
  );
}
```

## Environment Variables

### Frontend (.env)

```env
# Privy Configuration
VITE_PRIVY_APP_ID=your-privy-app-id
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-id

# RPC URLs (optional - Privy provides defaults)
VITE_POLYGON_RPC_URL=https://polygon-rpc.com
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Backend (.env)

```env
# Privy Server Auth
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
```

## Security Considerations

1. **Key Management**: All private keys managed by Privy
2. **Authentication**: Use Privy tokens for API authentication
3. **Rate Limiting**: Implement per-user rate limits
4. **Transaction Limits**: Set daily/monthly limits per user
5. **Audit Trail**: Log all wallet operations

## Cost Analysis

### Privy Pricing (as of 2024)
- **Free Tier**: Up to 1,000 MAUs
- **Growth**: $0.015 per MAU
- **Enterprise**: Custom pricing

### Estimated Costs
- 10,000 users: ~$150/month
- 100,000 users: ~$1,500/month

## Testing Plan

1. **Unit Tests**: Test wallet hooks and services
2. **Integration Tests**: Test Privy + Polymarket flow
3. **E2E Tests**: Full user journey testing
4. **Security Audit**: Review authentication flow

## Rollout Checklist

- [ ] Create Privy account and get API keys
- [ ] Install dependencies in frontend
- [ ] Configure Privy provider
- [ ] Update wallet components
- [ ] Add backend authentication
- [ ] Test embedded wallet creation
- [ ] Test external wallet connection
- [ ] Test Polymarket order flow
- [ ] Deploy to staging
- [ ] Gradual production rollout

## Support Resources

- **Privy Documentation**: https://docs.privy.io
- **Privy Dashboard**: https://dashboard.privy.io
- **Support**: support@privy.io
- **Discord**: https://discord.gg/privy