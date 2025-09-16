import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { ethers } from 'ethers';
import { useCallback, useMemo } from 'react';

export function useMultiChainWallet() {
  const { user, authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const solanaWalletAdapter = useSolanaWallet();
  
  // Get Polygon wallet for Polymarket
  const polygonWallet = useMemo(() => 
    wallets.find(w => w.chainId === 'eip155:137'), 
    [wallets]
  );
  
  // Get Solana wallet (prefer Privy embedded, fallback to adapter)
  const privySolanaWallet = useMemo(() => 
    wallets.find(w => w.chainId === 'solana:mainnet'),
    [wallets]
  );
  
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
  const addresses = useMemo(() => ({
    solana: solanaWallet?.publicKey?.toBase58() || privySolanaWallet?.address,
    polygon: polygonWallet?.address
  }), [solanaWallet, privySolanaWallet, polygonWallet]);
  
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