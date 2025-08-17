const db = require('../config/database');

async function updateTeamLogos() {
  console.log('🖼️  Updating CS2 team logos...');
  
  const teamLogos = {
    'FaZe Clan': 'https://logos-world.net/wp-content/uploads/2021/02/FaZe-Clan-Logo.png',
    'G2 Esports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/G2_Esports_logo.svg/1200px-G2_Esports_logo.svg.png',
    'Vitality': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/70/Team_Vitality_logo.svg/1200px-Team_Vitality_logo.svg.png',
    'Cloud9': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png',
    'NIP': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Ninjas_in_Pyjamas_logo.svg/1200px-Ninjas_in_Pyjamas_logo.svg.png',
    'MOUZ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/MOUZ_logo.svg/1200px-MOUZ_logo.svg.png',
    'Heroic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Heroic_logo.svg/1200px-Heroic_logo.svg.png',
    'ENCE': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/ENCE_eSports_logo.svg/1200px-ENCE_eSports_logo.svg.png',
    'BIG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/BIG_logo.svg/1200px-BIG_logo.svg.png',
    'NAVI': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Natus_Vincere_Logo.svg/1200px-Natus_Vincere_Logo.svg.png',
    'Team Liquid': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Team_Liquid_logo.svg/1200px-Team_Liquid_logo.svg.png',
    'Astralis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Astralis_logo.svg/1200px-Astralis_logo.svg.png'
  };

  try {
    for (const [teamName, logoUrl] of Object.entries(teamLogos)) {
      // Update team_a logos
      const resultA = await db.query(`
        UPDATE cs2_matches 
        SET team_a_logo = $1 
        WHERE tournament_id = 'cs2-ewc-2025' AND team_a = $2
      `, [logoUrl, teamName]);

      // Update team_b logos  
      const resultB = await db.query(`
        UPDATE cs2_matches 
        SET team_b_logo = $1 
        WHERE tournament_id = 'cs2-ewc-2025' AND team_b = $2
      `, [logoUrl, teamName]);

      if (resultA.rowCount > 0 || resultB.rowCount > 0) {
        console.log(`✅ Updated ${teamName} logo (${resultA.rowCount + resultB.rowCount} matches)`);
      }
    }

    // Verify updates
    const matches = await db.query(`
      SELECT match_id, team_a, team_b, team_a_logo, team_b_logo
      FROM cs2_matches 
      WHERE tournament_id = 'cs2-ewc-2025'
      ORDER BY match_date
    `);

    console.log('\n📊 Current team logos:');
    matches.rows.forEach(match => {
      console.log(`${match.team_a} vs ${match.team_b}`);
      console.log(`  ${match.team_a}: ${match.team_a_logo ? '✅' : '❌'}`);
      console.log(`  ${match.team_b}: ${match.team_b_logo ? '✅' : '❌'}`);
    });

    console.log('\n✅ Team logos updated successfully!');

  } catch (error) {
    console.error('❌ Error updating team logos:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateTeamLogos()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = updateTeamLogos;