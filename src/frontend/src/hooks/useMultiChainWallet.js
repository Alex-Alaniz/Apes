import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { isPrivySolanaWallet } from '../utils/privySolanaAdapter';

export function useMultiChainWallet() {
  const { user, authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const solanaWalletAdapter = useSolanaWallet();
  
  // No Polygon wallet in frontend - only server-side
  const polygonWallet = null;
  
  // Get Solana wallet (prefer Privy embedded, fallback to adapter)
  const privySolanaWallet = useMemo(() => {
    // Debug: Log all wallets to see what Privy returns
    console.log('All Privy wallets:', wallets.map(w => ({
      address: w.address,
      walletClientType: w.walletClientType,
      chainType: w.chainType,
      chainId: w.chainId,
      connectorType: w.connectorType,
      isSolana: isPrivySolanaWallet(w)
    })));
    
    // Use the new detection method
    return wallets.find(w => isPrivySolanaWallet(w));
  }, [wallets]);
  
  // Use Privy Solana wallet if available, otherwise use adapter
  const solanaWallet = privySolanaWallet || (solanaWalletAdapter.connected ? solanaWalletAdapter : null);
  
  // Connect or create wallet
  const connectWallet = useCallback(async (chain = 'both') => {
    if (!authenticated) {
      await login();
      return;
    }
    
    // After login, wallets should be automatically created if configured
    // Check if we need to manually create wallets
    if (chain === 'polygon' || chain === 'both') {
      if (!polygonWallet && authenticated) {
        console.log('Polygon wallet will be created automatically');
      }
    }
    
    if (chain === 'solana' || chain === 'both') {
      if (!privySolanaWallet && authenticated) {
        console.log('Solana wallet will be created automatically');
      }
    }
  }, [authenticated, login, polygonWallet, privySolanaWallet]);
  
  // Get ethers signer for Polygon transactions
  const getPolygonSigner = useCallback(async () => {
    if (!polygonWallet) {
      throw new Error('No Polygon wallet connected');
    }
    
    const provider = await polygonWallet.getEthersProvider();
    return provider.getSigner();
  }, [polygonWallet]);
  
  // Sign message with appropriate wallet
  const signMessage = useCallback(async (message, chain = 'solana') => {
    if (chain === 'polygon' && polygonWallet) {
      const signer = await getPolygonSigner();
      return await signer.signMessage(message);
    } else if (chain === 'solana') {
      if (privySolanaWallet) {
        // Use Privy Solana wallet
        const signature = await privySolanaWallet.signMessage(
          new TextEncoder().encode(message)
        );
        return Buffer.from(signature).toString('base64');
      } else if (solanaWalletAdapter.signMessage) {
        // Fallback to adapter
        const signature = await solanaWalletAdapter.signMessage(
          new TextEncoder().encode(message)
        );
        return Buffer.from(signature).toString('base64');
      }
    }
    
    throw new Error(`No ${chain} wallet connected`);
  }, [polygonWallet, privySolanaWallet, solanaWalletAdapter, getPolygonSigner]);
  
  // Get wallet addresses
  const addresses = useMemo(() => {
    let solanaAddress = null;
    let polygonAddress = null;
    
    // Try to get Solana address from Privy first
    if (privySolanaWallet?.address) {
      // Ensure it's a string, not an object
      const addr = privySolanaWallet.address;
      solanaAddress = typeof addr === 'string' ? addr : (addr?.address || null);
      
      // Debug logging
      if (typeof addr !== 'string') {
        console.warn('Privy Solana wallet address is not a string:', addr);
      }
    } 
    // Only try wallet adapter if Privy is not enabled
    else if (solanaWallet && solanaWallet.publicKey && typeof solanaWallet.publicKey.toBase58 === 'function') {
      try {
        solanaAddress = solanaWallet.publicKey.toBase58();
      } catch (e) {
        console.log('Error getting Solana address from adapter:', e);
      }
    }
    
    // Get Polygon address
    if (polygonWallet?.address) {
      const addr = polygonWallet.address;
      polygonAddress = typeof addr === 'string' ? addr : (addr?.address || null);
      
      // Debug logging
      if (typeof addr !== 'string') {
        console.warn('Privy Polygon wallet address is not a string:', addr);
      }
    }
    
    return {
      solana: solanaAddress,
      polygon: polygonAddress
    };
  }, [solanaWallet, privySolanaWallet, polygonWallet]);
  
  // Check balances
  const getBalances = useCallback(async () => {
    const balances = {
      solana: null,
      polygon: null,
      usdc: null
    };
    
    // TODO: Implement balance checking
    // This would connect to your backend or directly to blockchain
    
    return balances;
  }, []);
  
  return {
    // Auth state
    authenticated,
    ready,
    user,
    login,
    logout,
    
    // Wallets
    solanaWallet,
    polygonWallet,
    wallets,
    addresses,
    
    // Actions
    connectWallet,
    getPolygonSigner,
    signMessage,
    getBalances,
    
    // Status
    hasPolygonWallet: !!polygonWallet,
    hasSolanaWallet: !!solanaWallet || !!privySolanaWallet,
    isPrivySolanaWallet: !!privySolanaWallet,
    isExternalSolanaWallet: !privySolanaWallet && !!solanaWallet,
  };
}