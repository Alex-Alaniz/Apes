const { Connection, PublicKey, Transaction, Keypair } = require('@solana/web3.js');
const { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID 
} = require('@solana/spl-token');
const db = require('../config/database');
const treasuryMonitoringService = require('./treasuryMonitoringService');

class ParlayPayoutService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    this.APES_TOKEN_MINT = new PublicKey('9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts');
    this.TREASURY_ADDRESS = new PublicKey('APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z');
    
    // Load treasury keypair from environment (for automated payouts)
    // In production, this should be a secure multisig or program authority
    this.treasuryKeypair = null;
    if (process.env.TREASURY_PRIVATE_KEY) {
      try {
        const privateKeyBytes = JSON.parse(process.env.TREASURY_PRIVATE_KEY);
        this.treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
        console.log('✅ Treasury keypair loaded for automated payouts');
      } catch (error) {
        console.warn('⚠️ Failed to load treasury keypair - manual payouts only');
      }
    }
    
    this.processingPayouts = false;
  }

  async initialize() {
    console.log('💰 Initializing Parlay Payout Service...');
    
    // Ensure treasury monitoring is active
    await treasuryMonitoringService.initialize();
    
    // Start automated payout processing
    this.startPayoutProcessor();
    
    return true;
  }

  async resolveMatch(matchId, winningTeam, adminAddress) {
    console.log(`🎯 Resolving match ${matchId} - Winner: ${winningTeam}`);
    
    try {
      // Start transaction
      await db.query('BEGIN');
      
      // Update match result
      await db.query(`
        UPDATE cs2_matches 
        SET status = 'completed', winner = $1, resolved_at = NOW(), resolved_by = $2
        WHERE match_id = $3 AND status = 'scheduled'
      `, [winningTeam === 'team_a' ? 'team_a' : 'team_b', adminAddress, matchId]);
      
      // Find all active parlay bets that include this match
      const affectedBets = await db.query(`
        SELECT DISTINCT pb.bet_id, pb.user_address, pb.stake_amount, pb.potential_payout
        FROM parlay_bets pb
        JOIN parlay_bet_selections pbs ON pb.bet_id = pbs.bet_id
        WHERE pb.status = 'active' AND pbs.match_id = $1
      `, [matchId]);
      
      console.log(`📊 Found ${affectedBets.rows.length} affected parlay bets`);
      
      for (const bet of affectedBets.rows) {
        await this.evaluateParlayBet(bet.bet_id, matchId, winningTeam);
      }
      
      await db.query('COMMIT');
      console.log(`✅ Match ${matchId} resolved successfully`);
      
      return {
        success: true,
        matchId,
        winningTeam,
        affectedBets: affectedBets.rows.length
      };
      
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Error resolving match:', error);
      throw error;
    }
  }

  async evaluateParlayBet(betId, resolvedMatchId, winningTeam) {
    try {
      // Get bet details and all selections
      const betResult = await db.query(`
        SELECT pb.*, 
               json_agg(
                 json_build_object(
                   'match_id', pbs.match_id,
                   'selected_team', pbs.selected_team,
                   'match_resolved', cm.status = 'completed',
                   'match_winner', cm.winner,
                   'is_correct', CASE 
                     WHEN cm.status = 'completed' THEN
                       (pbs.selected_team = cm.team_a AND cm.winner = 'team_a') OR
                       (pbs.selected_team = cm.team_b AND cm.winner = 'team_b')
                     ELSE NULL
                   END
                 )
               ) as selections
        FROM parlay_bets pb
        JOIN parlay_bet_selections pbs ON pb.bet_id = pbs.bet_id
        LEFT JOIN cs2_matches cm ON pbs.match_id = cm.match_id
        WHERE pb.bet_id = $1
        GROUP BY pb.bet_id
      `, [betId]);
      
      if (betResult.rows.length === 0) {
        throw new Error(`Bet ${betId} not found`);
      }
      
      const bet = betResult.rows[0];
      const selections = bet.selections;
      
      // Check if all matches are resolved
      const allResolved = selections.every(s => s.match_resolved);
      const allCorrect = selections.every(s => s.is_correct === true);
      const anyIncorrect = selections.some(s => s.is_correct === false);
      
      if (anyIncorrect) {
        // Parlay lost - one or more selections wrong
        await this.markBetAsLost(betId);
      } else if (allResolved && allCorrect) {
        // Parlay won - all selections correct
        await this.markBetAsWon(betId);
      }
      // If partially resolved but no losses yet, wait for remaining matches
      
    } catch (error) {
      console.error(`❌ Error evaluating parlay bet ${betId}:`, error);
      throw error;
    }
  }

  async markBetAsLost(betId) {
    try {
      await db.query(`
        UPDATE parlay_bets 
        SET status = 'lost', resolved_at = NOW()
        WHERE bet_id = $1
      `, [betId]);
      
      console.log(`❌ Parlay bet ${betId} marked as lost`);
      
      // Log event
      await db.query(`
        INSERT INTO risk_events (event_type, severity, description, bet_amount)
        SELECT 'bet_lost', 'low', 'Parlay bet lost', stake_amount * 1000000
        FROM parlay_bets WHERE bet_id = $1
      `, [betId]);
      
    } catch (error) {
      console.error(`Error marking bet ${betId} as lost:`, error);
      throw error;
    }
  }

  async markBetAsWon(betId) {
    try {
      // Update bet status
      await db.query(`
        UPDATE parlay_bets 
        SET status = 'won', resolved_at = NOW()
        WHERE bet_id = $1
      `, [betId]);
      
      // Create payout record
      const betResult = await db.query(`
        SELECT user_address, potential_payout FROM parlay_bets WHERE bet_id = $1
      `, [betId]);
      
      if (betResult.rows.length > 0) {
        const { user_address, potential_payout } = betResult.rows[0];
        const burnAmount = potential_payout * 0.015; // 1.5% burn on claims
        const payoutAmount = potential_payout - burnAmount;
        
        await db.query(`
          INSERT INTO parlay_payouts (
            bet_id, user_address, payout_amount, burn_amount, payout_status
          ) VALUES ($1, $2, $3, $4, 'pending')
        `, [betId, user_address, payoutAmount, burnAmount]);
        
        console.log(`✅ Parlay bet ${betId} marked as won - payout: ${payoutAmount} APES`);
      }
      
    } catch (error) {
      console.error(`Error marking bet ${betId} as won:`, error);
      throw error;
    }
  }

  async processPendingPayouts() {
    if (this.processingPayouts || !this.treasuryKeypair) {
      return;
    }
    
    this.processingPayouts = true;
    
    try {
      // Get pending payouts
      const pendingPayouts = await db.query(`
        SELECT * FROM parlay_payouts 
        WHERE payout_status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      
      if (pendingPayouts.rows.length === 0) {
        return;
      }
      
      console.log(`💸 Processing ${pendingPayouts.rows.length} pending payouts...`);
      
      for (const payout of pendingPayouts.rows) {
        try {
          await this.processSinglePayout(payout);
        } catch (error) {
          console.error(`Failed to process payout ${payout.id}:`, error);
          
          // Mark as failed
          await db.query(`
            UPDATE parlay_payouts 
            SET payout_status = 'failed', processed_at = NOW()
            WHERE id = $1
          `, [payout.id]);
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing payouts:', error);
    } finally {
      this.processingPayouts = false;
    }
  }

  async processSinglePayout(payout) {
    console.log(`💰 Processing payout for ${payout.user_address}: ${payout.payout_amount} APES`);
    
    // Validate treasury has sufficient balance
    const riskCheck = await treasuryMonitoringService.validateBetRisk(0, parseFloat(payout.payout_amount));
    
    if (!riskCheck.approved) {
      throw new Error(`Payout validation failed: ${riskCheck.errors.join(', ')}`);
    }
    
    // Mark as processing
    await db.query(`
      UPDATE parlay_payouts 
      SET payout_status = 'processing'
      WHERE id = $1
    `, [payout.id]);
    
    try {
      // Get token accounts
      const userAddress = new PublicKey(payout.user_address);
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        this.APES_TOKEN_MINT,
        this.TREASURY_ADDRESS
      );
      const userTokenAccount = await getAssociatedTokenAddress(
        this.APES_TOKEN_MINT,
        userAddress
      );
      
      // Create transfer instruction
      const payoutAmountLamports = Math.floor(parseFloat(payout.payout_amount) * 1e6);
      const transferInstruction = createTransferInstruction(
        treasuryTokenAccount,
        userTokenAccount,
        this.TREASURY_ADDRESS,
        payoutAmountLamports,
        [],
        TOKEN_PROGRAM_ID
      );
      
      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.treasuryKeypair],
        { skipPreflight: false }
      );
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      // Mark as completed
      await db.query(`
        UPDATE parlay_payouts 
        SET payout_status = 'completed', transaction_signature = $2, processed_at = NOW()
        WHERE id = $1
      `, [payout.id, signature]);
      
      console.log(`✅ Payout completed: ${signature}`);
      
      // Log success event
      await db.query(`
        INSERT INTO risk_events (event_type, severity, description, bet_amount)
        VALUES ('payout_completed', 'low', $1, $2)
      `, [
        `Automated payout completed: ${payout.payout_amount} APES to ${payout.user_address}`,
        Math.floor(parseFloat(payout.payout_amount) * 1e6)
      ]);
      
    } catch (error) {
      console.error(`❌ Transaction failed for payout ${payout.id}:`, error);
      throw error;
    }
  }

  startPayoutProcessor() {
    console.log('🔄 Starting automated payout processor...');
    
    // Process payouts every 2 minutes
    this.payoutInterval = setInterval(async () => {
      try {
        await this.processPendingPayouts();
      } catch (error) {
        console.error('❌ Payout processor error:', error);
      }
    }, 2 * 60 * 1000);
  }

  stopPayoutProcessor() {
    if (this.payoutInterval) {
      clearInterval(this.payoutInterval);
      console.log('🛑 Payout processor stopped');
    }
  }

  async getPayoutStats() {
    const stats = await db.query(`
      SELECT 
        payout_status,
        COUNT(*) as count,
        COALESCE(SUM(payout_amount), 0) as total_amount
      FROM parlay_payouts
      GROUP BY payout_status
    `);
    
    const recentPayouts = await db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(payout_amount), 0) as amount
      FROM parlay_payouts 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    return {
      byStatus: stats.rows.reduce((acc, row) => {
        acc[row.payout_status] = {
          count: parseInt(row.count),
          totalAmount: parseFloat(row.total_amount)
        };
        return acc;
      }, {}),
      recent24h: {
        count: parseInt(recentPayouts.rows[0]?.count || 0),
        totalAmount: parseFloat(recentPayouts.rows[0]?.amount || 0)
      },
      automatedPayoutsEnabled: !!this.treasuryKeypair
    };
  }
}

module.exports = new ParlayPayoutService();