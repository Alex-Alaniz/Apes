import React, { useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * Enhanced wallet button with connection retry logic
 * Fixes issue where Phantom doesn't connect on first click
 */
export default function WalletButton() {
  const { wallet, connect, connecting, connected, publicKey } = useWallet();
  
  // Monitor wallet selection and force connection
  useEffect(() => {
    if (wallet && !connecting && !connected) {
      console.log('Wallet selected but not connected, attempting connection...', wallet.adapter.name);
      
      // Small delay to ensure wallet is ready
      const timer = setTimeout(() => {
        if (wallet && !connected && !connecting) {
          connect().catch(err => {
            console.error('Failed to connect wallet:', err);
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [wallet, connect, connecting, connected]);
  
  // Log connection state changes
  useEffect(() => {
    console.log('Wallet state:', {
      walletName: wallet?.adapter?.name,
      connecting,
      connected,
      publicKey: publicKey?.toString()
    });
  }, [wallet, connecting, connected, publicKey]);
  
  // Custom click handler to ensure connection
  const handleClick = useCallback(() => {
    if (wallet && !connected && !connecting) {
      console.log('Manual connect attempt for:', wallet.adapter.name);
      connect().catch(err => {
        console.error('Manual connection failed:', err);
      });
    }
  }, [wallet, connected, connecting, connect]);
  
  return (
    <WalletMultiButton 
      className="!bg-purple-600 hover:!bg-purple-700"
    />
  );
}