const { Connection, PublicKey } = require('@solana/web3.js');
const BelieveAppService = require('./believeAppService');

class BurnEventProcessor {
  constructor(rpcUrl, programId, believeAppApiKey) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.believeApp = new BelieveAppService(believeAppApiKey);
    this.processedSignatures = new Set();
  }

  /**
   * Start monitoring for burn events
   */
  async startMonitoring() {
    console.log('🔍 Starting burn event monitoring...');
    
    // Subscribe to program logs
    this.connection.onLogs(
      this.programId,
      async (logs) => {
        await this.processLogs(logs);
      },
      'confirmed'
    );

    console.log('✅ Monitoring active for program:', this.programId.toString());
  }

  /**
   * Process logs to extract burn events
   */
  async processLogs(logs) {
    const { signature } = logs;
    
    // Skip if already processed
    if (this.processedSignatures.has(signature)) {
      return;
    }
    
    this.processedSignatures.add(signature);
    
    // Parse logs for burn events
    const burnEvents = this.parseBurnEvents(logs.logs);
    
    if (burnEvents.length === 0) {
      return;
    }

    console.log(`📋 Found ${burnEvents.length} burn events in transaction ${signature}`);

    // Process each burn event
    for (const event of burnEvents) {
      await this.processBurnEvent(event, signature);
    }
  }

  /**
   * Parse logs to extract burn event data
   */
  parseBurnEvents(logs) {
    const burnEvents = [];
    
    for (const log of logs) {
      // Look for burn event patterns in logs
      if (log.includes('Burn event emitted:')) {
        const eventData = this.extractEventData(log);
        if (eventData) {
          burnEvents.push(eventData);
        }
      }
    }
    
    return burnEvents;
  }

  /**
   * Extract event data from log message
   */
  extractEventData(log) {
    try {
      // Parse different burn event types
      if (log.includes('PREDICTION_BET')) {
        const matches = log.match(/user: (\w+), market: (\w+), burn_amount: (\d+)/);
        if (matches) {
          return {
            type: 'PREDICTION_BET',
            user: matches[1],
            market: matches[2],
            burnAmount: parseInt(matches[3])
          };
        }
      } else if (log.includes('REWARD_CLAIM')) {
        const matches = log.match(/user: (\w+), market: (\w+), burn_amount: (\d+)/);
        if (matches) {
          return {
            type: 'REWARD_CLAIM',
            user: matches[1],
            market: matches[2],
            burnAmount: parseInt(matches[3])
          };
        }
      } else if (log.includes('MARKET_CREATION')) {
        const matches = log.match(/creator: (\w+), market: (\w+), burn_amount: (\d+)/);
        if (matches) {
          return {
            type: 'MARKET_CREATION',
            user: matches[1],
            market: matches[2],
            burnAmount: parseInt(matches[3])
          };
        }
      }
    } catch (error) {
      console.error('Error parsing event data:', error);
    }
    
    return null;
  }

  /**
   * Process a single burn event
   */
  async processBurnEvent(event, signature) {
    console.log(`🔥 Processing ${event.type} burn event...`);
    
    try {
      let proof;
      
      switch (event.type) {
        case 'PREDICTION_BET':
          proof = this.believeApp.createPredictionBetProof(
            event.market,
            event.user,
            0, // Would need to extract from transaction data
            event.burnAmount,
            signature
          );
          break;
          
        case 'REWARD_CLAIM':
          proof = this.believeApp.createRewardClaimProof(
            event.market,
            event.user,
            event.burnAmount,
            signature
          );
          break;
          
        case 'MARKET_CREATION':
          proof = this.believeApp.createMarketCreationProof(
            event.market,
            event.user,
            event.burnAmount,
            signature
          );
          break;
          
        default:
          console.error('Unknown event type:', event.type);
          return;
      }
      
      // Send to BelieveApp
      const result = await this.believeApp.burnTokens(
        event.type,
        proof,
        event.burnAmount,
        true // persistOnchain
      );
      
      console.log('✅ Burn processed successfully:', {
        type: event.type,
        txHash: result.txHash,
        burnAmount: event.burnAmount
      });
      
    } catch (error) {
      console.error('❌ Failed to process burn:', error.message);
      // In production, would retry or queue for later processing
    }
  }

  /**
   * Process historical transactions (for catching up)
   */
  async processHistoricalTransactions(startSignature, limit = 100) {
    console.log('📜 Processing historical transactions...');
    
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.programId,
        {
          before: startSignature,
          limit
        }
      );
      
      for (const sigInfo of signatures) {
        const logs = await this.connection.getParsedTransaction(
          sigInfo.signature,
          'confirmed'
        );
        
        if (logs && logs.meta && logs.meta.logMessages) {
          await this.processLogs({
            signature: sigInfo.signature,
            logs: logs.meta.logMessages
          });
        }
      }
      
      console.log(`✅ Processed ${signatures.length} historical transactions`);
      
    } catch (error) {
      console.error('Error processing historical transactions:', error);
    }
  }
}

module.exports = BurnEventProcessor; 