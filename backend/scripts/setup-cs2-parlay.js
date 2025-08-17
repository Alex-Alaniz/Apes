const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function setupCS2ParlayTournament() {
  console.log('🎮 Setting up CS2 Parlay Tournament...');
  
  try {
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, '../migrations/create_cs2_parlay_tournament.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📝 Creating parlay tournament tables...');
    await db.query(migrationSQL);
    
    console.log('✅ Parlay tournament tables created successfully');
    
    // Add sample CS2 matches for testing
    console.log('🎯 Adding sample CS2 matches...');
    
    const sampleMatches = [
      {
        match_id: 'cs2-ewc-2025-001',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'FaZe Clan',
        team_b: 'G2 Esports',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/SMhzsxzbvIBPOMh8QmFgdF.svg?ixlib=java-2.1.0&s=e6a9ce0345c7d703e5eaac14307f69aa',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/zFLwAELOD15BjJSDMMNBWQ.png?ixlib=java-2.1.0&s=affb589e2d88f5547ea48400c6f7de4f',
        match_date: '2025-07-02 14:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      },
      {
        match_id: 'cs2-ewc-2025-002',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'NAVI',
        team_b: 'Vitality',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/kixzGZIb9IYAAv-1vGrGev.svg?ixlib=java-2.1.0&s=8f9986a391fcb1adfbfff021b824a937',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/GAlByJtDTnkgbb9p_71SUL.png?ixlib=java-2.1.0&s=dfe5e040c0275edde7bece90d875fed0',
        match_date: '2025-07-02 17:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      },
      {
        match_id: 'cs2-ewc-2025-003',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'Team Liquid',
        team_b: 'Astralis',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/JMeLLbWKCIEJrmfPaqOz4O.svg?ixlib=java-2.1.0&s=c02caf90234d3a3ebac074c84ba1ea62',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/9bgXHp-oh1oaXr7F0mTGmd.svg?ixlib=java-2.1.0&s=f567161ab183001be33948b98c4b2067',
        match_date: '2025-07-03 14:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      },
      {
        match_id: 'cs2-ewc-2025-004',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'Cloud9',
        team_b: 'NIP',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/l9S90XMEFMEP-wpAHAv0kR.png?ixlib=java-2.1.0&s=014a9b7e382ad97d48cd5b88ad4fb0f5',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/kKiE8t7V1vQtZXvUxHjY7I.svg?ixlib=java-2.1.0&s=c9f1bbc8a0c9bd6e276c550c5e332f77',
        match_date: '2025-07-03 17:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      },
      {
        match_id: 'cs2-ewc-2025-005',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'MOUZ',
        team_b: 'Heroic',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/Q66f3J5fgyaH6hFmJiSqUh.svg?ixlib=java-2.1.0&s=7968a66fb3f06034bb3e40e01a7513f5',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/ffSPDr6eSLRqWeMFgaOtHO.svg?ixlib=java-2.1.0&s=c5118da6cd189e506503cd1d04f1aacc',
        match_date: '2025-07-04 14:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      },
      {
        match_id: 'cs2-ewc-2025-006',
        tournament_id: 'cs2-ewc-2025',
        round: 'Group Stage',
        team_a: 'ENCE',
        team_b: 'BIG',
        team_a_logo: 'https://img-cdn.hltv.org/teamlogo/Fhpu5jq6c_DOJdm8N0i5mQ.svg?ixlib=java-2.1.0&s=12e3b8e90cf88b105a8f4ba1f87caf87',
        team_b_logo: 'https://img-cdn.hltv.org/teamlogo/OgMRQO4F5oMKGMvJTq5hBt.svg?ixlib=java-2.1.0&s=21c245b05f3e527f4bdc93c0a9fde870',
        match_date: '2025-07-04 17:00:00',
        venue: 'Riyadh Arena',
        best_of: 3,
        liquipedia_url: 'https://liquipedia.net/counterstrike/Esports_World_Cup/2025',
        hltv_url: 'https://www.hltv.org/matches'
      }
    ];
    
    for (const match of sampleMatches) {
      await db.query(`
        INSERT INTO cs2_matches (
          match_id, tournament_id, round, team_a, team_b,
          team_a_logo, team_b_logo, match_date, venue,
          best_of, liquipedia_url, hltv_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (match_id) DO NOTHING
      `, [
        match.match_id, match.tournament_id, match.round, match.team_a, match.team_b,
        match.team_a_logo, match.team_b_logo, match.match_date, match.venue,
        match.best_of, match.liquipedia_url, match.hltv_url
      ]);
    }
    
    console.log(`✅ Added ${sampleMatches.length} sample CS2 matches`);
    
    // Check tournament status
    const tournamentResult = await db.query(
      'SELECT * FROM parlay_tournaments WHERE tournament_id = $1',
      ['cs2-ewc-2025']
    );
    
    if (tournamentResult.rows.length > 0) {
      console.log('📊 CS2 Parlay Tournament Status:');
      console.log(`   Name: ${tournamentResult.rows[0].name}`);
      console.log(`   Status: ${tournamentResult.rows[0].status}`);
      console.log(`   Prize Pool: ${tournamentResult.rows[0].prize_pool} APES`);
      console.log(`   Min Selections: ${tournamentResult.rows[0].min_selections}`);
      console.log(`   Base Multiplier: ${tournamentResult.rows[0].base_multiplier}x`);
    }
    
    console.log('\n✅ CS2 Parlay Tournament setup complete!');
    console.log('🎮 Access the tournament at: /parlay/cs2-ewc-2025');
    
  } catch (error) {
    console.error('❌ Error setting up CS2 parlay tournament:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupCS2ParlayTournament()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = setupCS2ParlayTournament;