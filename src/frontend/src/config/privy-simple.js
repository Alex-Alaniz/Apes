import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

/**
 * Minimal Privy configuration for Solana-only
 * No EVM chains, no auto-connect, no MetaMask
 */
export const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l',
  config: {
    // Appearance
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png'
    },
    
    // Auth methods
    loginMethods: ['email', 'sms', 'google', 'twitter', 'discord', 'wallet'],
    
    // Solana RPC
    solanaRpc: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    
    // External wallets - Solana only
    externalWallets: {
      solana: {
        wallets: ['phantom', 'solflare', 'backpack']
      }
    },
    
    // Embedded wallets
    embeddedWallets: {
      createOnLogin: 'users-without-wallets'
    }
  }
};