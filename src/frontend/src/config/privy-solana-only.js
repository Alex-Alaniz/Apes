import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

/**
 * Privy configuration for Solana-only mode
 * No EVM chains, no MetaMask, only Solana wallets
 */
export const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l',
  config: {
    // Appearance and branding
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png',
      showWalletLoginFirst: false
    },
    
    // Login methods available
    loginMethods: ['email', 'google', 'twitter', 'wallet'],
    
    // Solana configuration
    solana: {
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    },
    
    // External wallets - ONLY Solana
    externalWallets: {
      solana: {
        // Only show these Solana wallets
        wallets: ['phantom', 'solflare', 'backpack'],
        // Use Solana wallet connectors
        connectors: toSolanaWalletConnectors({
          autoConnect: false // Prevent auto-connection
        })
      }
    },
    
    // Embedded wallets (for users without wallets)
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
      requireUserPasswordOnCreate: false
    },
    
    // Disable all auto-connection behavior
    walletConnectModal: false,
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false
    }
  }
};