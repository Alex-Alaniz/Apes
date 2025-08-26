const DailyCryptoPredictionsService = require('../backend/services/dailyCryptoPredictions');

/**
 * Script to create daily crypto prediction markets
 * Run with: node scripts/create-daily-crypto-predictions.js
 */
async function main() {
    const service = new DailyCryptoPredictionsService();
    
    try {
        // Check if markets already exist for today
        const existingMarkets = await service.getDailyMarketsForToday();
        
        if (existingMarkets.length > 0) {
            console.log(`Found ${existingMarkets.length} existing daily crypto markets for today:`);
            existingMarkets.forEach(market => {
                console.log(`- ${market.question} (${market.market_address})`);
            });
            
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const answer = await new Promise(resolve => {
                readline.question('Create new markets anyway? (y/N): ', resolve);
            });
            readline.close();
            
            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                console.log('Skipping market creation.');
                return;
            }
        }
        
        // Create new daily markets
        const newMarkets = await service.createAllDailyMarkets();
        
        if (newMarkets.length > 0) {
            console.log('\n🎯 Daily Crypto Prediction Markets Created:');
            console.log('==========================================');
            
            newMarkets.forEach(market => {
                console.log(`${market.crypto}: $${market.price} - ${market.market_address}`);
                console.log(`   "${market.question}"`);
                console.log('');
            });
            
            console.log('✅ All markets created successfully!');
            console.log('🔗 Visit your frontend to start predicting crypto prices');
        } else {
            console.log('❌ No markets were created. Check the logs for errors.');
        }
        
    } catch (error) {
        console.error('❌ Error creating daily crypto prediction markets:', error);
        process.exit(1);
    }
}

main();