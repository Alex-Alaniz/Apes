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
    // Debug configuration
    _debug: true,
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
    
    // External wallet connectors - KEEP EMPTY FOR SOLANA
    // Privy handles Solana wallets differently
    externalWallets: {
      // EVM Wallets for Polygon/Polymarket
      coinbaseWallet: {
        connectionOptions: 'all'
      },
      metamask: {
        connectionOptions: 'all'
      },
      walletConnect: {
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      }
    },
    
    // Solana wallets configuration - MUST be separate from externalWallets
    solanaWallets: ['phantom', 'solflare', 'backpack'],
    
    // Multi-chain configuration
    multiChainWallets: {
      // Enable multi-chain support
      enabled: true,
      // Prioritize Solana for APES markets
      priorityChain: 'solana'
    },
    
    // Explicitly set wallet connector behavior
    walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};