// Access Control Configuration
// For production, these should be set via environment variables

// Default authorized wallets (sync with backend)
const DEFAULT_AUTHORIZED_WALLETS = [
  'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', // PRIMAPE Treasury
  'APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe', // Community Treasury
  '4FxpxY3RRN4GQnSTTdZe2MEpRQCdTVnV3mX9Yf46vKoS', // Devnet deployer/treasury
  'XgkAtCrgMcz63WBm6LR1uqEKDDJM4q6tLxRH7Dg6nSe', // New admin wallet
];

// Get authorized wallets from environment or use defaults
export const getAuthorizedWallets = () => {
  // Check for environment variable
  const envWallets = import.meta.env?.VITE_AUTHORIZED_WALLETS;
  
  if (envWallets) {
    // Parse comma-separated list
    return envWallets.split(',').map(wallet => wallet.trim());
  }
  
  // Return defaults
  return DEFAULT_AUTHORIZED_WALLETS;
};

// Check if a wallet is authorized
export const isWalletAuthorized = (walletAddress) => {
  if (!walletAddress) return false;
  
  const authorizedWallets = getAuthorizedWallets();
  return authorizedWallets.includes(walletAddress.toString());
};

// Export for components that need the list
export const AUTHORIZED_WALLETS = getAuthorizedWallets(); 