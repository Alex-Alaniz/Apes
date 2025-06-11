import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { FaMoon, FaSun } from 'react-icons/fa';
import { isWalletAuthorized } from '../config/access';
import { useTheme } from '../contexts/ThemeContext';
import PointsWidget from './PointsWidget';

const Navbar = () => {
  const location = useLocation();
  const { publicKey } = useWallet();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Check if current wallet is authorized
  const isAuthorized = publicKey && isWalletAuthorized(publicKey.toString());
  
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
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
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
    </nav>
  );
};

export default Navbar;
