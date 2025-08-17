// Secure Access Control Configuration
// Admin authentication is now handled server-side for security

import { useState, useEffect } from 'react';

// Cache for admin status to avoid repeated API calls
let adminStatusCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Securely check if a wallet is authorized for admin access
 * This now queries the backend API instead of checking hardcoded wallets
 * @param {string} walletAddress - The wallet address to check
 * @returns {Promise<boolean>} - Whether the wallet is authorized
 */
export const isWalletAuthorized = async (walletAddress) => {
  if (!walletAddress) {
    console.log('🔐 No wallet address provided for authorization check');
    return false;
  }

  const walletStr = walletAddress.toString();
  
  // Check cache first
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_DURATION && adminStatusCache.has(walletStr)) {
    const cached = adminStatusCache.get(walletStr);
    console.log('🔐 Using cached admin status for:', walletStr, '- Authorized:', cached);
    return cached;
  }

  try {
    console.log('🔐 Checking admin authorization for wallet:', walletStr);
    
    const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/admin/check-authorization`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletStr,
      },
    });

    if (!response.ok) {
      console.warn('🔐 Admin authorization check failed:', response.status);
      return false;
    }

    const data = await response.json();
    const isAuthorized = data.authorized === true;

    // Cache the result
    adminStatusCache.set(walletStr, isAuthorized);
    cacheTimestamp = now;

    console.log('🔐 Admin authorization result:', {
      wallet: walletStr,
      authorized: isAuthorized,
      role: data.role || 'user'
    });

    return isAuthorized;

  } catch (error) {
    console.error('🔐 Error checking admin authorization:', error);
    return false;
  }
};

/**
 * React hook for admin authorization checking
 * @param {string} walletAddress - The wallet address to check
 * @returns {Object} - { isAuthorized, isLoading, error }
 */
export const useAdminAuthorization = (walletAddress) => {
  const [authState, setAuthState] = useState({
    isAuthorized: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!walletAddress) {
      setAuthState({
        isAuthorized: false,
        isLoading: false,
        error: null
      });
      return;
    }

    const checkAuthorization = async () => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        const authorized = await isWalletAuthorized(walletAddress);
        setAuthState({
          isAuthorized: authorized,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('🔐 Admin authorization hook error:', error);
        setAuthState({
          isAuthorized: false,
          isLoading: false,
          error: error.message
        });
      }
    };

    checkAuthorization();
  }, [walletAddress]);

  return authState;
};

/**
 * Clear the admin authorization cache
 * Call this when admin permissions might have changed
 */
export const clearAdminCache = () => {
  adminStatusCache.clear();
  cacheTimestamp = 0;
  console.log('🔐 Admin authorization cache cleared');
};

/**
 * Legacy compatibility function
 * @deprecated Use isWalletAuthorized() instead
 */
export const getAuthorizedWallets = () => {
  console.warn('🔐 getAuthorizedWallets() is deprecated for security reasons. Use isWalletAuthorized() instead.');
  return []; // Return empty array instead of exposing admin wallets
}; 