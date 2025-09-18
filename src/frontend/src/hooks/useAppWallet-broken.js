import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Unified wallet hook that works with both Privy and standard Solana wallet adapter
 * This is the ONLY hook that should be used throughout the app for wallet access
 */
export function useAppWallet() {
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  // Privy hooks
  const { authenticated, user, login, logout, ready: privyReady } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  
  // Standard wallet adapter (only used when Privy is disabled)
  let standardWallet = null;
  try {
    if (!isPrivyEnabled) {
      standardWallet = useWallet();
    }
  } catch {
    // Wallet adapter not available in Privy mode
  }
  
  // Prevent any auto-connection on mount
  useEffect(() => {
    // Block any auto-connection attempts
    if (isPrivyEnabled && !authenticated) {
      // Not authenticated, ensure no wallets try to connect
      return;
    }
  }, []);
  
  // Find Solana wallet from Privy wallets
  const privySolanaWallet = useMemo(() => {
    if (!isPrivyEnabled || !privyWallets.length) {
      console.log('No Privy wallets available:', { isPrivyEnabled, walletCount: privyWallets.length });
      return null;
    }
    
    // Debug: Log all wallets
    console.log('Available Privy wallets:', privyWallets.map(w => ({
      address: w.address,
      chainType: w.chainType,
      chainId: w.chainId,
      connectorType: w.connectorType,
      walletClientType: w.walletClientType
    })));
    
    // Find wallet that's Solana (check multiple conditions)
    const solanaWallet = privyWallets.find(wallet => {
      // Check multiple ways to identify Solana wallet
      const isSolana = (
        wallet.chainType === 'solana' || 
        wallet.chainId === 'solana:mainnet' ||
        wallet.connectorType === 'solana' ||
        (wallet.address && !wallet.address.startsWith('0x') && wallet.address.length > 30)
      );
      
      if (isSolana) {
        console.log('Found Solana wallet:', wallet.address);
      }
      
      return isSolana;
    });
    
    return solanaWallet;
  }, [isPrivyEnabled, privyWallets]);
  
  // Get wallet public key
  const publicKey = useMemo(() => {
    if (isPrivyEnabled && privySolanaWallet) {
      try {
        return new PublicKey(privySolanaWallet.address);
      } catch {
        return null;
      }
    }
    return standardWallet?.publicKey || null;
  }, [isPrivyEnabled, privyAuth.solanaWallet, standardWallet]);
  
  // Get wallet address as string
  const walletAddress = publicKey?.toString() || null;
  
  // Connected state
  const connected = isPrivyEnabled 
    ? (authenticated && !!privySolanaWallet)
    : (standardWallet?.connected || false);
    
  // Connecting state
  const connecting = isPrivyEnabled 
    ? false // Privy doesn't have connecting state
    : (standardWallet?.connecting || false);
  
  // Connect wallet function
  const connect = useCallback(async () => {
    if (isPrivyEnabled) {
      if (!authenticated) {
        await login();
      }
      // If authenticated but no Solana wallet, user needs to connect one
      if (authenticated && !privySolanaWallet) {
        throw new Error('Please connect a Solana wallet (Phantom, Solflare, etc.)');
      }
    } else {
      if (standardWallet?.connect) {
        await standardWallet.connect();
      }
    }
  }, [isPrivyEnabled, authenticated, login, privySolanaWallet, standardWallet]);
  
  // Disconnect function
  const disconnect = useCallback(async () => {
    if (isPrivyEnabled) {
      await logout();
    } else {
      if (standardWallet?.disconnect) {
        await standardWallet.disconnect();
      }
    }
  }, [isPrivyEnabled, logout, standardWallet]);
  
  // Get Anchor provider for blockchain operations
  const getProvider = useCallback(async () => {
    if (!connected || !publicKey) {
      throw new Error('No wallet connected');
    }
    
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    if (isPrivyEnabled && privySolanaWallet) {
      // Create adapter for Privy wallet
      const adapter = {
        publicKey,
        signTransaction: async (tx) => {
          if (privySolanaWallet.signTransaction) {
            const serialized = tx.serialize({
              requireAllSignatures: false,
              verifySignatures: false
            });
            const signed = await privySolanaWallet.signTransaction(serialized);
            return Transaction.from(signed);
          }
          throw new Error('Wallet does not support transaction signing');
        },
        signAllTransactions: async (txs) => {
          return Promise.all(txs.map(tx => adapter.signTransaction(tx)));
        }
      };
      
      return new AnchorProvider(connection, adapter, { commitment: 'confirmed' });
    } else if (standardWallet) {
      // Use standard wallet adapter
      return new AnchorProvider(connection, standardWallet, { commitment: 'confirmed' });
    }
    
    throw new Error('No wallet available');
  }, [connected, publicKey, isPrivyEnabled, privySolanaWallet, standardWallet]);
  
  // Get wallet instance for direct operations
  const getWallet = useCallback(async () => {
    if (isPrivyEnabled && privySolanaWallet) {
      return privySolanaWallet;
    } else if (standardWallet) {
      return standardWallet;
    }
    throw new Error('No wallet available');
  }, [isPrivyEnabled, privyAuth.solanaWallet, standardWallet]);
  
  // Sign message
  const signMessage = useCallback(async (message) => {
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    
    if (isPrivyEnabled && privySolanaWallet?.signMessage) {
      const signature = await privySolanaWallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    } else if (standardWallet?.signMessage) {
      const signature = await standardWallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
    
    throw new Error('Wallet does not support message signing');
  }, [isPrivyEnabled, privyAuth.solanaWallet, standardWallet]);
  
  return {
    // Core properties
    publicKey,
    walletAddress,
    connected,
    connecting,
    ready: isPrivyEnabled ? privyReady : true,
    
    // Functions
    connect,
    disconnect,
    getProvider,
    getWallet,
    signMessage,
    
    // Additional info
    isPrivyEnabled,
    user: isPrivyEnabled ? user : null,
    
    // Debug info
    debug: {
      isPrivyEnabled,
      privyAuthenticated: authenticated,
      hasSolanaWallet: !!privySolanaWallet,
      standardWalletConnected: standardWallet?.connected,
      walletCount: privyWallets.length
    }
  };
}