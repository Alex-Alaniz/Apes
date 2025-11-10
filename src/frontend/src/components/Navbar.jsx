import React, { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaMoon, FaSun } from 'react-icons/fa';
import { isWalletAuthorized } from '../config/access';
import { useTheme } from '../contexts/ThemeContext';
import PointsWidget from './PointsWidget';
import WalletButton from './WalletButton';
import { useAppWallet } from '../hooks/useAppWallet';
import DepositModal from './DepositModal';

// Lazy load Privy button to avoid errors when disabled
const PrivySolanaWalletButton = lazy(() => import('./PrivySolanaWalletButton'));

const Navbar = () => {
  const location = useLocation();
  const { walletAddress } = useAppWallet();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Determine if Privy is enabled
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  // Check if current wallet is authorized
  const isAuthorized = walletAddress && isWalletAuthorized(walletAddress);
  
  const isActive = (path) => {
    return location.pathname === path ? 'text-purple-400' : 'text-gray-300 hover:text-white';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800 dark:bg-gray-950 border-b border-gray-700 dark:border-gray-800 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/primape/Asset 8@3x.png" 
              alt="PRIMAPE Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-semibold text-white">PRIMAPE Markets</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/markets" className={`${isActive('/markets')} transition-colors`}>
              Markets
            </Link>
            <Link to="/tournaments" className={`${isActive('/tournaments')} transition-colors`}>
              Tournaments
            </Link>
            <Link to="/daily-crypto" className={`${isActive('/daily-crypto')} transition-colors flex items-center gap-1`}>
              <span>🔮</span> Daily Crypto
            </Link>
            <Link to="/livestreams" className={`${isActive('/livestreams')} transition-colors flex items-center gap-1`}>
              <span>🎥</span> Livestreams
            </Link>
            <Link to="/leaderboard" className={`${isActive('/leaderboard')} transition-colors`}>
              Leaderboard
            </Link>
            <Link to="/profile" className={`${isActive('/profile')} transition-colors`}>
              Profile
            </Link>
            {isAuthorized && (
              <Link to="/admin" className={`${isActive('/admin')} transition-colors`}>
                Admin
              </Link>
            )}
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-300 hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
            </button>
            <PointsWidget />
            
            {/* Deposit Button - Show only when wallet connected */}
            {walletAddress && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Deposit
              </button>
            )}
            
            {isPrivyEnabled ? (
              <Suspense fallback={<div className="px-4 py-2">Loading...</div>}>
                <PrivySolanaWalletButton />
              </Suspense>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden border-t border-gray-700 dark:border-gray-800 pb-3 pt-3">
          <div className="flex flex-wrap gap-4">
            <Link to="/markets" className={`${isActive('/markets')} transition-colors`}>
              Markets
            </Link>
            <Link to="/tournaments" className={`${isActive('/tournaments')} transition-colors`}>
              Tournaments
            </Link>
            <Link to="/livestreams" className={`${isActive('/livestreams')} transition-colors`}>
              Livestreams
            </Link>
            <Link to="/leaderboard" className={`${isActive('/leaderboard')} transition-colors`}>
              Leaderboard
            </Link>
            <Link to="/profile" className={`${isActive('/profile')} transition-colors`}>
              Profile
            </Link>
            {isAuthorized && (
              <Link to="/admin" className={`${isActive('/admin')} transition-colors`}>
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Deposit Modal */}
      <DepositModal 
        isOpen={showDepositModal} 
        onClose={() => setShowDepositModal(false)} 
      />
    </nav>
  );
};

export default Navbar;
