const db = require('../config/database');

async function activateCS2Tournament() {
  console.log('🎮 Activating CS2 Parlay Tournament...');
  
  try {
    // Update tournament status to active
    const result = await db.query(`
      UPDATE parlay_tournaments 
      SET status = 'active'
      WHERE tournament_id = 'cs2-ewc-2025'
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tournament status updated to active');
      console.log('📊 Tournament:', {
        name: result.rows[0].name,
        status: result.rows[0].status,
        min_selections: result.rows[0].min_selections,
        base_multiplier: result.rows[0].base_multiplier
      });
    } else {
      console.log('❌ Tournament not found');
    }
    
    // Check matches
    const matchesResult = await db.query(`
      SELECT COUNT(*) as match_count, status
      FROM cs2_matches 
      WHERE tournament_id = 'cs2-ewc-2025'
      GROUP BY status
    `);
    
    console.log('🎯 Matches status:');
    matchesResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.match_count} matches`);
    });
    
    console.log('\n✅ CS2 Tournament is now ACTIVE!');
    console.log('🎮 Visit: http://localhost:3000/parlay/cs2-ewc-2025');
    
  } catch (error) {
    console.error('❌ Error activating tournament:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  activateCS2Tournament()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = activateCS2Tournament;