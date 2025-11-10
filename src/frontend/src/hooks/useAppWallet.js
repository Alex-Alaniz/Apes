import { useUnifiedWallet } from './useUnifiedWallet';

/**
 * App wallet hook that provides a consistent interface
 * Works with both Privy and standard Solana wallet adapter
 */
export function useAppWallet() {
  return useUnifiedWallet();
}