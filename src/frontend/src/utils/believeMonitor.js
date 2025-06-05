// Utility to monitor and display Believe API responses
class BelieveMonitor {
  constructor() {
    this.burns = [];
    this.enabled = true;
  }

  // Add a burn response to the monitor
  addBurn(type, response) {
    if (!this.enabled) return;
    
    const burn = {
      id: Date.now(),
      type,
      timestamp: new Date().toISOString(),
      ...response
    };
    
    this.burns.unshift(burn); // Add to beginning
    this.displayBurn(burn);
    
    // Keep only last 10 burns
    if (this.burns.length > 10) {
      this.burns = this.burns.slice(0, 10);
    }
  }

  // Display burn in console with formatting
  displayBurn(burn) {
    console.group(`🔥 BELIEVE BURN: ${burn.type}`);
    console.log(`📅 Time: ${new Date(burn.timestamp).toLocaleTimeString()}`);
    
    if (burn.success) {
      console.log(`✅ Status: SUCCESS`);
      if (burn.data) {
        console.log(`📋 Result: ${burn.data.result}`);
        console.log(`🔗 Burn TxHash: ${burn.data.txHash}`);
        console.log(`#️⃣ Hash: ${burn.data.hash}`);
        console.log(`🏷️ Type: ${burn.data.type}`);
        console.log(`⏰ Date Burned: ${burn.data.dateBurned}`);
        console.log(`🔍 View on Solscan: https://solscan.io/tx/${burn.data.txHash}`);
      }
    } else {
      console.log(`❌ Status: FAILED`);
      console.log(`📝 Message: ${burn.message}`);
      if (burn.error) {
        console.log(`🚨 Error: ${burn.error}`);
      }
    }
    
    console.groupEnd();
  }

  // Get all burns
  getBurns() {
    return this.burns;
  }

  // Get last burn
  getLastBurn() {
    return this.burns[0] || null;
  }

  // Clear all burns
  clear() {
    this.burns = [];
    console.log('🧹 Believe monitor cleared');
  }

  // Toggle monitoring
  toggle() {
    this.enabled = !this.enabled;
    console.log(`📊 Believe monitoring ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  // Display summary
  summary() {
    console.group('📊 BELIEVE BURN SUMMARY');
    console.log(`Total burns: ${this.burns.length}`);
    
    const successful = this.burns.filter(b => b.success).length;
    const failed = this.burns.filter(b => !b.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (this.burns.length > 0) {
      console.log('\n📜 Recent Burns:');
      this.burns.slice(0, 5).forEach((burn, i) => {
        const status = burn.success ? '✅' : '❌';
        const txHash = burn.data?.txHash ? ` - ${burn.data.txHash.slice(0, 8)}...` : '';
        console.log(`${i + 1}. ${status} ${burn.type}${txHash} @ ${new Date(burn.timestamp).toLocaleTimeString()}`);
      });
    }
    
    console.groupEnd();
  }
}

// Create global instance
const believeMonitor = new BelieveMonitor();

// Make it available globally
if (typeof window !== 'undefined') {
  window.believeMonitor = believeMonitor;
  
  console.log('🔍 Believe Monitor Loaded!');
  console.log('Commands:');
  console.log('- believeMonitor.summary() - Show burn summary');
  console.log('- believeMonitor.getLastBurn() - Get last burn details');
  console.log('- believeMonitor.getBurns() - Get all burns');
  console.log('- believeMonitor.clear() - Clear history');
  console.log('- believeMonitor.toggle() - Enable/disable monitoring');
}

export default believeMonitor; 