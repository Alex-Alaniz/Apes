// Manual crypto market creation script - bypasses all automation
const axios = require('axios');

async function createManualCryptoMarkets() {
  try {
    console.log('🚀 Creating manual crypto markets...');
    
    // Get current prices
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
    const data = response.data;
    
    const btcPrice = data.bitcoin.usd;
    const ethPrice = data.ethereum.usd;
    const solPrice = data.solana.usd;
    
    console.log(`💰 Current prices: BTC $${btcPrice}, ETH $${ethPrice}, SOL $${solPrice}`);
    
    // Create simple up/down markets manually
    const markets = [
      {
        market_address: `manual_btc_${Date.now()}`,
        question: `Will Bitcoin be above $${Math.round(btcPrice)} at 11:59 PM UTC today?`,
        description: `Bitcoin price prediction. Current: $${btcPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: btcPrice,
        crypto_symbol: 'BTC'
      },
      {
        market_address: `manual_eth_${Date.now() + 1}`,
        question: `Will Ethereum be above $${Math.round(ethPrice)} at 11:59 PM UTC today?`,
        description: `Ethereum price prediction. Current: $${ethPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: ethPrice,
        crypto_symbol: 'ETH'
      },
      {
        market_address: `manual_sol_${Date.now() + 2}`,
        question: `Will Solana be above $${Math.round(solPrice)} at 11:59 PM UTC today?`,
        description: `Solana price prediction. Current: $${solPrice.toFixed(2)}. Resolves at market close.`,
        options: ['Yes', 'No'],
        category: 'Crypto',
        resolution_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        creator_fee: 200,
        min_bet: '10000000000',
        volume: '0',
        current_price: solPrice,
        crypto_symbol: 'SOL'
      }
    ];
    
    console.log('📊 Created 3 manual crypto markets:');
    markets.forEach(m => console.log(`   • ${m.question}`));
    
    return {
      success: true,
      markets,
      message: `Created ${markets.length} manual crypto markets`
    };
    
  } catch (error) {
    console.error('❌ Error creating manual markets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use as module or run directly
if (require.main === module) {
  createManualCryptoMarkets().then(result => {
    console.log('📝 Result:', JSON.stringify(result, null, 2));
  });
}

module.exports = createManualCryptoMarkets;