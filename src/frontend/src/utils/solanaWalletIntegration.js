import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallet as useSolanaAdapterWallet } from '@solana/wallet-adapter-react';
import { createPrivyAnchorProvider, isPrivySolanaWallet } from './privySolanaAdapter';

/**
 * Solana wallet integration for APES markets
 * Ensures we use Solana wallets for Solana transactions
 * Works with both Privy and standard Solana wallet adapters
 */

// Get Solana provider for Anchor
export async function getSolanaProvider(wallet, connection) {
  if (!wallet) {
    throw new Error('No Solana wallet connected');
  }

  // For standard Solana wallet adapters (Phantom, Solflare via wallet-adapter)
  if (wallet.signTransaction && wallet.publicKey && !wallet.chainType) {
    console.log('Using standard Solana wallet adapter');
    return new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
  }

  // For Privy wallets - use the new adapter
  if (wallet.address) {
    console.log('Checking Privy wallet:', {
      address: wallet.address,
      walletClientType: wallet.walletClientType,
      chainType: wallet.chainType,
      isSolana: isPrivySolanaWallet(wallet)
    });
    
    if (isPrivySolanaWallet(wallet)) {
      // Use the Privy Solana adapter
      return createPrivyAnchorProvider(wallet, connection);
    } else {
      throw new Error(
        `This is an EVM wallet (${wallet.address}). Please connect a Solana wallet like Phantom or Solflare to interact with APES markets.`
      );
    }
  }
  
  throw new Error('Unsupported wallet type. Please use a Solana wallet.');
}

// Hook to get Solana-specific wallet functionality
export function useSolanaWallet() {
  const { wallets } = useWallets(); // Privy wallets
  const solanaAdapterWallet = useSolanaAdapterWallet(); // Standard Solana adapter
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  // Check if we have a Phantom/Solflare wallet from the standard adapter
  const hasStandardSolanaWallet = solanaAdapterWallet?.connected && solanaAdapterWallet?.publicKey;
  
  // If Privy is disabled, use standard Solana adapter
  if (!isPrivyEnabled && hasStandardSolanaWallet) {
    return {
      solanaWallet: solanaAdapterWallet,
      polygonWallet: null,
      hasSolanaWallet: true,
      hasPolygonWallet: false,
      
      getWalletForChain: (chain) => {
        if (chain === 'solana') return solanaAdapterWallet;
        return null;
      },
      
      connectSolana: async () => {
        if (!solanaAdapterWallet.connected) {
          throw new Error('Please connect your Solana wallet first');
        }
        
        const connection = new Connection(
          import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
        );
        
        return {
          connection,
          wallet: solanaAdapterWallet,
          publicKey: solanaAdapterWallet.publicKey,
          provider: await getSolanaProvider(solanaAdapterWallet, connection)
        };
      }
    };
  }
  
  // For Privy mode, check for Solana wallets using the new detection
  const privySolanaWallet = wallets.find(w => {
    const isSolana = isPrivySolanaWallet(w);
    
    // Debug logging
    console.log('Checking wallet:', {
      address: w.address,
      walletClientType: w.walletClientType,
      chainType: w.chainType,
      chainId: w.chainId,
      connectorType: w.connectorType,
      isSolana: isSolana
    });
    
    return isSolana;
  });
  
  // Get Polygon wallet for Polymarket
  const polygonWallet = wallets.find(w => 
    w.chainType === 'evm' && 
    w.chainId === 'eip155:137'
  );
  
  // If we have a Privy Solana wallet
  if (privySolanaWallet) {
    return {
      solanaWallet: privySolanaWallet,
      polygonWallet,
      hasSolanaWallet: true,
      hasPolygonWallet: !!polygonWallet,
      
      getWalletForChain: (chain) => {
        if (chain === 'solana') return privySolanaWallet;
        if (chain === 'polygon') return polygonWallet;
        return null;
      },
      
      connectSolana: async () => {
        const connection = new Connection(
          import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
        );
        
        return {
          connection,
          wallet: privySolanaWallet,
          publicKey: new PublicKey(privySolanaWallet.address),
          provider: await getSolanaProvider(privySolanaWallet, connection)
        };
      }
    };
  }
  
  // No Solana wallet found
  return {
    solanaWallet: null,
    polygonWallet,
    hasSolanaWallet: false,
    hasPolygonWallet: !!polygonWallet,
    
    getWalletForChain: (chain) => {
      if (chain === 'polygon') return polygonWallet;
      return null;
    },
    
    connectSolana: async () => {
      throw new Error('No Solana wallet connected. Please connect Phantom, Solflare, or another Solana wallet.');
    }
  };
}

// Ensure we're using Solana wallet for Solana transactions
export function ensureSolanaWallet(wallet) {
  if (!wallet) {
    throw new Error('No wallet connected');
  }
  
  // Check if it's a Solana wallet
  const isSolanaWallet = 
    wallet.chainType === 'solana' || 
    wallet.chainId === 'solana:mainnet' ||
    wallet.walletClientType === 'phantom' ||
    wallet.walletClientType === 'solflare' ||
    (wallet.address && PublicKey.isOnCurve(wallet.address));
  
  if (!isSolanaWallet) {
    throw new Error(
      'Invalid wallet type. Please connect a Solana wallet (Phantom, Solflare, etc.) to interact with APES markets.'
    );
  }
  
  return wallet;
}