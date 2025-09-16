# Privy Integration Steps

## Quick Test Setup

### 1. Install Dependencies

```bash
cd /Users/alexalaniz/Documents/GitHub/apes/src/frontend
npm install @privy-io/react-auth@latest ethers@^6 viem
```

### 2. Update Environment Variables

Copy the Privy environment variables:
```bash
cp .env.privy .env.local
# Then merge with your existing .env values
```

### 3. Update main.jsx

Add Privy Provider to your main.jsx:

```javascript
// Add this import
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from './config/privy';

// Wrap your App with PrivyProvider
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <PrivyProvider
          appId={privyConfig.appId}
          config={privyConfig.config}
        >
          <Router>
            <App />
          </Router>
        </PrivyProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

### 4. Add Test Route

In your App.jsx, add a route to test Privy:

```javascript
import PrivyTestPage from './pages/PrivyTestPage';

// In your routes:
<Route path="/privy-test" element={<PrivyTestPage />} />
```

### 5. Update Navbar (Optional)

To test in your existing navbar, add:

```javascript
import PrivyConnectButton from './components/PrivyConnectButton';

// Replace or add alongside your existing connect button
<PrivyConnectButton />
```

### 6. Run the App

```bash
npm run dev
```

Then navigate to:
- http://localhost:3000/privy-test - Full test page
- http://localhost:3000 - See the connect button in navbar

## What to Test

1. **Login Flow**:
   - Click "Connect Wallet"
   - Try email login
   - Try social login (Google/Twitter)
   - Try wallet connection

2. **Wallet Creation**:
   - After login, check if wallets are created
   - Should see both Solana and Polygon addresses

3. **Multi-Chain Support**:
   - Verify Solana wallet shows up
   - Verify Polygon wallet shows up
   - Test signing messages with both

4. **External Wallets**:
   - Try connecting MetaMask
   - Try connecting Phantom
   - Verify they link to your account

## Integration with Existing Code

### Use Multi-Chain Wallet Hook

Replace your wallet connections with:

```javascript
import { useMultiChainWallet } from '../hooks/useMultiChainWallet';

function YourComponent() {
  const { 
    authenticated,
    solanaWallet,
    polygonWallet,
    connectWallet,
    addresses 
  } = useMultiChainWallet();
  
  // Use for Solana operations (APES)
  if (solanaWallet) {
    // Your existing Solana code
  }
  
  // Use for Polygon operations (Polymarket)
  if (polygonWallet) {
    // New Polymarket code
  }
}
```

## Backend Integration

### 1. Install Backend Dependencies

```bash
cd /Users/alexalaniz/Documents/GitHub/apes/backend
npm install @privy-io/server-auth
```

### 2. Add to .env

```env
PRIVY_APP_ID=cmfmo7so5004ojz0bl03kuy1l
PRIVY_APP_SECRET=2gbGWwWRjSNjpRVsKa99U824J266396r4LAUrkebMxNhZbXa1YLC5YbJc5ojueWKnJAGEuic1QsgnqK3q4CpPGZd
```

### 3. Create Auth Middleware

See `backend/middleware/privyAuth.js` example in the docs.

## Troubleshooting

1. **"@privy-io/react-auth" not found**:
   - Make sure you're in the frontend directory
   - Run `npm install @privy-io/react-auth@latest`

2. **Login popup doesn't appear**:
   - Check browser console for errors
   - Verify App ID is correct
   - Check if popups are blocked

3. **Wallets not created**:
   - Check Privy dashboard settings
   - Ensure `createOnLogin: 'users-without-wallets'` is set

4. **Polygon wallet missing**:
   - Make sure Polygon is in supportedChains
   - Try logging out and back in

## Next Steps

Once testing is successful:
1. Integrate with PredictionModal for Polymarket bets
2. Update backend auth to use Privy tokens
3. Migrate existing users
4. Deploy to production

## Support

- Privy Dashboard: https://dashboard.privy.io
- Your App: https://dashboard.privy.io/apps/cmfmo7so5004ojz0bl03kuy1l
- Docs: https://docs.privy.io