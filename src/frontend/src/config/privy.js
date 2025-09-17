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
    // IMPORTANT: This enables Solana support
    solanaCluster: {
      name: 'mainnet-beta',
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    },
    
    // Embedded wallets - automatically create for BOTH chains
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
      requireUserPasswordOnCreate: false,
      // Create wallets for both EVM and Solana
      chains: ['ethereum', 'solana']
    },
    
    // External wallet connectors - Configure both EVM and Solana
    externalWallets: {
      // EVM Wallets
      coinbaseWallet: {
        connectionOptions: 'all',
        chains: ['ethereum', 'polygon'] // Support EVM chains
      },
      metamask: {
        connectionOptions: 'all',
        chains: ['ethereum', 'polygon']
      },
      walletConnect: {
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
        chains: ['ethereum', 'polygon']
      },
      // Solana Wallets - According to Privy docs
      solana: {
        // This enables Solana wallet connections
        wallets: ['phantom', 'solflare', 'backpack', 'coinbaseWallet']
      }
    },
    
    // Multi-chain configuration
    multiChainWallets: {
      // Enable multi-chain support
      enabled: true,
      // Prioritize Solana for APES markets
      priorityChain: 'solana'
    },
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};