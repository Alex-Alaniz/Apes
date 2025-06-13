// Access Control Configuration
// For production, these should be set via environment variables

// Default authorized wallets (sync with backend)
const DEFAULT_AUTHORIZED_WALLETS = [
  'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', // PRIMAPE Treasury
  'APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe', // Community Treasury
  '4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS', // Devnet deployer/treasury
  'XgkAtCrgMcz63WBm6LR1uqEKDDJM4q6tLxRH7Dg6nSe', // New admin wallet
];

// CRITICAL: Always include this wallet regardless of env configuration
const ALWAYS_AUTHORIZED = 'XgkAtCrgMcz63WBm6LR1uqEKDDJM4q6tLxRH7Dg6nSe';

// Get authorized wallets from environment or use defaults
export const getAuthorizedWallets = () => {
  // Check for environment variable
  const envWallets = import.meta.env?.VITE_AUTHORIZED_WALLETS;
  
  if (envWallets) {
    // Parse comma-separated list
    const walletList = envWallets.split(',').map(wallet => wallet.trim());
    
    // ENSURE critical wallet is always included
    if (!walletList.includes(ALWAYS_AUTHORIZED)) {
      walletList.push(ALWAYS_AUTHORIZED);
    }
    
    console.log('📋 Using authorized wallets from env (+ critical wallet):', walletList);
    return walletList;
  }
  
  // Return defaults
  console.log('📋 Using default authorized wallets:', DEFAULT_AUTHORIZED_WALLETS);
  return DEFAULT_AUTHORIZED_WALLETS;
};

// Check if a wallet is authorized
export const isWalletAuthorized = (walletAddress) => {
  if (!walletAddress) return false;
  
  const walletStr = walletAddress.toString();
  const authorizedWallets = getAuthorizedWallets();
  
  // Debug logging
  console.log('🔐 Checking wallet authorization:');
  console.log('   Wallet to check:', walletStr);
  console.log('   Authorized wallets:', authorizedWallets);
  console.log('   Is authorized:', authorizedWallets.includes(walletStr));
  
  return authorizedWallets.includes(walletStr);
};

// Export for components that need the list
export const AUTHORIZED_WALLETS = getAuthorizedWallets(); 