import React, { useState } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { usePrivySolanaAuth } from '../hooks/usePrivySolanaAuth';
import { FaWallet, FaSignOutAlt, FaCopy, FaChevronDown } from 'react-icons/fa';
import toast from 'react-hot-toast';

/**
 * Simplified Privy Solana wallet button
 */
export default function PrivySolanaButton() {
  const { login, logout } = usePrivy();
  const { connected, walletAddress, ready } = usePrivySolanaAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleClick = async () => {
    if (connected && walletAddress) {
      setShowDropdown(!showDropdown);
    } else {
      try {
        await login();
      } catch (error) {
        console.error('Login error:', error);
      }
    }
  };
  
  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied!');
    }
  };
  
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };
  
  const getButtonText = () => {
    if (!ready) return 'Loading...';
    if (connected && walletAddress) {
      return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    }
    return 'Connect Wallet';
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={!ready}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaWallet className="w-4 h-4" />
        <span>{getButtonText()}</span>
        {connected && <FaChevronDown className="w-3 h-3 ml-1" />}
      </button>
      
      {connected && showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Solana Wallet</div>
            <div className="font-mono text-xs text-white break-all">
              {walletAddress}
            </div>
          </div>
          
          <div className="p-2 space-y-1">
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