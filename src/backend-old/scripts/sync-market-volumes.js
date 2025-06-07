#!/usr/bin/env node

/**
 * Market Volume Sync Script
 * 
 * This script ensures all markets have consistent volume data by:
 * 1. Checking all active markets for volume inconsistencies
 * 2. Syncing volume data for markets with zero or missing volume
 * 3. Generating realistic participant counts based on volume
 * 4. Providing detailed logging and reporting
 * 
 * Usage:
 * - Run manually: node src/backend/scripts/sync-market-volumes.js
 * - Run via cron: 0 [star-slash]6 [star] [star] [star] node /path/to/sync-market-volumes.js
 * - Run via npm: npm run sync-volumes
 */

const axios = require('axios');
const db = require('../config/database');

class MarketVolumeSync {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'https://apes-production.up.railway.app';
    this.isDryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  async checkDatabaseConnection() {
    try {
      await db.query('SELECT 1');
      this.log('Database connection successful');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async analyzeVolumeInconsistencies() {
    try {
      this.log('🔍 Analyzing volume inconsistencies across markets...');
      
      const query = `
        SELECT 
          market_address,
          question,
          total_volume,
          option_volumes,
          participant_count,
          status,
          created_at
        FROM markets 
        WHERE status = 'Active'
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query);
      const markets = result.rows;
      
      this.log(`Found ${markets.length} active markets`);
      
      // Categorize markets by volume status
      const analysis = {
        total: markets.length,
        zeroVolume: 0,
        lowVolume: 0,
        normalVolume: 0,
        missingParticipants: 0,
        needsSync: []
      };
      
      markets.forEach(market => {
        const totalVolume = parseFloat(market.total_volume || 0);
        const participantCount = parseInt(market.participant_count || 0);
        
        if (totalVolume === 0) {
          analysis.zeroVolume++;
          analysis.needsSync.push({
            address: market.market_address,
            issue: 'zero_volume',
            question: market.question?.substring(0, 50)
          });
        } else if (totalVolume < 100) {
          analysis.lowVolume++;
        } else {
          analysis.normalVolume++;
        }
        
        if (participantCount === 0 && totalVolume > 0) {
          analysis.missingParticipants++;
          analysis.needsSync.push({
            address: market.market_address,
            issue: 'missing_participants',
            question: market.question?.substring(0, 50)
          });
        }
      });
      
      // Report analysis
      this.log(`📊 Volume Analysis Results:`);
      this.log(`  • Zero volume: ${analysis.zeroVolume} markets`);
      this.log(`  • Low volume (<100 APES): ${analysis.lowVolume} markets`);
      this.log(`  • Normal volume: ${analysis.normalVolume} markets`);
      this.log(`  • Missing participants: ${analysis.missingParticipants} markets`);
      this.log(`  • Total needing sync: ${analysis.needsSync.length} markets`);
      
      if (this.verbose && analysis.needsSync.length > 0) {
        this.log(`\n🔧 Markets requiring sync:`);
        analysis.needsSync.forEach((market, index) => {
          this.log(`  ${index + 1}. ${market.address} (${market.issue}) - ${market.question}`);
        });
      }
      
      return analysis;
    } catch (error) {
      this.log(`Error analyzing volume inconsistencies: ${error.message}`, 'error');
      throw error;
    }
  }

  async performVolumeSync() {
    try {
      if (this.isDryRun) {
        this.log('🔍 DRY RUN MODE - No changes will be made');
        return { success: true, synced: 0, total: 0, dryRun: true };
      }
      
      this.log('🔄 Performing volume sync via API...');
      
      const response = await axios.post(`${this.backendUrl}/api/markets/force-sync`, {}, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 second timeout
      });
      
      if (response.data.success) {
        this.log(`Volume sync completed successfully`, 'success');
        this.log(`📊 Synced: ${response.data.synced}/${response.data.total} markets`);
        return response.data;
      } else {
        throw new Error('Sync API returned success: false');
      }
    } catch (error) {
      this.log(`Volume sync failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async verifyVolumeSync() {
    try {
      this.log('🔍 Verifying volume sync results...');
      
      const postSyncAnalysis = await this.analyzeVolumeInconsistencies();
      
      if (postSyncAnalysis.zeroVolume === 0) {
        this.log(`All markets now have volume data`, 'success');
      } else {
        this.log(`${postSyncAnalysis.zeroVolume} markets still have zero volume`, 'warn');
      }
      
      return postSyncAnalysis;
    } catch (error) {
      this.log(`Error verifying sync: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateReport(preSyncAnalysis, syncResult, postSyncAnalysis) {
    const report = {
      timestamp: new Date().toISOString(),
      pre_sync: {
        total_markets: preSyncAnalysis.total,
        zero_volume_markets: preSyncAnalysis.zeroVolume,
        missing_participants: preSyncAnalysis.missingParticipants
      },
      sync_operation: {
        performed: !this.isDryRun,
        success: syncResult.success,
        markets_synced: syncResult.synced || 0,
        markets_total: syncResult.total || 0
      },
      post_sync: postSyncAnalysis ? {
        zero_volume_markets: postSyncAnalysis.zeroVolume,
        improvement: preSyncAnalysis.zeroVolume - (postSyncAnalysis.zeroVolume || 0)
      } : null,
      recommendations: []
    };
    
    // Generate recommendations
    if (report.pre_sync.zero_volume_markets > 0) {
      report.recommendations.push('Volume sync needed for markets with zero volume');
    }
    
    if (report.post_sync && report.post_sync.zero_volume_markets > 0) {
      report.recommendations.push('Manual investigation needed for remaining zero-volume markets');
    }
    
    if (report.pre_sync.missing_participants > 0) {
      report.recommendations.push('Participant count calculation needed');
    }
    
    if (report.sync_operation.success && report.post_sync?.improvement > 0) {
      report.recommendations.push('Volume sync was successful - consider scheduling regular syncs');
    }
    
    this.log('\n📋 VOLUME SYNC REPORT');
    this.log('='.repeat(50));
    this.log(`Timestamp: ${report.timestamp}`);
    this.log(`Total Markets: ${report.pre_sync.total_markets}`);
    this.log(`Zero Volume (Before): ${report.pre_sync.zero_volume_markets}`);
    if (report.post_sync) {
      this.log(`Zero Volume (After): ${report.post_sync.zero_volume_markets}`);
      this.log(`Improvement: ${report.post_sync.improvement} markets fixed`);
    }
    this.log(`Sync Performed: ${report.sync_operation.performed ? 'Yes' : 'No (Dry Run)'}`);
    this.log(`Markets Synced: ${report.sync_operation.markets_synced}/${report.sync_operation.markets_total}`);
    
    if (report.recommendations.length > 0) {
      this.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        this.log(`  ${index + 1}. ${rec}`);
      });
    }
    
    return report;
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting Market Volume Sync Process...');
      
      // Check database connection
      const dbOk = await this.checkDatabaseConnection();
      if (!dbOk) {
        throw new Error('Database connection failed');
      }
      
      // Analyze current state
      const preSyncAnalysis = await this.analyzeVolumeInconsistencies();
      
      // Perform sync if needed
      let syncResult = { success: false, synced: 0, total: 0 };
      if (preSyncAnalysis.needsSync.length > 0 || this.isDryRun) {
        syncResult = await this.performVolumeSync();
      } else {
        this.log('✅ No volume sync needed - all markets have consistent data');
        syncResult = { success: true, synced: 0, total: preSyncAnalysis.total, message: 'No sync needed' };
      }
      
      // Verify results (only if sync was performed)
      let postSyncAnalysis = null;
      if (syncResult.success && !this.isDryRun) {
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        postSyncAnalysis = await this.verifyVolumeSync();
      }
      
      // Generate report
      const report = await this.generateReport(preSyncAnalysis, syncResult, postSyncAnalysis);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.log(`\n🎉 Volume sync process completed in ${duration}s`, 'success');
      
      // Exit with appropriate code
      if (syncResult.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Volume sync process failed: ${error.message}`, 'error');
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  const sync = new MarketVolumeSync();
  sync.run();
}

module.exports = MarketVolumeSync; 