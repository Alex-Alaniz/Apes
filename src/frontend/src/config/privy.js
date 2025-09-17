import { toSolanaWalletConnectors as getSolanaConnectors } from '@privy-io/react-auth/solana';

// No EVM chains in frontend

export const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l', // Your Privy App ID
  config: {
    
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
    
    // Prevent auto-connection and wallet conflicts
    autoConnect: false,
    preventWalletAutoConnect: true,
    
    // Remove EVM configuration from frontend
    // EVM wallets will only be accessible server-side
    // Explicitly disable EVM chains
    defaultChain: undefined,
    supportedChains: [],
    
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
        connectors: getSolanaConnectors({
          // Disable auto-connect for each wallet
          autoConnect: false
        })
      }
    },
    
    
    // No WalletConnect for Solana-only mode
    // walletConnectCloudProjectId: undefined,
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};