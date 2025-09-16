// Injected script that runs in the page context
// This can access the window object and Polymarket's JavaScript

(function() {
  'use strict';
  
  // Flag to prevent multiple injections
  if (window.__apesMarketAccessInjected) return;
  window.__apesMarketAccessInjected = true;
  
  console.log('APES Market Access: Injected into Polymarket');
  
  // Intercept Polymarket order placement
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Check if this is an order placement request
    if (url && url.includes('/order') && options && options.method === 'POST') {
      // Notify content script about the order attempt
      window.postMessage({
        type: 'APES_ORDER_INTERCEPT',
        data: {
          url,
          body: options.body
        }
      }, '*');
      
      // Wait for approval from extension
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Timeout after 5 seconds, proceed with original request
          originalFetch.apply(this, args).then(resolve).catch(reject);
        }, 5000);
        
        window.addEventListener('message', function handler(event) {
          if (event.data.type === 'APES_ORDER_APPROVED' && event.data.requestId === url) {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            
            if (event.data.approved) {
              // Proceed with modified request if needed
              originalFetch.apply(this, args).then(resolve).catch(reject);
            } else {
              reject(new Error('Order cancelled by APES Market Access'));
            }
          }
        });
      });
    }
    
    // For non-order requests, proceed normally
    return originalFetch.apply(this, args);
  };
  
  // Listen for wallet connection events
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      window.postMessage({
        type: 'APES_WALLET_CHANGED',
        data: { accounts }
      }, '*');
    });
  }
  
  // Expose APES integration status
  window.APESMarketAccess = {
    version: '1.0.0',
    isActive: true,
    
    // Get current market data
    getCurrentMarket() {
      // Extract market ID from URL or page
      const match = window.location.pathname.match(/\/market\/([^\/]+)/);
      return match ? match[1] : null;
    },
    
    // Get user's selected outcome
    getSelectedOutcome() {
      // Find selected outcome from UI
      const selected = document.querySelector('.outcome-selector.selected');
      return selected ? selected.dataset.outcome : null;
    },
    
    // Show fee savings overlay
    showFeeSavings(amount) {
      const overlay = document.createElement('div');
      overlay.className = 'apes-savings-notification';
      overlay.textContent = `You saved $${amount.toFixed(2)} with APES!`;
      overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      `;
      
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        overlay.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => overlay.remove(), 300);
      }, 3000);
    }
  };
  
  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Notify content script that injection is complete
  window.postMessage({ type: 'APES_INJECT_READY' }, '*');
})();