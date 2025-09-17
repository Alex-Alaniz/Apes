import { useEffect } from 'react';

/**
 * Component that blocks EVM wallet detection and auto-connection
 * Prevents MetaMask and other EVM wallets from being triggered
 */
export default function EVMWalletBlocker({ children }) {
  useEffect(() => {
    // Block window.ethereum access to prevent MetaMask auto-detection
    if (typeof window !== 'undefined') {
      // Store original ethereum object if it exists
      const originalEthereum = window.ethereum;
      
      // Create a proxy that blocks access
      const ethereumProxy = new Proxy({}, {
        get: function(target, prop) {
          console.warn('Blocked access to window.ethereum.' + prop);
          return undefined;
        },
        has: function() {
          return false;
        }
      });
      
      // Override window.ethereum
      Object.defineProperty(window, 'ethereum', {
        get: function() {
          // Return undefined to indicate no ethereum provider
          return undefined;
        },
        set: function() {
          // Prevent setting ethereum
          console.warn('Blocked attempt to set window.ethereum');
        },
        configurable: true
      });
      
      // Also block other common EVM wallet properties
      const walletProperties = [
        'web3',
        'Web3',
        'tronWeb',
        'tronLink',
        'ethereum',
        'okxwallet',
        'coinbaseWalletExtension'
      ];
      
      walletProperties.forEach(prop => {
        if (window[prop]) {
          try {
            delete window[prop];
          } catch {
            Object.defineProperty(window, prop, {
              value: undefined,
              configurable: true
            });
          }
        }
      });
      
      // Cleanup function
      return () => {
        // Optionally restore original ethereum on unmount
        // But for this app, we want to keep it blocked
      };
    }
  }, []); // Run once on mount
  
  return children;
}