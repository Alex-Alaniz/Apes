import { polygon } from 'viem/chains';
import { addRpcUrlOverrideToChain, toSolanaWalletConnectors } from '@privy-io/react-auth';
import { toSolanaWalletConnectors as getSolanaConnectors } from '@privy-io/react-auth/solana';

// Custom RPC configuration for Polygon
export const polygonWithCustomRpc = addRpcUrlOverrideToChain(
  polygon,
  import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com'
);

export const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l', // Your Privy App ID
  config: {
    // Debug configuration
    _debug: true,
    
    // Login methods
    loginMethods: ['email', 'google', 'twitter', 'wallet'],
    
    // CRITICAL: Enable ONLY Solana wallets for frontend
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png',
      showWalletLoginFirst: false,
      walletChainType: 'solana-only', // ONLY Solana for auth
      walletList: ['phantom', 'solflare', 'backpack'] // Only Solana wallets
    },
    
    // Remove EVM configuration from frontend
    // EVM wallets will only be accessible server-side
    
    // Solana configuration (for APES)
    // IMPORTANT: This must be set for Solana support
    solanaRpc: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    
    // Embedded wallets configuration
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
      requireUserPasswordOnCreate: false
    },
    
    // External wallet connectors - ONLY Solana
    externalWallets: {
      solana: {
        connectors: getSolanaConnectors()
      }
    },
    
    
    // Explicitly set wallet connector behavior
    walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};