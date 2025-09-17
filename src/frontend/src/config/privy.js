import { toSolanaWalletConnectors as getSolanaConnectors } from '@privy-io/react-auth/solana';
import { defineChain } from 'viem';

// Dummy chain to satisfy Privy's requirement
// This chain will never be used since we're in Solana-only mode
const dummyChain = defineChain({
  id: 1,
  name: 'Dummy',
  network: 'dummy',
  nativeCurrency: {
    decimals: 18,
    name: 'Dummy',
    symbol: 'DUM',
  },
  rpcUrls: {
    default: { http: ['https://dummy.com'] },
    public: { http: ['https://dummy.com'] },
  },
});

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
    
    // Dummy chain config to satisfy Privy requirement
    // Won't be used since walletChainType is 'solana-only'
    defaultChain: dummyChain,
    supportedChains: [dummyChain],
    
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