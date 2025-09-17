import { useWallet } from '@solana/wallet-adapter-react';
import { useMultiChainWallet } from './useMultiChainWallet';

/**
 * Safe wallet hook that works with both Privy and Solana wallet adapter
 * Prevents errors when Privy is enabled and Solana adapter is not available
 */
export function useSafeWallet() {
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  // Try to use Solana wallet adapter (will be empty if Privy is enabled)
  let solanaAdapter = null;
  try {
    solanaAdapter = useWallet();
  } catch (error) {
    // Wallet adapter not available (Privy mode)
    solanaAdapter = {
      publicKey: null,
      connected: false,
      connecting: false,
      disconnect: () => {},
      signMessage: null,
      signTransaction: null
    };
  }
  
  // Get Privy wallet data
  const multiChainWallet = useMultiChainWallet();
  
  if (isPrivyEnabled) {
    // In Privy mode, return Privy wallet data in Solana adapter format
    return {
      publicKey: multiChainWallet.addresses.solana ? {
        toString: () => multiChainWallet.addresses.solana,
        toBase58: () => multiChainWallet.addresses.solana
      } : null,
      connected: multiChainWallet.authenticated && !!multiChainWallet.addresses.solana,
      connecting: false,
      disconnect: multiChainWallet.logout,
      signMessage: multiChainWallet.signMessage,
      signTransaction: null, // Not supported in Privy mode yet
      // Add multi-chain data
      addresses: multiChainWallet.addresses,
      multiChain: true
    };
  }
  
  // In standard mode, return regular Solana adapter
  return {
    ...solanaAdapter,
    addresses: {
      solana: solanaAdapter.publicKey?.toString() || null,
      polygon: null
    },
    multiChain: false
  };
}