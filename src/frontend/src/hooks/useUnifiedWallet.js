import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Unified wallet hook that works with both Privy and standard Solana wallet adapter
 * Provides a consistent interface regardless of which system is used
 */
export function useUnifiedWallet() {
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  // Standard wallet adapter
  const standardWallet = useWallet();
  
  // Privy hooks (will be empty if not in Privy context)
  let privyAuth = { ready: false, authenticated: false };
  let privyWallets = { wallets: [] };
  
  try {
    if (isPrivyEnabled) {
      privyAuth = usePrivy();
      privyWallets = useWallets();
    }
  } catch (e) {
    // Not in Privy context
  }
  
  // Get Solana wallet from Privy
  const privySolanaWallet = privyWallets.wallets.find(w => w.chainType === 'solana');
  
  // Determine which wallet system is active
  const publicKey = useMemo(() => {
    if (isPrivyEnabled && privySolanaWallet?.address) {
      try {
        return new PublicKey(privySolanaWallet.address);
      } catch (e) {
        return null;
      }
    }
    return standardWallet.publicKey;
  }, [isPrivyEnabled, privySolanaWallet, standardWallet.publicKey]);
  
  const walletAddress = publicKey?.toString() || null;
  
  const connected = isPrivyEnabled 
    ? (privyAuth.authenticated && !!privySolanaWallet)
    : standardWallet.connected;
    
  const connecting = isPrivyEnabled
    ? !privyAuth.ready
    : standardWallet.connecting;
  
  // Connect function
  const connect = useCallback(async () => {
    if (isPrivyEnabled) {
      // Privy connection is handled by the button component
      console.log('Connect via Privy button');
    } else {
      await standardWallet.connect();
    }
  }, [isPrivyEnabled, standardWallet]);
  
  // Disconnect function
  const disconnect = useCallback(async () => {
    if (isPrivyEnabled) {
      // Privy disconnect is handled by the button component
      console.log('Disconnect via Privy button');
    } else {
      await standardWallet.disconnect();
    }
  }, [isPrivyEnabled, standardWallet]);
  
  // Get provider for Anchor
  const getProvider = useCallback(async () => {
    if (!connected || !publicKey) {
      throw new Error('No wallet connected');
    }
    
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    if (isPrivyEnabled && privySolanaWallet) {
      // For Privy, we need to create a custom wallet adapter
      const privyAdapter = {
        publicKey,
        signTransaction: async (tx) => {
          const serializedTx = tx.serialize({ requireAllSignatures: false });
          const signedTx = await privySolanaWallet.signTransaction(serializedTx);
          return signedTx;
        },
        signAllTransactions: async (txs) => {
          return Promise.all(txs.map(tx => privyAdapter.signTransaction(tx)));
        }
      };
      
      return new AnchorProvider(connection, privyAdapter, { commitment: 'confirmed' });
    }
    
    // Standard wallet adapter
    return new AnchorProvider(connection, standardWallet, { commitment: 'confirmed' });
  }, [connected, publicKey, isPrivyEnabled, privySolanaWallet, standardWallet]);
  
  // Get wallet instance
  const getWallet = useCallback(async () => {
    if (isPrivyEnabled && privySolanaWallet) {
      return privySolanaWallet;
    }
    return standardWallet;
  }, [isPrivyEnabled, privySolanaWallet, standardWallet]);
  
  // Sign message
  const signMessage = useCallback(async (message) => {
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    
    if (isPrivyEnabled && privySolanaWallet) {
      const signature = await privySolanaWallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
    
    if (standardWallet?.signMessage) {
      const signature = await standardWallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
    
    throw new Error('Wallet does not support message signing');
  }, [isPrivyEnabled, privySolanaWallet, standardWallet]);
  
  return {
    // Core properties
    publicKey,
    walletAddress,
    connected,
    connecting,
    ready: isPrivyEnabled ? privyAuth.ready : true,
    
    // Functions
    connect,
    disconnect,
    getProvider,
    getWallet,
    signMessage,
    
    // Additional info
    isPrivyEnabled,
    user: privyAuth.user || null,
    authenticated: privyAuth.authenticated || connected,
    
    // Legacy support
    login: connect,
    logout: disconnect
  };
}