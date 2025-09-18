import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useCallback } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Fixed unified wallet hook that works with standard Solana wallet adapter
 * Temporarily disabling Privy until properly configured
 */
export function useAppWallet() {
  const standardWallet = useWallet();
  
  // Get wallet public key and address
  const publicKey = standardWallet?.publicKey || null;
  const walletAddress = publicKey?.toString() || null;
  
  // Connected state
  const connected = standardWallet?.connected || false;
  const connecting = standardWallet?.connecting || false;
  const ready = true;
  
  // Connect wallet function
  const connect = useCallback(async () => {
    if (standardWallet?.connect) {
      await standardWallet.connect();
    }
  }, [standardWallet]);
  
  // Disconnect function
  const disconnect = useCallback(async () => {
    if (standardWallet?.disconnect) {
      await standardWallet.disconnect();
    }
  }, [standardWallet]);
  
  // Get Anchor provider for blockchain operations
  const getProvider = useCallback(async () => {
    if (!connected || !publicKey) {
      throw new Error('No wallet connected');
    }
    
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    return new AnchorProvider(connection, standardWallet, { commitment: 'confirmed' });
  }, [connected, publicKey, standardWallet]);
  
  // Get wallet instance for direct operations
  const getWallet = useCallback(async () => {
    if (standardWallet) {
      return standardWallet;
    }
    throw new Error('No wallet available');
  }, [standardWallet]);
  
  // Sign message
  const signMessage = useCallback(async (message) => {
    if (standardWallet?.signMessage) {
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const signature = await standardWallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
    throw new Error('Wallet does not support message signing');
  }, [standardWallet]);
  
  return {
    // Core properties
    publicKey,
    walletAddress,
    connected,
    connecting,
    ready,
    
    // Functions
    connect,
    disconnect,
    getProvider,
    getWallet,
    signMessage,
    
    // Additional info
    isPrivyEnabled: false,
    user: null,
    authenticated: connected,
    
    // Legacy support
    login: connect,
    logout: disconnect
  };
}