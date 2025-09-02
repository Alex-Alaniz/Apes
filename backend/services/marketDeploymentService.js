const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const db = require('../config/database');
const idl = require('../../src/smart_contracts/market_system/target/idl/market_system.json');

class MarketDeploymentService {
  constructor() {
    this.connection = null;
    this.program = null;
    this.provider = null;
    this.deployerWallet = null;
    this.isInitialized = false;
    this.deploymentQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the deployment service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set up connection
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      this.connection = new Connection(rpcUrl, 'confirmed');

      // Load deployer wallet from environment
      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (!deployerPrivateKey) {
        throw new Error('DEPLOYER_PRIVATE_KEY not configured');
      }

      // Decode base64 private key
      const secretKey = Buffer.from(deployerPrivateKey, 'base64');
      const { Keypair } = require('@solana/web3.js');
      this.deployerWallet = Keypair.fromSecretKey(secretKey);

      console.log('🚀 Deployment service initialized with wallet:', this.deployerWallet.publicKey.toString());

      // Set up Anchor provider
      const wallet = {
        publicKey: this.deployerWallet.publicKey,
        signTransaction: async (tx) => {
          tx.sign(this.deployerWallet);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map(tx => {
            tx.sign(this.deployerWallet);
            return tx;
          });
        }
      };

      this.provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      });

      // Load program
      const programId = new PublicKey(process.env.APES_PROGRAM_ID || 'APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
      this.program = new Program(idl, programId, this.provider);

      this.isInitialized = true;
      console.log('✅ Market deployment service initialized');
    } catch (error) {
      console.error('Failed to initialize deployment service:', error);
      throw error;
    }
  }

  /**
   * Deploy a single market
   */
  async deployMarket(marketData) {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log(`🚀 Deploying market: ${marketData.question}`);

      // Generate market keypair
      const marketKeypair = require('@solana/web3.js').Keypair.generate();
      
      // Prepare market parameters
      const marketParams = {
        question: marketData.question.slice(0, 200), // Limit question length
        options: marketData.options.slice(0, 4), // Max 4 options
        endTime: new BN(Math.floor(new Date(marketData.end_time).getTime() / 1000)),
        minBet: new BN(10 * LAMPORTS_PER_SOL), // 10 APES minimum
        category: marketData.category || 'General'
      };

      // Find PDA addresses
      const [marketStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('market_state'), marketKeypair.publicKey.toBuffer()],
        this.program.programId
      );

      const [escrowPda] = await PublicKey.findProgramAddress(
        [Buffer.from('market_escrow'), marketKeypair.publicKey.toBuffer()],
        this.program.programId
      );

      // Create market instruction
      const createMarketIx = await this.program.methods
        .createMarket(
          marketParams.question,
          marketParams.options,
          marketParams.endTime,
          marketParams.minBet,
          marketParams.category
        )
        .accounts({
          market: marketKeypair.publicKey,
          marketState: marketStatePda,
          escrow: escrowPda,
          creator: this.deployerWallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: require('@solana/web3.js').SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Build transaction
      const transaction = new Transaction().add(createMarketIx);
      
      // Add priority fee for faster processing
      const priorityFeeIx = require('@solana/web3.js').ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      });
      transaction.add(priorityFeeIx);

      // Sign and send transaction
      transaction.feePayer = this.deployerWallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.sign(this.deployerWallet, marketKeypair);

      const signature = await this.connection.sendTransaction(transaction, [this.deployerWallet, marketKeypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`✅ Market deployed: ${marketKeypair.publicKey.toString()}`);
      console.log(`   Transaction: ${signature}`);

      return {
        success: true,
        marketAddress: marketKeypair.publicKey.toString(),
        signature,
        marketState: marketStatePda.toString(),
        escrow: escrowPda.toString()
      };
    } catch (error) {
      console.error('Market deployment failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deploy multiple markets in batch
   */
  async deployBatch(marketIds) {
    if (!this.isInitialized) await this.initialize();

    const results = [];
    
    // Get market data from database
    const marketsResult = await db.query(`
      SELECT * FROM scraped_markets 
      WHERE id = ANY($1::int[])
        AND approval_status = 'approved'
        AND deployment_status = 'approved'
        AND market_address IS NULL
    `, [marketIds]);

    const markets = marketsResult.rows;
    console.log(`📦 Deploying batch of ${markets.length} markets`);

    for (const market of markets) {
      try {
        // Add delay between deployments to avoid rate limits
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const deployResult = await this.deployMarket(market);
        
        if (deployResult.success) {
          // Update database
          await db.query(`
            UPDATE scraped_markets 
            SET 
              deployment_status = 'deployed',
              market_address = $1,
              deployment_tx = $2
            WHERE id = $3
          `, [deployResult.marketAddress, deployResult.signature, market.id]);

          // Insert into main markets table
          await db.query(`
            INSERT INTO markets (
              market_address, source, source_id, question, description,
              category, options, status, mobile_approved, mobile_priority,
              time_category, sport_type, event_date, deployment_tx,
              options_metadata, assets, total_volume, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
          `, [
            deployResult.marketAddress,
            market.source,
            market.source_id,
            market.question,
            market.description,
            market.category,
            market.options,
            'Active',
            true, // Auto-approve for mobile
            Math.floor(market.quality_score * 100), // Priority based on quality
            market.time_category,
            market.sport_type,
            market.event_date,
            deployResult.signature,
            market.options_metadata,
            market.assets,
            0 // Initial volume
          ]);

          results.push({
            id: market.id,
            success: true,
            marketAddress: deployResult.marketAddress,
            signature: deployResult.signature
          });
        } else {
          // Update with error
          await db.query(`
            UPDATE scraped_markets 
            SET 
              deployment_status = 'failed',
              deployment_error = $1
            WHERE id = $2
          `, [deployResult.error, market.id]);

          results.push({
            id: market.id,
            success: false,
            error: deployResult.error
          });
        }
      } catch (error) {
        console.error(`Failed to deploy market ${market.id}:`, error);
        results.push({
          id: market.id,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch deployment complete: ${successful}/${markets.length} successful`);

    return {
      total: markets.length,
      successful,
      failed: markets.length - successful,
      results
    };
  }

  /**
   * Queue markets for deployment
   */
  async queueDeployment(marketIds) {
    this.deploymentQueue.push(...marketIds);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return {
      queued: marketIds.length,
      totalInQueue: this.deploymentQueue.length
    };
  }

  /**
   * Process deployment queue
   */
  async processQueue() {
    if (this.deploymentQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    
    // Take up to 5 markets from queue
    const batch = this.deploymentQueue.splice(0, 5);
    
    try {
      await this.deployBatch(batch);
    } catch (error) {
      console.error('Batch deployment error:', error);
    }
    
    // Continue processing
    if (this.deploymentQueue.length > 0) {
      setTimeout(() => this.processQueue(), 5000);
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(hours = 24) {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_deployed,
        COUNT(CASE WHEN deployment_status = 'deployed' THEN 1 END) as successful,
        COUNT(CASE WHEN deployment_status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN deployment_status = 'approved' THEN 1 END) as pending,
        AVG(CASE 
          WHEN deployment_status = 'deployed' AND approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (updated_at - approved_at)) 
        END) as avg_deployment_time_seconds
      FROM scraped_markets
      WHERE approved_at > NOW() - INTERVAL '${hours} hours'
    `);
    
    return result.rows[0];
  }

  /**
   * Check deployment health
   */
  async checkHealth() {
    try {
      if (!this.isInitialized) await this.initialize();
      
      // Check connection
      const version = await this.connection.getVersion();
      
      // Check deployer balance
      const balance = await this.connection.getBalance(this.deployerWallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Check recent deployments
      const recentDeployments = await db.query(`
        SELECT COUNT(*) as count 
        FROM scraped_markets 
        WHERE deployment_status = 'deployed' 
          AND updated_at > NOW() - INTERVAL '1 hour'
      `);
      
      return {
        healthy: true,
        connection: 'active',
        rpcVersion: version['solana-core'],
        deployerAddress: this.deployerWallet.publicKey.toString(),
        deployerBalance: solBalance,
        recentDeployments: parseInt(recentDeployments.rows[0].count),
        queueLength: this.deploymentQueue.length,
        isProcessing: this.isProcessing
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

module.exports = new MarketDeploymentService();