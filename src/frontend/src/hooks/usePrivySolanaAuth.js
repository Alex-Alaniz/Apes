import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';

/**
 * Hook specifically for Privy Solana authentication
 * Handles the Solana wallet connection through Privy
 */
export function usePrivySolanaAuth() {
  const { authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();
  
  // Debug logging
  console.log('Privy Auth State:', {
    authenticated,
    ready,
    walletCount: wallets.length,
    user: user?.id
  });
  
  // Find Solana wallet - check all possible ways Privy might return it
  const solanaWallet = useMemo(() => {
    if (!wallets.length) {
      console.log('No wallets connected');
      return null;
    }
    
    // Log all wallets for debugging
    wallets.forEach((wallet, index) => {
      console.log(`Wallet ${index}:`, {
        address: wallet.address,
        chainType: wallet.chainType,
        chainId: wallet.chainId,
        walletClient: wallet.walletClient,
        walletClientType: wallet.walletClientType,
        connectorType: wallet.connectorType
      });
    });
    
    // Find Solana wallet using various checks
    const solana = wallets.find(w => {
      // Direct checks
      if (w.chainType === 'solana') return true;
      if (w.chainId === 'solana:mainnet') return true;
      if (w.walletClientType === 'phantom') return true;
      if (w.walletClientType === 'solflare') return true;
      if (w.walletClientType === 'backpack') return true;
      
      // Check if it's a base58 address (Solana format)
      if (w.address) {
        const isBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w.address);
        if (isBase58) {
          console.log('Found Solana wallet by address format:', w.address);
          return true;
        }
      }
      
      return false;
    });
    
    if (solana) {
      console.log('✅ Found Solana wallet:', solana.address);
    } else {
      console.log('❌ No Solana wallet found among', wallets.length, 'wallets');
    }
    
    return solana;
  }, [wallets]);
  
  // Get the wallet address and public key
  const walletAddress = solanaWallet?.address || null;
  const publicKey = useMemo(() => {
    if (!walletAddress) return null;
    
    try {
      return new PublicKey(walletAddress);
    } catch (error) {
      console.error('Invalid Solana address:', walletAddress, error);
      return null;
    }
  }, [walletAddress]);
  
  return {
    authenticated,
    ready,
    connected: authenticated && !!solanaWallet,
    solanaWallet,
    walletAddress,
    publicKey,
    user
  };
}