import { useWallets } from '@privy-io/react-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import { createPrivyAnchorProvider } from '../utils/privySolanaAdapter';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook to handle Privy Solana wallet connections
 * This ensures Phantom and other Solana wallets are properly detected
 */
export function usePrivySolanaWallet() {
  const { wallets } = useWallets();
  
  // Check if we're in a browser with Phantom
  const hasPhantom = typeof window !== 'undefined' && window.phantom?.solana;
  
  // Find the Solana wallet - check multiple conditions
  const solanaWallet = useMemo(() => {
    console.log('🔍 Searching for Solana wallet among:', wallets.length, 'wallets');
    
    // First, check if any wallet is explicitly marked as Solana
    let wallet = wallets.find(w => {
      const checks = {
        chainId: w.chainId,
        chainType: w.chainType,
        address: w.address,
        isValidSolanaAddress: false,
        walletClientType: w.walletClientType,
        hasPhantom: hasPhantom
      };
      
      // Check if it's a valid Solana address (not starting with 0x)
      if (w.address && !w.address.startsWith('0x')) {
        try {
          new PublicKey(w.address);
          checks.isValidSolanaAddress = true;
        } catch {}
      }
      
      console.log('Wallet check:', checks);
      
      // Return true if this looks like a Solana wallet
      return (
        checks.isValidSolanaAddress ||
        w.chainId === 'solana:mainnet' ||
        w.chainType === 'solana' ||
        (w.walletClientType === 'phantom' && hasPhantom)
      );
    });
    
    // If no Solana wallet found but Phantom is available, create a wrapper
    if (!wallet && hasPhantom && wallets.length > 0) {
      console.log('⚠️ No Solana wallet detected by Privy, but Phantom is available');
      
      // Check if any wallet might be Phantom misidentified as EVM
      const possiblePhantom = wallets.find(w => 
        w.connectorType === 'injected' || 
        w.walletClientType === 'phantom'
      );
      
      if (possiblePhantom) {
        console.log('🔧 Found possible Phantom wallet, creating wrapper');
        // Return a wrapped version that forces Solana behavior
        return {
          ...possiblePhantom,
          _isWrapped: true,
          _originalAddress: possiblePhantom.address,
          address: window.phantom.solana.publicKey?.toString(),
          chainType: 'solana',
          chainId: 'solana:mainnet'
        };
      }
    }
    
    return wallet;
  }, [wallets, hasPhantom]);
  
  // Connect to Solana
  const connectSolana = useCallback(async () => {
    if (!solanaWallet && hasPhantom) {
      console.log('🔄 Attempting direct Phantom connection');
      
      // Connect directly to Phantom
      try {
        await window.phantom.solana.connect();
        const publicKey = window.phantom.solana.publicKey;
        
        if (publicKey) {
          const connection = new Connection(
            import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
          );
          
          return {
            wallet: window.phantom.solana,
            publicKey,
            connection,
            provider: null // Will be created when needed
          };
        }
      } catch (error) {
        console.error('Failed to connect to Phantom directly:', error);
        throw error;
      }
    }
    
    if (!solanaWallet) {
      throw new Error('No Solana wallet found. Please connect Phantom or another Solana wallet.');
    }
    
    // If this is a wrapped wallet, use Phantom directly
    if (solanaWallet._isWrapped && hasPhantom) {
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      );
      
      return {
        wallet: window.phantom.solana,
        publicKey: window.phantom.solana.publicKey,
        connection,
        provider: createPrivyAnchorProvider(window.phantom.solana, connection)
      };
    }
    
    // Otherwise use the Privy adapter
    const connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    const provider = createPrivyAnchorProvider(solanaWallet, connection);
    
    return {
      wallet: solanaWallet,
      publicKey: new PublicKey(solanaWallet.address),
      connection,
      provider
    };
  }, [solanaWallet, hasPhantom]);
  
  return {
    solanaWallet,
    hasSolanaWallet: !!solanaWallet || hasPhantom,
    hasPhantom,
    connectSolana,
    
    // Debug info
    debug: {
      walletsCount: wallets.length,
      hasPhantom,
      solanaWalletFound: !!solanaWallet,
      isWrapped: solanaWallet?._isWrapped
    }
  };
}