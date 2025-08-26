const axios = require('axios');
const { Pool } = require('pg');
const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

/**
 * Daily Crypto Predictions Service
 * Creates daily price prediction markets for BTC, ETH, and SOL on-chain
 */
class DailyCryptoPredictionsService {
    constructor() {
        this.cryptos = [
            { symbol: 'BTC', name: 'Bitcoin', coingecko_id: 'bitcoin' },
            { symbol: 'ETH', name: 'Ethereum', coingecko_id: 'ethereum' },
            { symbol: 'SOL', name: 'Solana', coingecko_id: 'solana' }
        ];
        
        // Solana configuration
        this.network = process.env.SOLANA_NETWORK || 'mainnet-beta';
        this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.programId = new PublicKey(process.env.APES_PROGRAM_ID || 'APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
        this.tokenMint = new PublicKey(process.env.APES_TOKEN_MINT || '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
        
        // Initialize Solana connection and program
        this.connection = null;
        this.program = null;
        this.adminWallet = null;
    }

    /**
     * Get current crypto prices from CoinGecko
     */
    async getCurrentPrices() {
        try {
            const ids = this.cryptos.map(c => c.coingecko_id).join(',');
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
            
            const prices = {};
            this.cryptos.forEach(crypto => {
                prices[crypto.symbol] = response.data[crypto.coingecko_id]?.usd || 0;
            });
            
            return prices;
        } catch (error) {
            console.error('Error fetching crypto prices:', error);
            return {};
        }
    }

    /**
     * Initialize Solana connection and admin wallet
     */
    async initialize() {
        try {
            // Initialize connection
            this.connection = new Connection(this.rpcUrl, 'confirmed');
            
            // Load admin wallet from environment
            const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
            if (!deployerPrivateKey) {
                throw new Error('DEPLOYER_PRIVATE_KEY not found in environment');
            }
            
            // Decode base64 private key
            const privateKeyBytes = Buffer.from(deployerPrivateKey, 'base64');
            this.adminWallet = Keypair.fromSecretKey(privateKeyBytes);
            
            // Set up Anchor provider
            const walletWrapper = new anchor.Wallet(this.adminWallet);
            const provider = new anchor.AnchorProvider(this.connection, walletWrapper, { commitment: 'confirmed' });
            
            // Load IDL and create program
            const idlPath = path.join(__dirname, '../../src/smart_contracts/market_system/target/idl/market_system.json');
            if (!fs.existsSync(idlPath)) {
                throw new Error(`IDL file not found at: ${idlPath}`);
            }
            
            const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
            this.program = new anchor.Program(idl, this.programId, provider);
            
            console.log('✅ DailyCryptoPredictionsService initialized');
            console.log('📡 Network:', this.network);
            console.log('🔑 Admin Wallet:', this.adminWallet.publicKey.toBase58());
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize DailyCryptoPredictionsService:', error);
            throw error;
        }
    }

    /**
     * Create daily prediction market for a specific crypto on-chain
     */
    async createDailyMarket(crypto, currentPrice) {
        if (!this.program || !this.adminWallet) {
            await this.initialize();
        }
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const priceRanges = this.generatePriceRanges(currentPrice);
        const question = `What will ${crypto.name} (${crypto.symbol}) price be at market close tomorrow?`;
        
        try {
            // Create on-chain market
            const marketKeypair = Keypair.generate();
            const resolutionTimestamp = Math.floor(tomorrow.getTime() / 1000);
            
            // Find PDAs
            const [platformState] = PublicKey.findProgramAddressSync(
                [Buffer.from('platform_state')],
                this.programId
            );
            const [accessControl] = PublicKey.findProgramAddressSync(
                [Buffer.from('access_control')],
                this.programId
            );
            const [marketEscrow] = PublicKey.findProgramAddressSync(
                [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
                this.programId
            );
            
            // Get token accounts
            const creatorTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                this.adminWallet.publicKey
            );
            
            const burnTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                new PublicKey('11111111111111111111111111111111')
            );
            
            // Prepare market options (max 4 for smart contract)
            const options = priceRanges.slice(0, 4).map(range => range.label);
            while (options.length < 4) {
                options.push(''); // Pad with empty strings
            }
            
            console.log(`🚀 Creating on-chain market for ${crypto.symbol} at $${currentPrice}`);
            console.log(`📝 Question: ${question}`);
            console.log(`🎯 Market: ${marketKeypair.publicKey.toBase58()}`);
            
            // Create market transaction
            const tx = await this.program.methods
                .createMarket(
                    { multipleChoice: {} }, // MarketType
                    question,
                    options,
                    new anchor.BN(resolutionTimestamp),
                    new anchor.BN(200), // 2% creator fee
                    new anchor.BN(10 * 1e9), // 10 APES min bet (9 decimals)
                    `daily_${crypto.symbol.toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
                    new anchor.BN(100 * 1e9), // 100 APES creator stake
                    'Crypto'
                )
                .accounts({
                    market: marketKeypair.publicKey,
                    platformState,
                    creator: this.adminWallet.publicKey,
                    creatorTokenAccount,
                    marketEscrow,
                    burnTokenAccount,
                    tokenMint: this.tokenMint,
                    accessControl,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([marketKeypair])
                .rpc();
            
            console.log(`✅ On-chain market created: ${tx}`);
            console.log(`🔗 View on Solscan: https://solscan.io/tx/${tx}${this.network === 'devnet' ? '?cluster=devnet' : ''}`);
            
            // Return market data for database storage
            const market = {
                market_address: marketKeypair.publicKey.toBase58(),
                creator: this.adminWallet.publicKey.toBase58(),
                question: question,
                description: `Daily price prediction for ${crypto.name}. Current price: $${currentPrice.toFixed(2)}. Market resolves at 11:59 PM UTC.`,
                category: 'Crypto',
                resolution_date: tomorrow.toISOString(),
                status: 'Active',
                options: priceRanges.map(range => range.label),
                option_volumes: new Array(priceRanges.length).fill(0), // Start with 0 volume
                total_volume: 0,
                resolved_option: null,
                min_bet: 10,
                market_type: 'multiple_choice',
                is_trending: true,
                transaction_signature: tx,
                assets: {
                    banner: this.getCryptoBanner(crypto.symbol),
                    icon: this.getCryptoIcon(crypto.symbol)
                },
                options_metadata: priceRanges.map(range => ({
                    icon: this.getCryptoIcon(crypto.symbol),
                    description: range.description
                }))
            };

            return market;
            
        } catch (error) {
            console.error(`❌ Failed to create on-chain market for ${crypto.symbol}:`, error);
            if (error.logs) {
                console.error('Program logs:', error.logs);
            }
            throw error;
        }
    }

    /**
     * Generate price prediction ranges based on current price
     */
    generatePriceRanges(currentPrice) {
        const ranges = [];
        const percentages = [-10, -5, -2, 2, 5, 10]; // Percentage changes
        
        // Add "Stays within 2%" option
        const lowerBound = currentPrice * 0.98;
        const upperBound = currentPrice * 1.02;
        ranges.push({
            label: `$${lowerBound.toFixed(2)} - $${upperBound.toFixed(2)} (±2%)`,
            description: `Price stays within 2% of current level`
        });

        // Add directional ranges
        percentages.forEach(pct => {
            if (pct === 2 || pct === -2) return; // Skip as covered by stable range
            
            const targetPrice = currentPrice * (1 + pct / 100);
            if (pct > 0) {
                ranges.push({
                    label: `Above $${targetPrice.toFixed(2)} (+${pct}%+)`,
                    description: `Price increases by ${pct}% or more`
                });
            } else {
                ranges.push({
                    label: `Below $${targetPrice.toFixed(2)} (${pct}%-)`,
                    description: `Price decreases by ${Math.abs(pct)}% or more`
                });
            }
        });

        return ranges;
    }

    /**
     * Get crypto banner image URL
     */
    getCryptoBanner(symbol) {
        const banners = {
            'BTC': 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
            'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', 
            'SOL': 'https://cryptologos.cc/logos/solana-sol-logo.svg'
        };
        return banners[symbol] || '';
    }

    /**
     * Get crypto icon URL
     */
    getCryptoIcon(symbol) {
        const icons = {
            'BTC': '₿',
            'ETH': 'Ξ',
            'SOL': '◎'
        };
        return icons[symbol] || symbol;
    }

    /**
     * Save market to database
     */
    async saveMarketToDatabase(market) {
        const query = `
            INSERT INTO markets (
                market_address, creator, question, description, category,
                resolution_date, status, options, option_volumes, total_volume,
                resolved_option, min_bet, market_type, is_trending, assets,
                options_metadata, transaction_signature, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (market_address) DO NOTHING
            RETURNING market_address
        `;

        const values = [
            market.market_address,
            market.creator,
            market.question,
            market.description,
            market.category,
            market.resolution_date,
            market.status,
            market.options,
            market.option_volumes,
            market.total_volume,
            market.resolved_option,
            market.min_bet,
            market.market_type,
            market.is_trending,
            JSON.stringify(market.assets),
            JSON.stringify(market.options_metadata),
            market.transaction_signature
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error saving market to database:', error);
            throw error;
        }
    }

    /**
     * Create all daily crypto prediction markets on-chain
     */
    async createAllDailyMarkets() {
        try {
            console.log('🚀 Creating daily crypto prediction markets on-chain...');
            
            // Initialize if needed
            if (!this.program || !this.adminWallet) {
                await this.initialize();
            }
            
            const prices = await this.getCurrentPrices();
            const createdMarkets = [];

            for (const crypto of this.cryptos) {
                const currentPrice = prices[crypto.symbol];
                
                if (!currentPrice || currentPrice === 0) {
                    console.log(`⏭️ Skipping ${crypto.symbol} - no price data`);
                    continue;
                }

                console.log(`📊 Creating on-chain market for ${crypto.name} at $${currentPrice.toFixed(2)}`);
                
                try {
                    const market = await this.createDailyMarket(crypto, currentPrice);
                    const saved = await this.saveMarketToDatabase(market);
                    
                    if (saved) {
                        createdMarkets.push({
                            crypto: crypto.symbol,
                            price: currentPrice,
                            market_address: market.market_address,
                            question: market.question,
                            transaction_signature: market.transaction_signature
                        });
                        console.log(`✅ Created ${crypto.symbol} market: ${market.market_address}`);
                        console.log(`🔗 Transaction: ${market.transaction_signature}`);
                    }
                } catch (marketError) {
                    console.error(`❌ Failed to create ${crypto.symbol} market:`, marketError.message);
                    // Continue with other markets even if one fails
                }
            }

            console.log(`🎯 Successfully created ${createdMarkets.length} daily crypto prediction markets on-chain`);
            return createdMarkets;
            
        } catch (error) {
            console.error('💥 Error creating daily markets:', error);
            throw error;
        }
    }

    /**
     * Check if daily markets already exist for today
     */
    async getDailyMarketsForToday() {
        const today = new Date().toISOString().split('T')[0];
        
        const query = `
            SELECT market_address, question, created_at 
            FROM markets 
            WHERE category = 'Crypto' 
            AND DATE(created_at) = $1 
            AND question LIKE '%tomorrow%'
            ORDER BY created_at DESC
        `;

        try {
            const result = await pool.query(query, [today]);
            return result.rows;
        } catch (error) {
            console.error('Error checking existing daily markets:', error);
            return [];
        }
    }
}

module.exports = DailyCryptoPredictionsService;