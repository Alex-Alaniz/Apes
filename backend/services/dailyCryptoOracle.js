const axios = require('axios');
// Use the existing configured database pool instead of creating new one
const pool = require('../config/database');

/**
 * Daily Crypto Oracle Service
 * Identifies market opportunities and queues them for admin approval
 */
class DailyCryptoOracle {
    constructor() {
        this.cryptos = [
            { symbol: 'BTC', name: 'Bitcoin', coingecko_id: 'bitcoin' },
            { symbol: 'ETH', name: 'Ethereum', coingecko_id: 'ethereum' },
            { symbol: 'SOL', name: 'Solana', coingecko_id: 'solana' }
        ];
    }

    /**
     * Get current crypto prices from CoinGecko
     */
    async getCurrentPrices() {
        try {
            const ids = this.cryptos.map(c => c.coingecko_id).join(',');
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`);
            
            const prices = {};
            this.cryptos.forEach(crypto => {
                const data = response.data[crypto.coingecko_id];
                if (data) {
                    prices[crypto.symbol] = {
                        price: data.usd,
                        change_24h: data.usd_24h_change,
                        volume_24h: data.usd_24h_vol
                    };
                }
            });
            
            return prices;
        } catch (error) {
            console.error('Error fetching crypto prices:', error);
            return {};
        }
    }

    /**
     * Analyze market conditions and suggest opportunities
     */
    async analyzeMarketOpportunities() {
        try {
            const prices = await this.getCurrentPrices();
            const opportunities = [];

            for (const crypto of this.cryptos) {
                const data = prices[crypto.symbol];
                if (!data || !data.price) continue;

                const opportunity = await this.evaluateCrypto(crypto, data);
                if (opportunity.recommended) {
                    opportunities.push(opportunity);
                }
            }

            return {
                success: true,
                timestamp: new Date().toISOString(),
                opportunities,
                total_opportunities: opportunities.length
            };

        } catch (error) {
            console.error('Error analyzing market opportunities:', error);
            return {
                success: false,
                error: error.message,
                opportunities: []
            };
        }
    }

    /**
     * Evaluate individual cryptocurrency for market opportunity
     */
    async evaluateCrypto(crypto, priceData) {
        const { price, change_24h, volume_24h } = priceData;
        
        // Market opportunity scoring
        let score = 0;
        let reasons = [];
        
        // Volatility scoring (higher volatility = better for predictions)
        const volatility = Math.abs(change_24h);
        if (volatility > 5) {
            score += 3;
            reasons.push(`High volatility (${volatility.toFixed(1)}%)`);
        } else if (volatility > 2) {
            score += 2;
            reasons.push(`Moderate volatility (${volatility.toFixed(1)}%)`);
        } else {
            score += 1;
            reasons.push(`Low volatility (${volatility.toFixed(1)}%)`);
        }

        // Volume scoring (higher volume = more interest)
        if (volume_24h > 10000000000) { // > $10B
            score += 2;
            reasons.push('Very high trading volume');
        } else if (volume_24h > 1000000000) { // > $1B
            score += 1;
            reasons.push('High trading volume');
        }

        // Price level analysis
        const priceRanges = this.generatePriceRanges(price);
        const hasInterestingRanges = priceRanges.length >= 4;
        if (hasInterestingRanges) {
            score += 1;
            reasons.push('Good price range distribution');
        }

        // Market conditions (trending up/down = more engagement)
        if (Math.abs(change_24h) > 1) {
            score += 1;
            reasons.push(change_24h > 0 ? 'Trending upward' : 'Trending downward');
        }

        // Check if market already exists for today
        const existingMarket = await this.checkExistingMarket(crypto.symbol);
        if (existingMarket) {
            score = 0;
            reasons = ['Market already exists for today'];
        }

        return {
            crypto: crypto.symbol,
            name: crypto.name,
            current_price: price,
            change_24h,
            volume_24h,
            score,
            max_score: 8,
            recommended: score >= 3 && !existingMarket,
            reasons,
            price_ranges: priceRanges,
            market_data: {
                question: `What will ${crypto.name} (${crypto.symbol}) price be at market close tomorrow?`,
                description: `Daily price prediction for ${crypto.name}. Current price: $${price.toFixed(2)}. Market resolves at 11:59 PM UTC.`,
                category: 'Crypto',
                min_bet: 10,
                creator_stake: 100,
                resolution_hours: 24
            }
        };
    }

    /**
     * Generate price prediction ranges
     */
    generatePriceRanges(currentPrice) {
        const ranges = [];
        const percentages = [-10, -5, -2, 2, 5, 10];
        
        // Add "Stays within 2%" option
        const lowerBound = currentPrice * 0.98;
        const upperBound = currentPrice * 1.02;
        ranges.push({
            label: `$${lowerBound.toFixed(2)} - $${upperBound.toFixed(2)} (±2%)`,
            description: `Price stays within 2% of current level`,
            probability_estimate: 0.25 // AI could enhance this
        });

        // Add directional ranges
        percentages.forEach(pct => {
            if (pct === 2 || pct === -2) return;
            
            const targetPrice = currentPrice * (1 + pct / 100);
            if (pct > 0) {
                ranges.push({
                    label: `Above $${targetPrice.toFixed(2)} (+${pct}%+)`,
                    description: `Price increases by ${pct}% or more`,
                    probability_estimate: pct > 5 ? 0.15 : 0.20
                });
            } else {
                ranges.push({
                    label: `Below $${targetPrice.toFixed(2)} (${pct}%-)`,
                    description: `Price decreases by ${Math.abs(pct)}% or more`,
                    probability_estimate: Math.abs(pct) > 5 ? 0.15 : 0.20
                });
            }
        });

        return ranges;
    }

    /**
     * Check if market already exists for today
     */
    async checkExistingMarket(cryptoSymbol) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // First check if pending_crypto_markets table exists
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'pending_crypto_markets'
                );
            `;
            
            const tableExists = await pool.query(tableExistsQuery);
            
            if (!tableExists.rows[0].exists) {
                // Table doesn't exist yet, only check markets table
                const simpleQuery = `
                    SELECT market_address 
                    FROM markets 
                    WHERE category = 'Crypto' 
                    AND question LIKE $1
                    AND DATE(created_at) = $2
                    LIMIT 1
                `;
                
                const result = await pool.query(simpleQuery, [
                    `%${cryptoSymbol}%tomorrow%`,
                    today
                ]);
                
                return result.rows.length > 0;
            }
            
            // Full query with both tables
            const query = `
                SELECT market_address 
                FROM pending_crypto_markets 
                WHERE crypto_symbol = $1 
                AND DATE(created_at) = $2 
                AND status != 'rejected'
                UNION
                SELECT market_address 
                FROM markets 
                WHERE category = 'Crypto' 
                AND question LIKE $3
                AND DATE(created_at) = $2
                LIMIT 1
            `;
            
            const result = await pool.query(query, [
                cryptoSymbol, 
                today, 
                `%${cryptoSymbol}%tomorrow%`
            ]);
            
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking existing market:', error);
            return false; // Assume no existing market on error
        }
    }

    /**
     * Queue opportunities for admin approval
     */
    async queueForApproval(opportunities) {
        try {
            // Check if pending_crypto_markets table exists
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'pending_crypto_markets'
                );
            `;
            
            const tableExists = await pool.query(tableExistsQuery);
            
            if (!tableExists.rows[0].exists) {
                console.log('⚠️ pending_crypto_markets table does not exist - skipping queue, will use manual creation');
                return {
                    success: true,
                    queued_markets: 0,
                    markets: [],
                    message: 'Table not found - run migration first'
                };
            }

            const queuedMarkets = [];

            for (const opportunity of opportunities) {
                if (!opportunity.recommended) continue;

                const marketData = {
                    crypto_symbol: opportunity.crypto,
                    crypto_name: opportunity.name,
                    current_price: opportunity.current_price,
                    change_24h: opportunity.change_24h,
                    volume_24h: opportunity.volume_24h,
                    opportunity_score: opportunity.score,
                    price_ranges: JSON.stringify(opportunity.price_ranges),
                    market_question: opportunity.market_data.question,
                    market_description: opportunity.market_data.description,
                    reasons: JSON.stringify(opportunity.reasons),
                    status: 'pending',
                    created_by: 'oracle_system'
                };

                try {
                    const query = `
                        INSERT INTO pending_crypto_markets (
                            crypto_symbol, crypto_name, current_price, change_24h, 
                            volume_24h, opportunity_score, price_ranges, market_question,
                            market_description, reasons, status, created_by, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                        RETURNING id, crypto_symbol
                    `;

                    const result = await pool.query(query, [
                        marketData.crypto_symbol,
                        marketData.crypto_name,
                        marketData.current_price,
                        marketData.change_24h,
                        marketData.volume_24h,
                        marketData.opportunity_score,
                        marketData.price_ranges,
                        marketData.market_question,
                        marketData.market_description,
                        marketData.reasons,
                        marketData.status,
                        marketData.created_by
                    ]);

                    if (result.rows.length > 0) {
                        queuedMarkets.push({
                            id: result.rows[0].id,
                            crypto: result.rows[0].crypto_symbol,
                            status: 'queued'
                        });
                    }
                } catch (insertError) {
                    console.error(`Error inserting ${opportunity.crypto} opportunity:`, insertError.message);
                    // Continue with other opportunities
                }
            }

            return {
                success: true,
                queued_markets: queuedMarkets.length,
                markets: queuedMarkets
            };

        } catch (error) {
            console.error('Error queueing markets for approval:', error);
            return {
                success: false,
                error: error.message,
                queued_markets: 0,
                markets: []
            };
        }
    }

    /**
     * Run daily opportunity scan and queue for approval
     */
    async runDailyOracle() {
        try {
            console.log('🔮 Running daily crypto oracle scan...');

            const analysis = await this.analyzeMarketOpportunities();
            
            if (!analysis.success) {
                throw new Error(`Oracle analysis failed: ${analysis.error}`);
            }

            console.log(`📊 Found ${analysis.opportunities.length} potential market opportunities`);

            if (analysis.opportunities.length === 0) {
                return {
                    success: true,
                    message: 'No new market opportunities identified',
                    opportunities: 0
                };
            }

            const queueResult = await this.queueForApproval(analysis.opportunities);

            if (queueResult.success) {
                console.log(`✅ Queued ${queueResult.queued_markets} markets for admin approval`);
                
                // Optional: Send notification to admin
                await this.notifyAdminOfOpportunities(queueResult.markets);
            }

            return {
                success: true,
                message: `Identified and queued ${queueResult.queued_markets} market opportunities`,
                opportunities: analysis.opportunities.length,
                queued: queueResult.queued_markets,
                details: analysis.opportunities
            };

        } catch (error) {
            console.error('❌ Daily oracle scan failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Notify admin of new opportunities (optional)
     */
    async notifyAdminOfOpportunities(markets) {
        try {
            // Discord notification
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (webhookUrl && markets.length > 0) {
                const message = {
                    embeds: [{
                        title: '🔮 New Crypto Market Opportunities',
                        description: `Found ${markets.length} markets ready for approval`,
                        fields: markets.map(market => ({
                            name: market.crypto,
                            value: `Status: Pending Approval\\nReview at: /admin/deploy-markets`,
                            inline: true
                        })),
                        color: 0xffa500,
                        timestamp: new Date().toISOString()
                    }]
                };

                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });
            }
        } catch (error) {
            console.log('⚠️ Failed to send admin notification:', error.message);
        }
    }
}

module.exports = DailyCryptoOracle;