// APES Chrome Extension - Content Script
// Enhances Polymarket UI with APES token benefits

class APESPolymarketEnhancer {
  constructor() {
    this.apiUrl = 'https://api.primape.app'; // Update in production
    this.isConnected = false;
    this.walletAddress = null;
    this.tierData = null;
    this.settings = {
      showSavings: true,
      autoConnect: true
    };
    
    this.init();
  }

  async init() {
    console.log('🦍 APES Market Access Extension Loaded');
    
    // Inject page script
    this.injectPageScript();
    
    // Load user data and settings
    await this.loadUserData();
    
    // Set up message listeners
    this.setupMessageListeners();
    
    // Inject UI elements if connected
    if (this.isConnected) {
      this.injectAPESOverlay();
      this.updateFeeDisplays();
    }
    
    // Monitor for page changes (Polymarket is SPA)
    this.observePageChanges();
    
    // Intercept bet actions
    this.interceptBetActions();
  }

  async loadUserData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['walletAddress', 'isConnected', 'tierData', 'showSavings', 'autoConnect'], (data) => {
        this.walletAddress = data.walletAddress || null;
        this.isConnected = data.isConnected || false;
        this.tierData = data.tierData || null;
        this.settings.showSavings = data.showSavings !== false;
        this.settings.autoConnect = data.autoConnect !== false;
        resolve();
      });
    });
  }

  injectPageScript() {
    // Inject script that runs in page context
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  setupMessageListeners() {
    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'CONNECT_WALLET':
          this.handleWalletConnection()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep channel open
          
        case 'DISCONNECT_WALLET':
          this.handleDisconnect();
          sendResponse({ success: true });
          break;
          
        case 'UPDATE_SETTINGS':
          this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;
          
        case 'PING':
          sendResponse({ success: true });
          break;
      }
    });
    
    // Listen for messages from injected script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      switch (event.data.type) {
        case 'APES_ORDER_INTERCEPT':
          this.handleOrderIntercept(event.data.data);
          break;
          
        case 'APES_WALLET_CHANGED':
          this.handleWalletChange(event.data.data);
          break;
          
        case 'APES_INJECT_READY':
          console.log('Page script injected successfully');
          break;
      }
    });
  }

  injectAPESOverlay() {
    // Create APES status widget
    const widget = document.createElement('div');
    widget.id = 'apes-widget';
    widget.className = 'apes-widget';
    widget.innerHTML = `
      <div class="apes-widget-header">
        <img src="${chrome.runtime.getURL('icons/apes-48.png')}" alt="APES" />
        <span class="apes-title">APES Benefits</span>
      </div>
      <div class="apes-widget-content">
        ${this.userWallet ? `
          <div class="apes-balance">
            <span class="label">Balance:</span>
            <span class="value">${this.formatNumber(this.apesBalance)} APES</span>
          </div>
          <div class="apes-tier">
            <span class="label">Tier:</span>
            <span class="value tier-${this.feeTier}">${this.getTierName()}</span>
          </div>
          <div class="apes-fee-rate">
            <span class="label">Your Fee:</span>
            <span class="value">${(this.feeRate * 100).toFixed(2)}%</span>
          </div>
          <div class="apes-savings">
            <span class="label">You Save:</span>
            <span class="value savings">${((0.01 - this.feeRate) * 100).toFixed(2)}%</span>
          </div>
        ` : `
          <div class="apes-connect">
            <button class="apes-connect-btn">Connect Wallet</button>
            <p class="apes-info">Connect to see your APES benefits</p>
          </div>
        `}
      </div>
    `;
    
    document.body.appendChild(widget);
    
    // Add click handler for connect button
    const connectBtn = widget.querySelector('.apes-connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleConnect());
    }
  }

  observePageChanges() {
    // Watch for route changes in Polymarket SPA
    const observer = new MutationObserver(() => {
      this.updateFeeDisplays();
      this.interceptBetActions();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  interceptBetActions() {
    // Find all bet/buy buttons
    const betButtons = document.querySelectorAll(
      'button:has-text("Buy"), button:has-text("Sell"), button:has-text("Place Order")'
    );
    
    betButtons.forEach(button => {
      if (button.dataset.apesIntercepted) return;
      
      button.dataset.apesIntercepted = 'true';
      
      // Clone button to remove existing listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add our handler
      newButton.addEventListener('click', (e) => this.handleBetClick(e, newButton));
    });
  }

  updateFeeDisplays() {
    // Find bet input forms
    const betForms = document.querySelectorAll('[data-testid="bet-form"], .bet-panel, .order-form');
    
    betForms.forEach(form => {
      if (form.dataset.apesEnhanced) return;
      
      form.dataset.apesEnhanced = 'true';
      
      // Add APES fee calculator
      const calculator = document.createElement('div');
      calculator.className = 'apes-fee-calculator';
      calculator.innerHTML = `
        <div class="apes-calc-header">
          <img src="${chrome.runtime.getURL('icons/apes-16.png')}" alt="APES" />
          <span>APES Fee Calculator</span>
        </div>
        <div class="apes-calc-body">
          <div class="fee-comparison">
            <div class="standard-fee">
              <span class="label">Without APES:</span>
              <span class="value" id="standard-fee">$0.00</span>
            </div>
            <div class="apes-fee">
              <span class="label">With APES:</span>
              <span class="value" id="apes-fee">$0.00</span>
            </div>
            <div class="fee-savings">
              <span class="label">You Save:</span>
              <span class="value savings" id="fee-savings">$0.00</span>
            </div>
          </div>
        </div>
      `;
      
      // Insert after bet amount input
      const amountInput = form.querySelector('input[type="number"], input[placeholder*="Amount"]');
      if (amountInput) {
        amountInput.parentNode.insertBefore(calculator, amountInput.nextSibling);
        
        // Update calculations on input
        amountInput.addEventListener('input', (e) => {
          this.updateFeeCalculation(e.target.value, calculator);
        });
      }
    });
  }

  updateFeeCalculation(amount, calculator) {
    const betAmount = parseFloat(amount) || 0;
    const standardFee = betAmount * 0.01; // 1% standard
    const apesFee = betAmount * this.feeRate;
    const savings = standardFee - apesFee;
    
    calculator.querySelector('#standard-fee').textContent = `$${standardFee.toFixed(2)}`;
    calculator.querySelector('#apes-fee').textContent = `$${apesFee.toFixed(2)}`;
    calculator.querySelector('#fee-savings').textContent = `$${savings.toFixed(2)}`;
  }

  async handleBetClick(event, button) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.userWallet) {
      this.showConnectPrompt();
      return;
    }
    
    // Get bet details from the form
    const form = button.closest('form, .bet-panel, .order-form');
    const amountInput = form.querySelector('input[type="number"], input[placeholder*="Amount"]');
    const amount = parseFloat(amountInput?.value || 0);
    
    if (!amount || amount <= 0) {
      this.showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    // Get market details
    const marketData = this.extractMarketData();
    
    // Show confirmation modal
    this.showBetConfirmation({
      market: marketData,
      amount: amount,
      fee: amount * this.feeRate,
      savings: amount * (0.01 - this.feeRate),
      side: button.textContent.includes('Buy') ? 'BUY' : 'SELL'
    });
  }

  extractMarketData() {
    // Extract market data from the page
    const urlParts = window.location.pathname.split('/');
    const marketId = urlParts[urlParts.length - 1];
    
    // Try to get market title
    const titleElement = document.querySelector('h1, [data-testid="market-title"]');
    const title = titleElement?.textContent || 'Unknown Market';
    
    // Try to get current odds
    const oddsElements = document.querySelectorAll('[data-testid*="odds"], .market-odds');
    const odds = Array.from(oddsElements).map(el => el.textContent);
    
    return {
      id: marketId,
      title: title,
      odds: odds,
      url: window.location.href
    };
  }

  showBetConfirmation(betData) {
    const modal = document.createElement('div');
    modal.className = 'apes-modal';
    modal.innerHTML = `
      <div class="apes-modal-content">
        <div class="apes-modal-header">
          <h2>Confirm Bet via APES</h2>
          <button class="apes-modal-close">&times;</button>
        </div>
        <div class="apes-modal-body">
          <div class="bet-summary">
            <h3>${betData.market.title}</h3>
            <div class="bet-details">
              <div class="detail-row">
                <span>Side:</span>
                <span class="${betData.side.toLowerCase()}">${betData.side}</span>
              </div>
              <div class="detail-row">
                <span>Amount:</span>
                <span>$${betData.amount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span>Platform Fee:</span>
                <span>$${betData.fee.toFixed(2)} (${(this.feeRate * 100).toFixed(2)}%)</span>
              </div>
              <div class="detail-row savings">
                <span>You're Saving:</span>
                <span>$${betData.savings.toFixed(2)}</span>
              </div>
              <div class="detail-row total">
                <span>Total Cost:</span>
                <span>$${(betData.amount + betData.fee).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div class="tier-benefits">
            <p class="tier-info">
              Your ${this.getTierName()} tier gives you ${((0.01 - this.feeRate) * 100).toFixed(0)}% off platform fees!
            </p>
            ${this.getNextTierInfo()}
          </div>
        </div>
        <div class="apes-modal-footer">
          <button class="apes-btn-cancel">Cancel</button>
          <button class="apes-btn-confirm">Confirm Bet</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event handlers
    modal.querySelector('.apes-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.apes-btn-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('.apes-btn-confirm').addEventListener('click', async () => {
      await this.executeBet(betData);
      modal.remove();
    });
  }

  async executeBet(betData) {
    try {
      // Show loading state
      this.showNotification('Processing your bet...', 'loading');
      
      // Send bet to our backend
      const response = await fetch(`${this.apiUrl}/api/polymarket/place-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Wallet': this.userWallet
        },
        body: JSON.stringify({
          marketId: betData.market.id,
          side: betData.side,
          amount: betData.amount,
          marketUrl: betData.market.url
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification(
          `Bet placed successfully! Saved $${result.savings.toFixed(2)} with APES`,
          'success'
        );
        
        // Refresh the page to show updated positions
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error || 'Failed to place bet');
      }
    } catch (error) {
      this.showNotification(`Error: ${error.message}`, 'error');
    }
  }

  async handleConnect() {
    // Send message to background script to open popup
    chrome.runtime.sendMessage({ action: 'openPopup' });
  }

  showConnectPrompt() {
    this.showNotification('Please connect your wallet to use APES benefits', 'info');
    setTimeout(() => this.handleConnect(), 1000);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `apes-notification apes-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    if (type !== 'loading') {
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
    
    return notification;
  }

  formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  }

  getTierName() {
    const tiers = {
      'platinum': 'Platinum',
      'gold': 'Gold',
      'silver': 'Silver',
      'bronze': 'Bronze',
      'none': 'No Tier'
    };
    return tiers[this.feeTier] || 'No Tier';
  }

  getNextTierInfo() {
    const tierThresholds = [
      { name: 'Bronze', min: 1000, fee: 0.75 },
      { name: 'Silver', min: 10000, fee: 0.5 },
      { name: 'Gold', min: 50000, fee: 0.3 },
      { name: 'Platinum', min: 100000, fee: 0.2 }
    ];
    
    const nextTier = tierThresholds.find(t => t.min > this.apesBalance);
    
    if (nextTier) {
      const needed = nextTier.min - this.apesBalance;
      return `
        <p class="next-tier-info">
          Get ${this.formatNumber(needed)} more APES to reach ${nextTier.name} tier 
          and pay only ${nextTier.fee}% fees!
        </p>
      `;
    }
    
    return '<p class="max-tier-info">You have the highest tier! Enjoy minimum fees.</p>';
  }
}

// Initialize the enhancer
const apes = new APESPolymarketEnhancer();

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateUserData') {
    apes.userWallet = request.wallet;
    apes.apesBalance = request.balance;
    apes.feeRate = request.feeRate;
    apes.feeTier = request.tier;
    
    // Re-render UI
    document.getElementById('apes-widget')?.remove();
    apes.injectAPESOverlay();
    apes.updateFeeDisplays();
  }
});