const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');
const db = require('../config/database');

class TreasuryMonitoringService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    this.APES_TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
    this.TREASURY_ADDRESS = new PublicKey('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');
    
    // Risk management thresholds
    this.RISK_THRESHOLDS = {
      LOW_TREASURY_WARNING: 100000 * 1e6,     // 100k APES (with 6 decimals)
      HIGH_EXPOSURE_WARNING: 0.7,             // 70% of treasury
      CRITICAL_EXPOSURE_LIMIT: 0.9,           // 90% of treasury - reject bets
      MAX_SINGLE_BET_RATIO: 0.1,              // 10% of treasury max per bet
    };
    
    this.monitoringActive = false;
    this.lastBalanceCheck = 0;
    this.cachedBalance = 0;
  }

  async initialize() {
    console.log('🏦 Initializing Treasury Monitoring Service...');
    
    try {
      await this.updateTreasuryBalance();
      console.log(`✅ Treasury balance loaded: ${this.formatAPES(this.cachedBalance)} APES`);
      
      // Start monitoring
      this.startMonitoring();
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize treasury monitoring:', error);
      return false;
    }
  }

  async updateTreasuryBalance() {
    try {
      // Get associated token account for treasury
      const { getAssociatedTokenAddress } = require('@solana/spl-token');
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        this.APES_TOKEN_MINT,
        this.TREASURY_ADDRESS
      );

      // Fetch balance
      const accountInfo = await getAccount(this.connection, treasuryTokenAccount);
      this.cachedBalance = Number(accountInfo.amount);
      this.lastBalanceCheck = Date.now();
      
      console.log(`💰 Treasury balance updated: ${this.formatAPES(this.cachedBalance)} APES`);
      
      // Store in database for historical tracking
      await this.recordBalanceSnapshot();
      
      return this.cachedBalance;
    } catch (error) {
      console.error('❌ Error updating treasury balance:', error);
      throw error;
    }
  }

  async recordBalanceSnapshot() {
    try {
      await db.query(`
        INSERT INTO treasury_snapshots (
          treasury_address, 
          token_mint, 
          balance, 
          balance_formatted,
          snapshot_time
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (treasury_address, token_mint, DATE(snapshot_time)) 
        DO UPDATE SET 
          balance = EXCLUDED.balance,
          balance_formatted = EXCLUDED.balance_formatted,
          snapshot_time = EXCLUDED.snapshot_time
      `, [
        this.TREASURY_ADDRESS.toString(),
        this.APES_TOKEN_MINT.toString(),
        this.cachedBalance.toString(),
        this.formatAPES(this.cachedBalance)
      ]);
    } catch (error) {
      // Don't fail on snapshot errors
      console.warn('⚠️ Failed to record balance snapshot:', error.message);
    }
  }

  async getTreasuryBalance(forceRefresh = false) {
    // Refresh every 5 minutes or on demand
    if (forceRefresh || Date.now() - this.lastBalanceCheck > 5 * 60 * 1000) {
      await this.updateTreasuryBalance();
    }
    
    return this.cachedBalance;
  }

  async calculateTotalExposure() {
    try {
      // Get active parlay bets liability
      const parlayResult = await db.query(`
        SELECT COALESCE(SUM(potential_payout), 0) as total_exposure
        FROM parlay_bets 
        WHERE status = 'active'
      `);
      
      // Get regular market exposure if exists
      const marketResult = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as market_exposure
        FROM predictions 
        WHERE status = 'active'
      `);
      
      const parlayExposure = parseFloat(parlayResult.rows[0]?.total_exposure || 0) * 1e6;
      const marketExposure = parseFloat(marketResult.rows[0]?.market_exposure || 0) * 1e6;
      
      return {
        parlayExposure,
        marketExposure,
        totalExposure: parlayExposure + marketExposure
      };
    } catch (error) {
      console.error('❌ Error calculating exposure:', error);
      return { parlayExposure: 0, marketExposure: 0, totalExposure: 0 };
    }
  }

  async validateBetRisk(betAmount, potentialPayout) {
    const balance = await this.getTreasuryBalance();
    const exposure = await this.calculateTotalExposure();
    
    const betAmountLamports = betAmount * 1e6;
    const payoutLamports = potentialPayout * 1e6;
    
    // Risk checks
    const checks = {
      sufficientBalance: balance > betAmountLamports,
      underExposureLimit: (exposure.totalExposure + payoutLamports) < (balance * this.RISK_THRESHOLDS.CRITICAL_EXPOSURE_LIMIT),
      underSingleBetLimit: payoutLamports < (balance * this.RISK_THRESHOLDS.MAX_SINGLE_BET_RATIO),
      treasuryNotLow: balance > this.RISK_THRESHOLDS.LOW_TREASURY_WARNING
    };
    
    const warnings = [];
    const errors = [];
    
    if (!checks.sufficientBalance) {
      errors.push('Insufficient treasury balance for bet amount');
    }
    
    if (!checks.underExposureLimit) {
      errors.push(`Total exposure would exceed ${this.RISK_THRESHOLDS.CRITICAL_EXPOSURE_LIMIT * 100}% of treasury`);
    }
    
    if (!checks.underSingleBetLimit) {
      errors.push(`Single bet payout too large (max ${this.RISK_THRESHOLDS.MAX_SINGLE_BET_RATIO * 100}% of treasury)`);
    }
    
    if (!checks.treasuryNotLow) {
      warnings.push('Treasury balance is below recommended minimum');
    }
    
    const exposureRatio = (exposure.totalExposure + payoutLamports) / balance;
    if (exposureRatio > this.RISK_THRESHOLDS.HIGH_EXPOSURE_WARNING) {
      warnings.push(`High exposure ratio: ${(exposureRatio * 100).toFixed(1)}%`);
    }
    
    return {
      approved: errors.length === 0,
      warnings,
      errors,
      riskMetrics: {
        currentBalance: this.formatAPES(balance),
        currentExposure: this.formatAPES(exposure.totalExposure),
        newExposure: this.formatAPES(exposure.totalExposure + payoutLamports),
        exposureRatio: (exposureRatio * 100).toFixed(1) + '%',
        betAmount: this.formatAPES(betAmountLamports),
        potentialPayout: this.formatAPES(payoutLamports)
      }
    };
  }

  async getRiskDashboard() {
    const balance = await this.getTreasuryBalance();
    const exposure = await this.calculateTotalExposure();
    const exposureRatio = exposure.totalExposure / balance;
    
    // Get recent bet statistics
    const recentStats = await db.query(`
      SELECT 
        COUNT(*) as recent_bets,
        COALESCE(SUM(stake_amount), 0) as recent_volume,
        COALESCE(SUM(potential_payout), 0) as recent_exposure
      FROM parlay_bets 
      WHERE placed_at > NOW() - INTERVAL '24 hours'
    `);
    
    const riskLevel = exposureRatio > this.RISK_THRESHOLDS.CRITICAL_EXPOSURE_LIMIT ? 'CRITICAL' :
                     exposureRatio > this.RISK_THRESHOLDS.HIGH_EXPOSURE_WARNING ? 'HIGH' :
                     balance < this.RISK_THRESHOLDS.LOW_TREASURY_WARNING ? 'MEDIUM' : 'LOW';
    
    return {
      treasuryBalance: this.formatAPES(balance),
      totalExposure: this.formatAPES(exposure.totalExposure),
      parlayExposure: this.formatAPES(exposure.parlayExposure),
      marketExposure: this.formatAPES(exposure.marketExposure),
      exposureRatio: (exposureRatio * 100).toFixed(1) + '%',
      riskLevel,
      recentStats: {
        bets24h: parseInt(recentStats.rows[0]?.recent_bets || 0),
        volume24h: this.formatAPES(parseFloat(recentStats.rows[0]?.recent_volume || 0) * 1e6),
        exposure24h: this.formatAPES(parseFloat(recentStats.rows[0]?.recent_exposure || 0) * 1e6)
      },
      thresholds: {
        highExposureWarning: (this.RISK_THRESHOLDS.HIGH_EXPOSURE_WARNING * 100) + '%',
        criticalExposureLimit: (this.RISK_THRESHOLDS.CRITICAL_EXPOSURE_LIMIT * 100) + '%',
        maxSingleBetRatio: (this.RISK_THRESHOLDS.MAX_SINGLE_BET_RATIO * 100) + '%',
        lowTreasuryWarning: this.formatAPES(this.RISK_THRESHOLDS.LOW_TREASURY_WARNING)
      },
      lastUpdated: new Date(this.lastBalanceCheck).toISOString()
    };
  }

  startMonitoring() {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('🔄 Starting treasury monitoring...');
    
    // Check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateTreasuryBalance();
        const dashboard = await this.getRiskDashboard();
        
        if (dashboard.riskLevel === 'CRITICAL') {
          console.log('🚨 CRITICAL RISK LEVEL - Treasury exposure too high!');
          // Could trigger alerts/notifications here
        } else if (dashboard.riskLevel === 'HIGH') {
          console.log('⚠️ HIGH RISK LEVEL - Monitor closely');
        }
      } catch (error) {
        console.error('❌ Treasury monitoring error:', error);
      }
    }, 5 * 60 * 1000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringActive = false;
      console.log('🛑 Treasury monitoring stopped');
    }
  }

  formatAPES(lamports) {
    return (lamports / 1e6).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

module.exports = new TreasuryMonitoringService();