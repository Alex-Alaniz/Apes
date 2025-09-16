// Background service worker for APES Market Access

const API_URL = 'https://api.primape.app'; // Update in production

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('APES Market Access installed:', details);
  
  // Set default settings
  chrome.storage.local.get(['autoConnect', 'showSavings'], (result) => {
    if (result.autoConnect === undefined) {
      chrome.storage.local.set({
        autoConnect: true,
        showSavings: true,
        installedAt: Date.now()
      });
    }
  });
  
  // Create context menu items
  chrome.contextMenus.create({
    id: 'apes-quick-bet',
    title: 'Quick Bet with APES',
    contexts: ['selection'],
    documentUrlPatterns: ['*://polymarket.com/*']
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type);
  
  switch (request.type) {
    case 'FETCH_USER_TIER':
      fetchUserTier(request.walletAddress)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response
      
    case 'PLACE_ORDER':
      placeOrder(request.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'CHECK_CONNECTION':
      chrome.storage.local.get(['walletAddress', 'isConnected'], (result) => {
        sendResponse(result);
      });
      return true;
      
    case 'TRACK_EVENT':
      trackEvent(request.event, request.properties);
      sendResponse({ success: true });
      break;
      
    case 'UPDATE_BADGE':
      updateBadge(request.data);
      sendResponse({ success: true });
      break;
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'apes-quick-bet' && info.selectionText) {
    // Send message to content script to handle quick bet
    chrome.tabs.sendMessage(tab.id, {
      type: 'QUICK_BET',
      selectedText: info.selectionText
    });
  }
});

// Monitor Polymarket tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('polymarket.com')) {
    // Check if we should auto-inject
    chrome.storage.local.get(['autoConnect', 'isConnected'], (result) => {
      if (result.autoConnect && result.isConnected) {
        // Inject content script if not already injected
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not injected, inject it
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            });
          }
        });
      }
    });
  }
});

// Fetch user tier from API
async function fetchUserTier(walletAddress) {
  try {
    const response = await fetch(`${API_URL}/api/polymarket/user-tier`, {
      headers: {
        'x-wallet-address': walletAddress
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user tier');
    }
    
    const data = await response.json();
    
    // Cache tier data
    await chrome.storage.local.set({
      tierData: data,
      tierDataUpdatedAt: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching tier:', error);
    throw error;
  }
}

// Place order through proxy
async function placeOrder(orderData) {
  try {
    const { walletAddress } = await chrome.storage.local.get(['walletAddress']);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    
    const response = await fetch(`${API_URL}/api/polymarket/place-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to place order');
    }
    
    const result = await response.json();
    
    // Update badge with savings
    if (result.feeSavings > 0) {
      updateBadge({ 
        text: `$${result.feeSavings.toFixed(0)}`, 
        color: '#10b981' 
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
}

// Update extension badge
function updateBadge(data) {
  if (data.text) {
    chrome.action.setBadgeText({ text: data.text });
  }
  if (data.color) {
    chrome.action.setBadgeBackgroundColor({ color: data.color });
  }
}

// Track events for analytics
function trackEvent(eventName, properties = {}) {
  // In production, send to analytics service
  console.log('Event tracked:', eventName, properties);
  
  // Store locally for now
  chrome.storage.local.get(['events'], (result) => {
    const events = result.events || [];
    events.push({
      name: eventName,
      properties,
      timestamp: Date.now()
    });
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    
    chrome.storage.local.set({ events });
  });
}

// Periodic tasks
chrome.alarms.create('updateTierData', { periodInMinutes: 30 });
chrome.alarms.create('cleanupStorage', { periodInMinutes: 1440 }); // Daily

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'updateTierData':
      // Update tier data if connected
      const { walletAddress, isConnected } = await chrome.storage.local.get(['walletAddress', 'isConnected']);
      if (walletAddress && isConnected) {
        try {
          await fetchUserTier(walletAddress);
        } catch (error) {
          console.error('Failed to update tier data:', error);
        }
      }
      break;
      
    case 'cleanupStorage':
      // Clean up old data
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      chrome.storage.local.get(['events'], (result) => {
        if (result.events) {
          const filteredEvents = result.events.filter(e => e.timestamp > oneWeekAgo);
          chrome.storage.local.set({ events: filteredEvents });
        }
      });
      break;
  }
});

// Handle extension icon click (when popup is not set)
chrome.action.onClicked.addListener(async (tab) => {
  // This only fires if there's no popup set in manifest
  // Could be used to toggle extension on/off
});

// Web request handling for API integration
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Monitor Polymarket API requests for integration
    console.log('Polymarket API request:', details.url);
  },
  { urls: ['*://clob.polymarket.com/*', '*://polymarket.com/api/*'] },
  ['requestBody']
);

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});