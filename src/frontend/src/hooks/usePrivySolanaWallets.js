import { useWallets } from '@privy-io/react-auth';
import { useCallback, useMemo } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Hook to get Solana wallets from Privy
 * Based on the Privy documentation for Solana wallets
 */
export function usePrivySolanaWallets() {
  const { wallets } = useWallets();
  
  // Filter for Solana wallets based on chainType
  const solanaWallets = useMemo(() => {
    return wallets.filter(wallet => {
      // Check if this is a Solana wallet
      // Privy sets chainType for properly connected Solana wallets
      if (wallet.chainType === 'solana') {
        return true;
      }
      
      // Check if the address looks like a Solana address (base58, no 0x prefix)
      if (wallet.address && !wallet.address.startsWith('0x')) {
        try {
          new PublicKey(wallet.address);
          return true;
        } catch {
          // Not a valid Solana public key
        }
      }
      
      // Check for wallet client types that are Solana-specific
      const solanaWalletTypes = ['phantom', 'solflare', 'backpack', 'glow'];
      if (wallet.walletClientType && solanaWalletTypes.includes(wallet.walletClientType)) {
        // But only if it's not connecting to EVM
        if (!wallet.chainId?.startsWith('eip155')) {
          return true;
        }
      }
      
      return false;
    });
  }, [wallets]);
  
  // Get the primary Solana wallet
  const primarySolanaWallet = solanaWallets[0];
  
  // Create Anchor provider for a wallet
  const getAnchorProvider = useCallback(async (wallet) => {
    if (!wallet) throw new Error('No wallet provided');
    
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    // Create a wallet adapter that works with Anchor
    const walletAdapter = {
      publicKey: new PublicKey(wallet.address),
      signTransaction: async (tx) => {
        // Privy wallets might have different signing methods
        if (wallet.signTransaction) {
          return await wallet.signTransaction(tx);
        }
        throw new Error('Wallet does not support transaction signing');
      },
      signAllTransactions: async (txs) => {
        if (wallet.signAllTransactions) {
          return await wallet.signAllTransactions(txs);
        }
        // Fallback to signing one by one
        return Promise.all(txs.map(tx => walletAdapter.signTransaction(tx)));
      }
    };
    
    return new AnchorProvider(
      connection,
      walletAdapter,
      { commitment: 'confirmed' }
    );
  }, []);
  
  // Sign message with Solana wallet
  const signMessage = useCallback(async (message, walletAddress) => {
    const wallet = walletAddress 
      ? solanaWallets.find(w => w.address === walletAddress)
      : primarySolanaWallet;
      
    if (!wallet) {
      throw new Error('No Solana wallet found');
    }
    
    if (wallet.signMessage) {
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const signature = await wallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
    
    throw new Error('Wallet does not support message signing');
  }, [solanaWallets, primarySolanaWallet]);
  
  return {
    solanaWallets,
    primarySolanaWallet,
    hasSolanaWallet: solanaWallets.length > 0,
    getAnchorProvider,
    signMessage,
    
    // Debug info
    debug: {
      totalWallets: wallets.length,
      solanaWalletCount: solanaWallets.length,
      walletDetails: wallets.map(w => ({
        address: w.address?.slice(0, 10) + '...',
        chainType: w.chainType,
        chainId: w.chainId,
        walletClientType: w.walletClientType,
        isSolana: solanaWallets.includes(w)
      }))
    }
  };
}