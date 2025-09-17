import { polygon } from 'viem/chains';
import { addRpcUrlOverrideToChain } from '@privy-io/react-auth';

// Custom RPC configuration for Polygon
export const polygonWithCustomRpc = addRpcUrlOverrideToChain(
  polygon,
  import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com'
);

export const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l', // Your Privy App ID
  config: {
    // Branding
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png',
      showWalletLoginFirst: false,
    },
    
    // Login methods
    loginMethods: ['email', 'google', 'twitter', 'wallet'],
    
    // EVM configuration (Polygon for Polymarket)
    defaultChain: polygonWithCustomRpc,
    supportedChains: [polygonWithCustomRpc],
    
    // Solana configuration (for APES)
    solanaClusters: [{
      name: 'mainnet-beta',
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }],
    
    // Embedded wallets - automatically create for new users
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
      requireUserPasswordOnCreate: false,
    },
    
    // External wallet connectors
    externalWallets: {
      coinbaseWallet: {
        // Coinbase Wallet configuration
        connectionOptions: 'all', // 'all' | 'smartWalletOnly' | 'eoaOnly'
      },
      metamask: {
        // MetaMask configuration
        connectionOptions: 'all',
      },
      walletConnect: {
        // WalletConnect configuration - you'll need a project ID from WalletConnect
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
      },
    },
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};