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
    
    // CRITICAL: Enable both Ethereum and Solana wallets
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png',
      showWalletLoginFirst: false,
      walletChainType: 'ethereum-and-solana', // Enable BOTH chains
      walletList: ['phantom', 'solflare', 'metamask', 'coinbase_wallet', 'detected_wallets']
    },
    
    // EVM configuration (Polygon for Polymarket)
    defaultChain: polygonWithCustomRpc,
    supportedChains: [polygonWithCustomRpc],
    
    // Solana configuration (for APES)
    // IMPORTANT: This must be set for Solana support
    solanaRpc: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    
    // Embedded wallets configuration
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
      requireUserPasswordOnCreate: false
    },
    
    // External wallet connectors
    externalWallets: {
      // Solana wallet support (REQUIRED for Phantom to work as Solana)
      solana: {
        connectors: getSolanaConnectors()
      },
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
    
    
    // Explicitly set wallet connector behavior
    walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    
    // MFA options
    mfa: {
      noPromptOnMfaRequired: false,
    },
  }
};