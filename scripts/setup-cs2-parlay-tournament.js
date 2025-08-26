const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration 
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// APES Program Configuration
const MARKET_SYSTEM_PROGRAM_ID = 'APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS';
const APES_TOKEN_MINT = '9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts';
const TREASURY_ADDRESS = 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z';

// CS2 Tournament Configuration
const TOURNAMENT_CONFIG = {
  tournamentId: 'cs2-ewc-2025',
  name: 'CS2 Esports World Cup 2025',
  startDate: new Date('2025-08-20T00:00:00Z').getTime() / 1000,
  endDate: new Date('2025-08-24T23:59:59Z').getTime() / 1000,
  minSelections: 2,
  maxSelections: 10,
  baseMultiplier: 1800, // 1.8x
  multiplierIncrement: 500, // 0.5x per additional selection
  maxExposure: 10_000_000 * 1_000_000, // 10M APES tokens
};

// CS2 Teams and Matches
const CS2_TEAMS = [
  'Team Vitality', 'G2 Esports', 'Natus Vincere', 'FaZe Clan',
  'Team Liquid', 'Astralis', 'MOUZ', 'Team Spirit',
  'HEROIC', 'TYLOO', 'Team Falcons', 'The MongolZ',
  'Aurora Gaming', 'GamerLegion', '3DMAX', 'Virtus.Pro'
];

const CS2_MATCHES = [
  // Round of 16 - August 20
  { teams: ['Team Vitality', 'Virtus.Pro'], date: '2025-08-20T14:00:00Z', round: 'Round of 16' },
  { teams: ['G2 Esports', 'HEROIC'], date: '2025-08-20T15:30:00Z', round: 'Round of 16' },
  { teams: ['Natus Vincere', '3DMAX'], date: '2025-08-20T17:00:00Z', round: 'Round of 16' },
  { teams: ['FaZe Clan', 'GamerLegion'], date: '2025-08-20T18:30:00Z', round: 'Round of 16' },
  { teams: ['Team Liquid', 'Aurora Gaming'], date: '2025-08-20T20:00:00Z', round: 'Round of 16' },
  { teams: ['Astralis', 'The MongolZ'], date: '2025-08-20T21:30:00Z', round: 'Round of 16' },
  { teams: ['MOUZ', 'Team Falcons'], date: '2025-08-21T14:00:00Z', round: 'Round of 16' },
  { teams: ['Team Spirit', 'TYLOO'], date: '2025-08-21T15:30:00Z', round: 'Round of 16' },
  
  // Quarter Finals - August 22
  { teams: ['TBD', 'TBD'], date: '2025-08-22T15:00:00Z', round: 'Quarter Final 1' },
  { teams: ['TBD', 'TBD'], date: '2025-08-22T17:00:00Z', round: 'Quarter Final 2' },
  { teams: ['TBD', 'TBD'], date: '2025-08-22T19:00:00Z', round: 'Quarter Final 3' },
  { teams: ['TBD', 'TBD'], date: '2025-08-22T21:00:00Z', round: 'Quarter Final 4' },
  
  // Semi Finals - August 23
  { teams: ['TBD', 'TBD'], date: '2025-08-23T16:00:00Z', round: 'Semi Final 1' },
  { teams: ['TBD', 'TBD'], date: '2025-08-23T19:00:00Z', round: 'Semi Final 2' },
  
  // Final - August 24
  { teams: ['TBD', 'TBD'], date: '2025-08-24T18:00:00Z', round: 'Grand Final' }
];

function generateMatchId(teamA, teamB, round) {
  const teamAShort = teamA.replace(/[^A-Z]/g, '').substring(0, 3);
  const teamBShort = teamB.replace(/[^A-Z]/g, '').substring(0, 3);
  const roundShort = round.replace(/[^A-Z]/g, '').substring(0, 6);
  const timestamp = Date.now().toString().slice(-6);
  return `CS2_${teamAShort}_${teamBShort}_${roundShort}_${timestamp}`.toLowerCase();
}

function generateMarketString(teamA, teamB, date, round) {
  const teamACode = teamA.replace(/[^A-Z]/g, '').substring(0, 3);
  const teamBCode = teamB.replace(/[^A-Z]/g, '').substring(0, 3);
  const dateStr = new Date(date).toISOString().substring(5, 10).replace('-', '');
  const roundCode = round.includes('Final') ? 'F' : round.includes('Semi') ? 'SF' : round.includes('Quarter') ? 'QF' : 'R16';
  return `CS2_EWC25_${roundCode}_${teamACode}_${teamBCode}_${dateStr}`;
}

async function setupCS2ParlayTournament() {
  console.log('🏆 Setting up CS2 Esports World Cup 2025 Parlay Tournament...');
  console.log('=====================================');
  
  try {
    // Generate configuration without requiring deployer keypair
    console.log('📝 Generating tournament configuration...');
    
    console.log('\\n🎮 Tournament Configuration:');
    console.log(`📅 Tournament: ${TOURNAMENT_CONFIG.name}`);
    console.log(`🆔 ID: ${TOURNAMENT_CONFIG.tournamentId}`);
    console.log(`📊 Min/Max Selections: ${TOURNAMENT_CONFIG.minSelections}/${TOURNAMENT_CONFIG.maxSelections}`);
    console.log(`🎯 Base Multiplier: ${TOURNAMENT_CONFIG.baseMultiplier / 1000}x`);
    console.log(`📈 Increment: +${TOURNAMENT_CONFIG.multiplierIncrement / 1000}x per selection`);
    console.log(`💼 Max Exposure: ${TOURNAMENT_CONFIG.maxExposure / 1_000_000} APES`);
    
    console.log('\\n⚽ Creating matches for CS2 tournament...');
    const processedMatches = CS2_MATCHES.map((match, index) => {
      const matchId = generateMatchId(match.teams[0], match.teams[1], match.round);
      const marketString = generateMarketString(match.teams[0], match.teams[1], match.date, match.round);
      
      return {
        match_id: matchId,
        market_string: marketString,
        team_a: match.teams[0],
        team_b: match.teams[1],
        match_date: new Date(match.date).getTime() / 1000,
        round: match.round,
        best_of: match.round.includes('Final') ? 5 : 3,
        status: 'scheduled'
      };
    });
    
    console.log(`✅ Processed ${processedMatches.length} matches`);
    
    // Save configuration for backend setup
    const configData = {
      tournament: TOURNAMENT_CONFIG,
      matches: processedMatches,
      programId: MARKET_SYSTEM_PROGRAM_ID,
      tokenMint: APES_TOKEN_MINT,
      treasury: TREASURY_ADDRESS,
      deployerWallet: 'DEPLOYER_WALLET_PLACEHOLDER',
      setupDate: new Date().toISOString()
    };
    
    const configPath = './cs2-parlay-tournament-config.json';
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log(`\\n💾 Configuration saved to: ${configPath}`);
    
    console.log('\\n📋 Sample matches created:');
    processedMatches.slice(0, 5).forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.team_a} vs ${match.team_b} (${match.round})`);
      console.log(`      🆔 ${match.match_id}`);
      console.log(`      📊 ${match.market_string}`);
      console.log(`      📅 ${new Date(match.match_date * 1000).toLocaleString()}`);
      console.log('');
    });
    
    console.log('\\n🚀 Next Steps:');
    console.log('=====================================');
    console.log('1. 🏗️  Deploy the extended smart contract:');
    console.log('   cd src/smart_contracts/market_system');
    console.log('   anchor build');
    console.log('   anchor upgrade --program-id APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS');
    console.log('');
    console.log('2. 🎯 Create parlay tournament on-chain:');
    console.log('   node scripts/create-parlay-tournament.js');
    console.log('');
    console.log('3. ⚽ Add matches to tournament:');
    console.log('   node scripts/create-parlay-matches.js');
    console.log('');
    console.log('4. 🌐 Update database with tournament data:');
    console.log('   psql -d your_db -f backend/migrations/update-cs2-tournament.sql');
    console.log('');
    console.log('5. 🎮 Test parlay betting on frontend');
    console.log('');
    console.log('🏆 CS2 PARLAY TOURNAMENT READY FOR DEPLOYMENT!');
    
    // Create SQL migration file
    const sqlMigration = `
-- Update CS2 Esports World Cup 2025 Tournament
INSERT INTO parlay_tournaments (
  tournament_id, name, min_selections, max_selections, 
  base_multiplier, multiplier_increment, start_date, end_date,
  max_exposure, status
) VALUES (
  '${TOURNAMENT_CONFIG.tournamentId}',
  '${TOURNAMENT_CONFIG.name}',
  ${TOURNAMENT_CONFIG.minSelections},
  ${TOURNAMENT_CONFIG.maxSelections},
  ${TOURNAMENT_CONFIG.baseMultiplier / 1000},
  ${TOURNAMENT_CONFIG.multiplierIncrement / 1000},
  to_timestamp(${TOURNAMENT_CONFIG.startDate}),
  to_timestamp(${TOURNAMENT_CONFIG.endDate}),
  ${TOURNAMENT_CONFIG.maxExposure / 1_000_000},
  'active'
) ON CONFLICT (tournament_id) DO UPDATE SET
  name = EXCLUDED.name,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  base_multiplier = EXCLUDED.base_multiplier,
  multiplier_increment = EXCLUDED.multiplier_increment,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  max_exposure = EXCLUDED.max_exposure,
  status = EXCLUDED.status;

-- Clear existing matches for this tournament
DELETE FROM cs2_matches WHERE tournament_id = '${TOURNAMENT_CONFIG.tournamentId}';

-- Insert new matches
${processedMatches.map(match => `
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  '${TOURNAMENT_CONFIG.tournamentId}',
  '${match.match_id}',
  '${match.market_string}',
  '${match.team_a}',
  '${match.team_b}',
  to_timestamp(${match.match_date}),
  '${match.round}',
  ${match.best_of},
  '${match.status}'
);`).join('')}

-- Update tournament stats
UPDATE parlay_tournaments 
SET total_matches = (
  SELECT COUNT(*) FROM cs2_matches 
  WHERE tournament_id = '${TOURNAMENT_CONFIG.tournamentId}'
)
WHERE tournament_id = '${TOURNAMENT_CONFIG.tournamentId}';
`;
    
    const sqlPath = './backend/migrations/update-cs2-parlay-tournament.sql';
    fs.writeFileSync(sqlPath, sqlMigration);
    console.log(`\\n📊 SQL migration saved to: ${sqlPath}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
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