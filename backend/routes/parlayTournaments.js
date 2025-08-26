const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
// Optional services - graceful fallback if not available
let treasuryMonitoringService, parlayPayoutService;
try {
  treasuryMonitoringService = require('../services/treasuryMonitoringService');
  parlayPayoutService = require('../services/parlayPayoutService');
} catch (error) {
  console.log('⚠️ Treasury services not available - basic parlay mode only');
}

// Authorized admin wallets
const AUTHORIZED_WALLETS = [
  'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', // PRIMAPE Treasury
  'APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe', // Community Treasury
  'XgkAtCrgMcz63WBm6LR1uqEKDDJM4q6tLxRH7Dg6nSe', // New admin wallet
];

const isWalletAuthorized = (walletAddress) => {
  return AUTHORIZED_WALLETS.includes(walletAddress);
};

// Get parlay tournament details
router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const query = `
      SELECT 
        pt.*,
        COUNT(DISTINCT pb.id) as total_bets,
        COUNT(DISTINCT pb.user_address) as total_participants,
        SUM(pb.stake_amount) as total_volume
      FROM parlay_tournaments pt
      LEFT JOIN parlay_bets pb ON pt.tournament_id = pb.tournament_id
      WHERE pt.tournament_id = $1
      GROUP BY pt.id
    `;
    
    const result = await db.query(query, [tournamentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching parlay tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Get CS2 matches for tournament
router.get('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status, round } = req.query;
    
    let query = `
      SELECT 
        m.*,
        COUNT(DISTINCT pbs.bet_id) as total_bets,
        COUNT(CASE WHEN pbs.selected_team = m.team_a THEN 1 END) as team_a_bets,
        COUNT(CASE WHEN pbs.selected_team = m.team_b THEN 1 END) as team_b_bets
      FROM cs2_matches m
      LEFT JOIN parlay_bet_selections pbs ON m.match_id = pbs.match_id
      WHERE m.tournament_id = $1
    `;
    
    const params = [tournamentId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (round) {
      query += ` AND m.round = $${paramIndex}`;
      params.push(round);
      paramIndex++;
    }
    
    query += `
      GROUP BY m.id
      ORDER BY m.match_date ASC, m.round ASC
    `;
    
    const result = await db.query(query, params);
    
    // Calculate betting percentages
    const matches = result.rows.map(match => ({
      ...match,
      team_a_percentage: match.total_bets > 0 
        ? Math.round((match.team_a_bets / match.total_bets) * 100) 
        : 50,
      team_b_percentage: match.total_bets > 0 
        ? Math.round((match.team_b_bets / match.total_bets) * 100) 
        : 50
    }));
    
    res.json(matches);
  } catch (error) {
    console.error('Error fetching CS2 matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Place a parlay bet
router.post('/:tournamentId/bet', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { 
      userAddress, 
      selections, 
      stakeAmount, 
      transactionSignature,
      betId: providedBetId,
      multiplier: providedMultiplier,
      potentialPayout: providedPayout,
      burnAmount,
      claimBurnAmount,
      netPayout,
      implementationType 
    } = req.body;
    
    if (!userAddress || !selections || !stakeAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate tournament exists and is active
    const tournamentResult = await db.query(
      'SELECT * FROM parlay_tournaments WHERE tournament_id = $1 AND status = $2',
      [tournamentId, 'active']
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tournament not active' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Validate selections
    if (selections.length < tournament.min_selections) {
      return res.status(400).json({ 
        error: `Minimum ${tournament.min_selections} selections required` 
      });
    }
    
    if (selections.length > tournament.max_selections) {
      return res.status(400).json({ 
        error: `Maximum ${tournament.max_selections} selections allowed` 
      });
    }
    
    // Validate all matches exist and are scheduled
    const matchIds = selections.map(s => s.match_id);
    const matchesResult = await db.query(
      'SELECT match_id FROM cs2_matches WHERE match_id = ANY($1) AND status = $2',
      [matchIds, 'scheduled']
    );
    
    if (matchesResult.rows.length !== selections.length) {
      return res.status(400).json({ error: 'Invalid match selections' });
    }
    
    // Calculate multiplier (corrected: base for 2 selections, increment for each additional)
    const baseMultiplier = parseFloat(tournament.base_multiplier);
    const increment = parseFloat(tournament.multiplier_increment);
    const totalMultiplier = baseMultiplier + (increment * (selections.length - 2));
    const potentialPayout = stakeAmount * totalMultiplier;
    
    // Create bet (use provided betId for database implementation or generate new one)
    const betId = providedBetId || uuidv4();
    
    // Begin transaction
    await db.query('BEGIN');
    
    try {
      // Insert parlay bet (use provided payout if available, otherwise calculate)
      const finalPayout = providedPayout || potentialPayout;
      
      await db.query(`
        INSERT INTO parlay_bets (
          bet_id, tournament_id, user_address, selections, 
          selection_count, stake_amount, total_multiplier, 
          potential_payout, status, transaction_signature,
          implementation_type, is_simulated, burn_amount,
          claim_burn_amount, net_payout
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        betId, tournamentId, userAddress, JSON.stringify(selections),
        selections.length, stakeAmount, totalMultiplier,
        finalPayout, 'pending', transactionSignature || null,
        implementationType || 'solana', implementationType === 'database',
        burnAmount || 0, claimBurnAmount || 0, netPayout || finalPayout
      ]);
      
      // Insert individual selections
      for (const selection of selections) {
        await db.query(`
          INSERT INTO parlay_bet_selections (
            bet_id, match_id, selected_team
          ) VALUES ($1, $2, $3)
        `, [betId, selection.match_id, selection.selected_team]);
      }
      
      // Update tournament volume
      await db.query(`
        UPDATE parlay_tournaments 
        SET total_volume = total_volume + $1
        WHERE tournament_id = $2
      `, [stakeAmount, tournamentId]);
      
      await db.query('COMMIT');
      
      console.log(`✅ Parlay bet ${betId} placed by ${userAddress.substring(0, 8)}...`);
      
      res.json({
        success: true,
        betId,
        totalMultiplier,
        potentialPayout,
        message: `Parlay bet placed with ${selections.length} selections`
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error placing parlay bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Get user's parlay bets
router.get('/:tournamentId/bets/:userAddress', async (req, res) => {
  try {
    const { tournamentId, userAddress } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT 
        pb.*,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'match_id', pbs.match_id,
            'selected_team', pbs.selected_team,
            'is_correct', pbs.is_correct,
            'match_resolved', pbs.match_resolved,
            'match_details', JSON_BUILD_OBJECT(
              'team_a', m.team_a,
              'team_b', m.team_b,
              'match_date', m.match_date,
              'status', m.status,
              'winner', m.winner
            )
          )
        ) as bet_selections
      FROM parlay_bets pb
      JOIN parlay_bet_selections pbs ON pb.bet_id = pbs.bet_id
      JOIN cs2_matches m ON pbs.match_id = m.match_id
      WHERE pb.tournament_id = $1 AND pb.user_address = $2
    `;
    
    const params = [tournamentId, userAddress];
    
    if (status) {
      query += ` AND pb.status = $3`;
      params.push(status);
    }
    
    query += `
      GROUP BY pb.id
      ORDER BY pb.placed_at DESC
    `;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user parlay bets:', error);
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

// Get parlay tournament leaderboard
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { limit = 100 } = req.query;
    
    const query = `
      SELECT * FROM parlay_leaderboard
      WHERE tournament_id = $1
      LIMIT $2
    `;
    
    const result = await db.query(query, [tournamentId, limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching parlay leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Update match result (admin only)
router.put('/matches/:matchId/result', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { winner, scoreA, scoreB } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!isWalletAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!winner || (winner !== 'team_a' && winner !== 'team_b')) {
      return res.status(400).json({ error: 'Invalid winner' });
    }
    
    await db.query('BEGIN');
    
    try {
      // Update match result
      const matchResult = await db.query(`
        UPDATE cs2_matches 
        SET winner = $1, score_a = $2, score_b = $3, status = $4, updated_at = NOW()
        WHERE match_id = $5
        RETURNING *
      `, [winner, scoreA, scoreB, 'completed', matchId]);
      
      if (matchResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Match not found' });
      }
      
      const match = matchResult.rows[0];
      const winningTeam = winner === 'team_a' ? match.team_a : match.team_b;
      
      // Update all bet selections for this match
      await db.query(`
        UPDATE parlay_bet_selections
        SET 
          is_correct = (selected_team = $1),
          match_resolved = true
        WHERE match_id = $2
      `, [winningTeam, matchId]);
      
      // Get all affected parlay bets
      const affectedBets = await db.query(`
        SELECT DISTINCT pb.bet_id, pb.selection_count
        FROM parlay_bets pb
        JOIN parlay_bet_selections pbs ON pb.bet_id = pbs.bet_id
        WHERE pbs.match_id = $1 AND pb.status = 'pending'
      `, [matchId]);
      
      // Update each affected bet
      for (const bet of affectedBets.rows) {
        // Check if all matches in this bet are resolved
        const selectionStats = await db.query(`
          SELECT 
            COUNT(*) as total_selections,
            COUNT(CASE WHEN match_resolved = true THEN 1 END) as resolved_selections,
            COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_selections,
            COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_selections
          FROM parlay_bet_selections
          WHERE bet_id = $1
        `, [bet.bet_id]);
        
        const stats = selectionStats.rows[0];
        
        // Update bet status
        let newStatus = 'pending';
        if (stats.incorrect_selections > 0) {
          // If any selection is incorrect, bet is lost
          newStatus = 'lost';
        } else if (stats.resolved_selections === stats.total_selections) {
          // All selections resolved and correct
          newStatus = 'won';
        }
        
        await db.query(`
          UPDATE parlay_bets
          SET 
            status = $1,
            winning_count = $2,
            resolved_count = $3,
            resolved_at = CASE WHEN $1 != 'pending' THEN NOW() ELSE NULL END
          WHERE bet_id = $4
        `, [newStatus, stats.correct_selections, stats.resolved_selections, bet.bet_id]);
      }
      
      await db.query('COMMIT');
      
      console.log(`✅ Match ${matchId} result updated by ${walletAddress.substring(0, 8)}...`);
      res.json({ 
        success: true, 
        match: match,
        affectedBets: affectedBets.rows.length 
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({ error: 'Failed to update match result' });
  }
});

// Add CS2 matches (admin only)
router.post('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { matches } = req.body;
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!isWalletAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Invalid matches data' });
    }
    
    const insertedMatches = [];
    
    for (const match of matches) {
      const matchId = match.match_id || uuidv4();
      
      const result = await db.query(`
        INSERT INTO cs2_matches (
          match_id, tournament_id, round, team_a, team_b,
          team_a_logo, team_b_logo, match_date, venue,
          best_of, liquipedia_url, hltv_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (match_id) DO UPDATE
        SET 
          round = EXCLUDED.round,
          team_a = EXCLUDED.team_a,
          team_b = EXCLUDED.team_b,
          team_a_logo = EXCLUDED.team_a_logo,
          team_b_logo = EXCLUDED.team_b_logo,
          match_date = EXCLUDED.match_date,
          venue = EXCLUDED.venue,
          best_of = EXCLUDED.best_of,
          liquipedia_url = EXCLUDED.liquipedia_url,
          hltv_url = EXCLUDED.hltv_url,
          updated_at = NOW()
        RETURNING *
      `, [
        matchId, tournamentId, match.round, match.team_a, match.team_b,
        match.team_a_logo, match.team_b_logo, match.match_date, match.venue,
        match.best_of || 3, match.liquipedia_url, match.hltv_url
      ]);
      
      insertedMatches.push(result.rows[0]);
    }
    
    console.log(`✅ ${insertedMatches.length} CS2 matches added by ${walletAddress.substring(0, 8)}...`);
    res.json({ success: true, matches: insertedMatches });
    
  } catch (error) {
    console.error('Error adding CS2 matches:', error);
    res.status(500).json({ error: 'Failed to add matches' });
  }
});

// ADMIN ENDPOINTS

// Resolve a match (admin only)
router.put('/:tournamentId/matches/:matchId/resolve', async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { winningTeam, adminAddress } = req.body;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const result = await parlayPayoutService.resolveMatch(matchId, winningTeam, adminAddress);
    res.json(result);
    
  } catch (error) {
    console.error('Error resolving match:', error);
    res.status(500).json({ error: 'Failed to resolve match' });
  }
});

// Get treasury health dashboard (admin only)
router.get('/admin/treasury-health', async (req, res) => {
  try {
    const { adminAddress } = req.query;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const dashboard = await treasuryMonitoringService.getRiskDashboard();
    const payoutStats = await parlayPayoutService.getPayoutStats();
    
    res.json({
      treasury: dashboard,
      payouts: payoutStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching treasury health:', error);
    res.status(500).json({ error: 'Failed to fetch treasury health' });
  }
});

// Update risk controls (admin only)
router.put('/admin/risk-controls', async (req, res) => {
  try {
    const { adminAddress, controlName, controlValue } = req.body;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    await db.query(`
      UPDATE risk_controls 
      SET control_value = $1, updated_by = $2, updated_at = NOW()
      WHERE control_name = $3
    `, [controlValue, adminAddress, controlName]);
    
    res.json({ 
      success: true, 
      message: `Risk control ${controlName} updated to ${controlValue}` 
    });
    
  } catch (error) {
    console.error('Error updating risk controls:', error);
    res.status(500).json({ error: 'Failed to update risk controls' });
  }
});

// Emergency pause toggle (admin only)
router.post('/admin/emergency-pause', async (req, res) => {
  try {
    const { adminAddress, paused } = req.body;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    await db.query(`
      UPDATE risk_controls 
      SET control_value = $1, updated_by = $2, updated_at = NOW()
      WHERE control_name = 'emergency_pause'
    `, [paused ? 1 : 0, adminAddress]);
    
    res.json({ 
      success: true, 
      message: `Emergency pause ${paused ? 'activated' : 'deactivated'}`,
      paused
    });
    
  } catch (error) {
    console.error('Error toggling emergency pause:', error);
    res.status(500).json({ error: 'Failed to toggle emergency pause' });
  }
});

// Get recent risk events (admin only)
router.get('/admin/risk-events', async (req, res) => {
  try {
    const { adminAddress } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const events = await db.query(`
      SELECT * FROM risk_events 
      ORDER BY triggered_at DESC 
      LIMIT $1
    `, [limit]);
    
    res.json(events.rows);
    
  } catch (error) {
    console.error('Error fetching risk events:', error);
    res.status(500).json({ error: 'Failed to fetch risk events' });
  }
});

// Get pending payouts (admin only)
router.get('/admin/pending-payouts', async (req, res) => {
  try {
    const { adminAddress } = req.query;
    
    // Admin authorization check
    if (!AUTHORIZED_WALLETS.includes(adminAddress)) {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    const payouts = await db.query(`
      SELECT pp.*, pb.bet_id, pb.user_address, pb.stake_amount, pb.total_multiplier
      FROM parlay_payouts pp
      JOIN parlay_bets pb ON pp.bet_id = pb.bet_id
      WHERE pp.payout_status IN ('pending', 'processing')
      ORDER BY pp.created_at ASC
    `);
    
    res.json(payouts.rows);
    
  } catch (error) {
    console.error('Error fetching pending payouts:', error);
    res.status(500).json({ error: 'Failed to fetch pending payouts' });
  }
});

// PUBLIC ENDPOINTS

// Get risk status (public - for UI warnings)
router.get('/risk-status', async (req, res) => {
  try {
    const pauseCheck = await db.query(`SELECT should_pause_betting() as should_pause`);
    const dashboard = await treasuryMonitoringService.getRiskDashboard();
    
    res.json({
      bettingPaused: pauseCheck.rows[0]?.should_pause || false,
      riskLevel: dashboard.riskLevel,
      exposureRatio: dashboard.exposureRatio,
      treasuryStatus: dashboard.riskLevel === 'LOW' ? 'healthy' : 'warning'
    });
    
  } catch (error) {
    console.error('Error fetching risk status:', error);
    res.status(500).json({ error: 'Failed to fetch risk status' });
  }
});

module.exports = router;