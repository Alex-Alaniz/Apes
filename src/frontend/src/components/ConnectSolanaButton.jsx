import React from 'react';
import { usePrivy, useConnectWallet } from '@privy-io/react-auth';
import { usePrivySolanaWallets } from '../hooks/usePrivySolanaWallets';
import toast from 'react-hot-toast';

/**
 * Button specifically for connecting Solana wallets through Privy
 * Ensures Phantom connects as a Solana wallet, not EVM
 */
export default function ConnectSolanaButton({ className, children }) {
  const { authenticated, login } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { hasSolanaWallet, primarySolanaWallet } = usePrivySolanaWallets();
  
  const handleConnect = async () => {
    try {
      if (!authenticated) {
        // First login
        await login();
        return;
      }
      
      // If already has a Solana wallet, show message
      if (hasSolanaWallet && primarySolanaWallet) {
        toast.success(`Solana wallet already connected: ${primarySolanaWallet.address.slice(0, 8)}...`);
        return;
      }
      
      // Connect wallet with Solana chain type specified
      // This is the key to ensuring Phantom connects as Solana
      await connectWallet({
        walletChainType: 'solana', // Critical: specify Solana only
        // Optional: specify which wallets to show
        suggestedAddress: undefined // Let user choose
      });
      
      toast.success('Solana wallet connected successfully!');
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };
  
  return (
    <button
      onClick={handleConnect}
      className={className || "bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"}
    >
      {children || (hasSolanaWallet ? 'Solana Connected' : 'Connect Solana Wallet')}
    </button>
  );
}