const cron = require('node-cron');

/**
 * Daily Cron Service
 * Automatically creates daily crypto prediction markets at midnight UTC
 */
class DailyCronService {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Start the automated daily market creation
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Daily cron service already running');
            return;
        }

        // Schedule oracle scan for 11:30 PM UTC daily (30 minutes before midnight to prepare opportunities)
        cron.schedule('30 23 * * *', async () => {
            await this.runOracleScan();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        // Also schedule a backup oracle scan at 12:30 AM UTC in case first attempt fails
        cron.schedule('30 0 * * *', async () => {
            await this.runOracleScanBackup();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.isRunning = true;
        console.log('✅ Daily cron service started');
        console.log('🔮 Oracle scan: 11:30 PM UTC daily (identifies opportunities)');
        console.log('🔄 Backup scan: 12:30 AM UTC daily');
    }

    /**
     * Stop the automated service
     */
    stop() {
        cron.destroy();
        this.isRunning = false;
        console.log('🛑 Daily cron service stopped');
    }

    /**
     * Run oracle scan to identify market opportunities
     */
    async runOracleScan() {
        try {
            console.log('🔮 Running automated oracle scan for market opportunities...');

            // Dynamic import to avoid circular dependencies at startup
            const DailyCryptoOracle = require('./dailyCryptoOracle');
            const oracle = new DailyCryptoOracle();

            const result = await oracle.runDailyOracle();

            if (result.success) {
                console.log(`✅ Oracle scan complete: ${result.opportunities} opportunities found, ${result.queued} queued for approval`);
                
                // Send notification to admin if opportunities found
                if (result.queued > 0) {
                    await this.sendOracleNotification(result);
                }
            } else {
                console.error('❌ Oracle scan failed:', result.error);
                await this.sendErrorNotification(new Error(result.error));
            }

            return result;

        } catch (error) {
            console.error('❌ Oracle scan error:', error);
            await this.sendErrorNotification(error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Legacy: Main daily market creation function (now manual approval only)
     */
    async createDailyMarkets() {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log(`🌅 Starting daily market creation for ${today}`);

            // Dynamic import to avoid startup issues
            const DailyCryptoPredictionsService = require('./dailyCryptoPredictions');
            const cryptoService = new DailyCryptoPredictionsService();

            // Check if markets already exist for today
            const existingMarkets = await cryptoService.getDailyMarketsForToday();
            
            if (existingMarkets.length > 0) {
                console.log(`✅ Daily markets already exist for ${today} (${existingMarkets.length} markets)`);
                return {
                    success: true,
                    message: 'Markets already exist',
                    count: existingMarkets.length
                };
            }

            // Create new markets
            const newMarkets = await cryptoService.createAllDailyMarkets();
            
            console.log(`🎯 Successfully created ${newMarkets.length} daily crypto markets`);
            console.log(`📊 Markets: ${newMarkets.map(m => m.crypto).join(', ')}`);
            
            // Optional: Send notification (Discord, Slack, email, etc.)
            await this.sendCreationNotification(newMarkets);
            
            return {
                success: true,
                message: `Created ${newMarkets.length} daily crypto markets`,
                markets: newMarkets
            };

        } catch (error) {
            console.error('❌ Failed to create daily markets:', error);
            
            // Optional: Send error notification
            await this.sendErrorNotification(error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send oracle notification to admin
     */
    async sendOracleNotification(result) {
        try {
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (!webhookUrl) return;

            const message = {
                embeds: [{
                    title: '🔮 New Crypto Market Opportunities Found',
                    description: `Oracle identified ${result.queued} markets ready for admin approval`,
                    fields: [
                        {
                            name: 'Action Required',
                            value: 'Visit /admin/crypto-markets to review and deploy',
                            inline: false
                        },
                        {
                            name: 'Opportunities Found',
                            value: `${result.opportunities} analyzed, ${result.queued} recommended`,
                            inline: true
                        }
                    ],
                    color: 0x9333ea, // Purple
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

        } catch (error) {
            console.log('⚠️ Failed to send oracle notification:', error.message);
        }
    }

    /**
     * Backup oracle scan (runs 30 minutes after main)
     */
    async runOracleScanBackup() {
        try {
            console.log('🔄 Running backup oracle scan...');
            await this.runOracleScan();
        } catch (error) {
            console.error('❌ Backup oracle scan failed:', error);
        }
    }

    /**
     * Legacy: Backup market creation (now unused)
     */
    async createDailyMarketsBackup() {
        try {
            // Dynamic import to avoid startup issues
            const DailyCryptoPredictionsService = require('./dailyCryptoPredictions');
            const cryptoService = new DailyCryptoPredictionsService();

            const existingMarkets = await cryptoService.getDailyMarketsForToday();
            
            if (existingMarkets.length >= 3) {
                console.log('✅ Daily markets already exist - backup not needed');
                return;
            }

            console.log('🔄 Running backup market creation...');
            await this.createDailyMarkets();

        } catch (error) {
            console.error('❌ Backup market creation failed:', error);
        }
    }

    /**
     * Send success notification (optional)
     */
    async sendCreationNotification(markets) {
        try {
            // Example: Discord webhook
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (!webhookUrl) return;

            const message = {
                embeds: [{
                    title: '🎯 Daily Crypto Markets Created!',
                    description: `Successfully created ${markets.length} new prediction markets`,
                    fields: markets.map(market => ({
                        name: `${market.crypto}`,
                        value: `Price: $${market.price.toFixed(2)}\\nMarket: \`${market.market_address.slice(0, 8)}...\``,
                        inline: true
                    })),
                    color: 0x00ff00,
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

        } catch (error) {
            console.log('⚠️ Failed to send notification:', error.message);
        }
    }

    /**
     * Send error notification (optional)
     */
    async sendErrorNotification(error) {
        try {
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (!webhookUrl) return;

            const message = {
                embeds: [{
                    title: '❌ Daily Market Creation Failed',
                    description: `Error: ${error.message}`,
                    color: 0xff0000,
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

        } catch (notificationError) {
            console.log('⚠️ Failed to send error notification');
        }
    }

    /**
     * Manual trigger for testing
     */
    async triggerManual() {
        console.log('🔧 Manually triggering daily market creation...');
        return await this.createDailyMarkets();
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            running: this.isRunning,
            nextRun: this.isRunning ? 'Daily at 12:01 AM UTC' : 'Not scheduled',
            backupRun: this.isRunning ? 'Daily at 12:30 AM UTC' : 'Not scheduled'
        };
    }
}

module.exports = DailyCronService;