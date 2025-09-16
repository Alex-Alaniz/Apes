// Configuration
const API_URL = 'https://api.primape.app'; // Update in production
const APES_TOKEN_MINT = '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts';

// State
let walletAddress = null;
let isConnected = false;

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  walletSection: document.getElementById('walletSection'),
  connectSection: document.getElementById('connectSection'),
  statsSection: document.getElementById('statsSection'),
  connectWallet: document.getElementById('connectWallet'),
  disconnect: document.getElementById('disconnect'),
  walletAddress: document.getElementById('walletAddress'),
  copyAddress: document.getElementById('copyAddress'),
  apesBalance: document.getElementById('apesBalance'),
  userTier: document.getElementById('userTier'),
  feeRate: document.getElementById('feeRate'),
  totalSavings: document.getElementById('totalSavings'),
  totalVolume: document.getElementById('totalVolume'),
  openPositions: document.getElementById('openPositions'),
  winRate: document.getElementById('winRate'),
  totalPnl: document.getElementById('totalPnl'),
  autoConnect: document.getElementById('autoConnect'),
  showSavings: document.getElementById('showSavings')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkConnection();
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.local.get(['autoConnect', 'showSavings']);
  elements.autoConnect.checked = settings.autoConnect !== false;
  elements.showSavings.checked = settings.showSavings !== false;
}

// Check if wallet is already connected
async function checkConnection() {
  const stored = await chrome.storage.local.get(['walletAddress', 'isConnected']);
  
  if (stored.walletAddress && stored.isConnected) {
    walletAddress = stored.walletAddress;
    isConnected = true;
    await updateUI();
    await fetchUserData();
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.connectWallet.addEventListener('click', handleConnect);
  elements.disconnect.addEventListener('click', handleDisconnect);
  elements.copyAddress.addEventListener('click', handleCopyAddress);
  elements.autoConnect.addEventListener('change', handleSettingChange);
  elements.showSavings.addEventListener('change', handleSettingChange);
}

// Handle wallet connection
async function handleConnect() {
  try {
    elements.connectWallet.disabled = true;
    elements.connectWallet.textContent = 'Connecting...';
    
    // Send message to content script to initiate connection
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { 
      type: 'CONNECT_WALLET' 
    }, async (response) => {
      if (response && response.success) {
        walletAddress = response.walletAddress;
        isConnected = true;
        
        // Store connection info
        await chrome.storage.local.set({
          walletAddress,
          isConnected: true,
          connectedAt: Date.now()
        });
        
        await updateUI();
        await fetchUserData();
        showMessage('Wallet connected successfully!');
      } else {
        showMessage(response?.error || 'Failed to connect wallet', true);
        elements.connectWallet.disabled = false;
        elements.connectWallet.textContent = 'Connect Wallet';
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    showMessage('Connection failed. Please try again.', true);
    elements.connectWallet.disabled = false;
    elements.connectWallet.textContent = 'Connect Wallet';
  }
}

// Handle disconnect
async function handleDisconnect() {
  if (confirm('Are you sure you want to disconnect your wallet?')) {
    walletAddress = null;
    isConnected = false;
    
    await chrome.storage.local.remove(['walletAddress', 'isConnected', 'connectedAt']);
    
    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { type: 'DISCONNECT_WALLET' });
    
    updateUI();
    showMessage('Wallet disconnected');
  }
}

// Handle copy address
function handleCopyAddress() {
  if (walletAddress) {
    navigator.clipboard.writeText(walletAddress).then(() => {
      showMessage('Address copied!');
    });
  }
}

// Handle settings change
async function handleSettingChange(event) {
  const setting = event.target.id;
  const value = event.target.checked;
  
  await chrome.storage.local.set({ [setting]: value });
  
  // Notify content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { 
    type: 'UPDATE_SETTINGS',
    settings: { [setting]: value }
  });
}

// Update UI based on connection state
function updateUI() {
  if (isConnected && walletAddress) {
    // Update status
    elements.connectionStatus.querySelector('.status-indicator').classList.add('connected');
    elements.connectionStatus.querySelector('.status-text').textContent = 'Connected';
    
    // Show/hide sections
    elements.connectSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    elements.statsSection.classList.remove('hidden');
    elements.disconnect.classList.remove('hidden');
    
    // Display wallet address
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    elements.walletAddress.textContent = shortAddress;
  } else {
    // Update status
    elements.connectionStatus.querySelector('.status-indicator').classList.remove('connected');
    elements.connectionStatus.querySelector('.status-text').textContent = 'Not Connected';
    
    // Show/hide sections
    elements.connectSection.classList.remove('hidden');
    elements.walletSection.classList.add('hidden');
    elements.statsSection.classList.add('hidden');
    elements.disconnect.classList.add('hidden');
  }
}

// Fetch user data from API
async function fetchUserData() {
  try {
    // Fetch tier info
    const tierResponse = await fetch(`${API_URL}/api/polymarket/user-tier`, {
      headers: {
        'x-wallet-address': walletAddress
      }
    });
    
    if (tierResponse.ok) {
      const tierData = await tierResponse.json();
      elements.apesBalance.textContent = formatNumber(tierData.apesBalance);
      elements.userTier.textContent = tierData.tier;
      elements.feeRate.textContent = `${tierData.feeRate}%`;
    }
    
    // Fetch stats
    const statsResponse = await fetch(`${API_URL}/api/polymarket/stats/user/${walletAddress}`);
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      elements.totalVolume.textContent = `$${formatNumber(stats.totalVolume || 0)}`;
      elements.openPositions.textContent = stats.openPositions || '0';
      elements.winRate.textContent = `${stats.winRate || 0}%`;
      elements.totalSavings.textContent = `$${formatNumber(stats.totalSavings || 0)}`;
      
      // Update P&L with color
      const pnlElement = elements.totalPnl;
      const pnl = stats.totalPnl || 0;
      pnlElement.textContent = `$${formatNumber(Math.abs(pnl))}`;
      pnlElement.classList.toggle('negative', pnl < 0);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Format number with commas
function formatNumber(num) {
  if (typeof num === 'string') num = parseFloat(num);
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Show message
function showMessage(text, isError = false) {
  const message = document.createElement('div');
  message.className = `message ${isError ? 'error' : ''}`;
  message.textContent = text;
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.remove();
  }, 3000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_STATS') {
    // Update stats in real-time
    if (request.stats) {
      Object.entries(request.stats).forEach(([key, value]) => {
        if (elements[key]) {
          elements[key].textContent = value;
        }
      });
    }
  }
});