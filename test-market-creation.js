// Quick test to create today's crypto markets on-chain
const DailyCryptoPredictions = require('./backend/services/dailyCryptoPredictions');

async function createTodaysMarkets() {
  try {
    console.log('🚀 Creating today\'s crypto markets...');
    
    const service = new DailyCryptoPredictions();
    
    const markets = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' }, 
      { symbol: 'SOL', name: 'Solana' }
    ];
    
    // Get current prices
    const axios = require('axios');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
    
    const prices = {
      BTC: response.data.bitcoin.usd,
      ETH: response.data.ethereum.usd,
      SOL: response.data.solana.usd
    };
    
    console.log('💰 Current prices:', prices);
    
    for (const market of markets) {
      try {
        console.log(`📊 Creating ${market.symbol} market...`);
        const result = await service.createDailyMarket(market, prices[market.symbol]);
        
        if (result.success) {
          console.log(`✅ ${market.symbol} market created: ${result.marketPubkey}`);
          console.log(`🔗 Transaction: ${result.signature}`);
        } else {
          console.log(`❌ ${market.symbol} failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${market.symbol} error:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Market creation failed:', error);
  }
}

createTodaysMarkets();