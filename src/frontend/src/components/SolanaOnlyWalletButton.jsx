import React, { useState, useRef, useEffect } from 'react';
import { usePrivy, useConnectWallet } from '@privy-io/react-auth';
import { useAppWallet } from '../hooks/useAppWallet';
import { FaWallet, FaSignOutAlt, FaCopy, FaChevronDown } from 'react-icons/fa';
import toast from 'react-hot-toast';

/**
 * Solana-only wallet button that prevents any EVM wallet prompts
 * Only connects wallets when user explicitly clicks
 */
function SolanaOnlyWalletButton() {
  const { authenticated, ready, logout } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { walletAddress } = useAppWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Prevent any auto-connection attempts
  useEffect(() => {
    // Override window.ethereum to prevent MetaMask detection
    if (typeof window !== 'undefined' && window.ethereum) {
      // Store original ethereum object if needed for server-side
      window._originalEthereum = window.ethereum;
      
      // Remove ethereum object to prevent auto-detection
      try {
        delete window.ethereum;
      } catch (e) {
        // If delete fails, override with null
        window.ethereum = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (window._originalEthereum) {
        window.ethereum = window._originalEthereum;
      }
    };
  }, []);
  
  const handleConnect = async () => {
    if (authenticated && walletAddress) {
      // Already connected, show dropdown
      setShowDropdown(!showDropdown);
      return;
    }
    
    try {
      // Connect ONLY Solana wallets
      await connectWallet({
        // Force Solana-only connection
        walletChainType: 'solana',
        // Only show these specific wallets
        walletList: ['phantom', 'solflare', 'backpack'],
        // Prevent any auto-connection
        autoConnect: false,
        // Don't suggest any addresses
        suggestedAddress: undefined
      });
      
      toast.success('Solana wallet connected!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      // User cancelled or error occurred
      if (error.message?.includes('User rejected')) {
        // User cancelled, don't show error
        return;
      }
      
      toast.error('Failed to connect wallet. Please ensure you have a Solana wallet installed.');
    }
  };
  
  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied to clipboard');
      setShowDropdown(false);
    }
  };
  
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    toast.success('Wallet disconnected');
  };
  
  const getButtonText = () => {
    if (!ready) return 'Loading...';
    
    if (authenticated && walletAddress) {
      // Show truncated Solana address
      return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    }
    
    return 'Connect Wallet';
  };
  
  const buttonClasses = `
    flex items-center gap-2 px-4 py-2 
    bg-purple-600 hover:bg-purple-700 
    text-white font-medium rounded-lg 
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleConnect}
        disabled={!ready}
        className={buttonClasses}
      >
        <FaWallet className="w-4 h-4" />
        <span>{getButtonText()}</span>
        {authenticated && walletAddress && <FaChevronDown className="w-3 h-3 ml-1" />}
      </button>
      
      {/* Dropdown Menu */}
      {authenticated && walletAddress && showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Solana Wallet</div>
            <div className="font-mono text-xs text-white">
              {walletAddress}
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-2">
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              <FaCopy className="w-3 h-3" />
              Copy Address
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded transition-colors"
            >
              <FaSignOutAlt className="w-3 h-3" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolanaOnlyWalletButton;