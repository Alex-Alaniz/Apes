import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import { FaWallet, FaSignOutAlt, FaCopy } from 'react-icons/fa';
import toast from 'react-hot-toast';

/**
 * Privy wallet button for Solana-only connections
 * Properly configured to work with Solana mainnet
 */
export default function PrivySolanaWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Get the Solana wallet
  const solanaWallet = wallets.find(w => w.chainType === 'solana');
  const walletAddress = solanaWallet?.address;
  
  // Log wallet state for debugging
  useEffect(() => {
    console.log('Privy Solana State:', {
      ready,
      authenticated,
      walletsCount: wallets.length,
      solanaWallet: solanaWallet?.address,
      user
    });
  }, [ready, authenticated, wallets, solanaWallet, user]);
  
  const handleConnect = async () => {
    try {
      if (!authenticated) {
        // First login with Privy
        await login();
      } else if (!solanaWallet) {
        // If logged in but no Solana wallet, connect one
        await connectWallet({ suggestedAddress: undefined });
      } else {
        // Show dropdown if already connected
        setShowDropdown(!showDropdown);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };
  
  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied!');
      setShowDropdown(false);
    }
  };
  
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };
  
  const getButtonText = () => {
    if (!ready) return 'Loading...';
    if (authenticated && walletAddress) {
      return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    }
    return 'Connect Wallet';
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest('.wallet-dropdown')) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);
  
  return (
    <div className="relative wallet-dropdown">
      <button
        onClick={handleConnect}
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        disabled={!ready}
      >
        <FaWallet className="w-4 h-4" />
        {getButtonText()}
      </button>
      
      {showDropdown && authenticated && walletAddress && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-50">
          <button
            onClick={handleCopyAddress}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <FaCopy className="w-4 h-4" />
            Copy Address
          </button>
          <hr className="my-2 border-gray-700" />
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <FaSignOutAlt className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}