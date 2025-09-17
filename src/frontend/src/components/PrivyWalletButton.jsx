import React, { useState, useRef, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMultiChainWallet } from '../hooks/useMultiChainWallet';
import { FaWallet, FaSignOutAlt, FaCopy, FaChevronDown } from 'react-icons/fa';
import toast from 'react-hot-toast';

function PrivyWalletButton() {
  const { authenticated, ready, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { addresses, hasSolanaWallet, hasPolygonWallet } = useMultiChainWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Debug: Check addresses structure
  React.useEffect(() => {
    if (addresses) {
      console.log('PrivyWalletButton addresses:', addresses);
      console.log('Type of addresses:', typeof addresses);
      console.log('addresses.solana type:', typeof addresses.solana);
      console.log('addresses.polygon type:', typeof addresses.polygon);
    }
  }, [addresses]);
  
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
  
  const handleClick = async () => {
    if (authenticated) {
      setShowDropdown(!showDropdown);
    } else {
      // Open Privy login modal
      await login();
    }
  };
  
  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };
  
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };
  
  const getButtonText = () => {
    if (!ready) return 'Loading...';
    
    if (authenticated && addresses && addresses.solana) {
      // Show truncated address
      const addr = addresses.solana;
      // Ensure addr is a string
      if (typeof addr === 'string') {
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
      }
    }
    
    return 'Select Wallet';
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
        onClick={handleClick}
        disabled={!ready}
        className={buttonClasses}
      >
        <FaWallet className="w-4 h-4" />
        <span>{getButtonText()}</span>
        {authenticated && <FaChevronDown className="w-3 h-3 ml-1" />}
      </button>
      
      {/* Dropdown Menu */}
      {authenticated && showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Connected with</div>
            <div className="text-sm font-medium text-white">
              {user?.email || user?.twitter?.username || 'Wallet'}
            </div>
          </div>
          
          {/* Wallet Addresses */}
          <div className="p-2">
            {addresses && addresses.solana && typeof addresses.solana === 'string' && (
              <div className="p-2 hover:bg-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-gray-400">Solana</div>
                    <div className="font-mono text-xs text-white">
                      {`${addresses.solana.slice(0, 6)}...${addresses.solana.slice(-4)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyAddress(addresses.solana)}
                    className="p-1.5 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                  >
                    <FaCopy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            
            {addresses && addresses.polygon && typeof addresses.polygon === 'string' && (
              <div className="p-2 hover:bg-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-gray-400">Polygon</div>
                    <div className="font-mono text-xs text-white">
                      {`${addresses.polygon.slice(0, 6)}...${addresses.polygon.slice(-4)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyAddress(addresses.polygon)}
                    className="p-1.5 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                  >
                    <FaCopy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="p-2 border-t border-gray-700">
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

export default PrivyWalletButton;