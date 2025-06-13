const { Client } = require('pg');

async function checkTournamentStructure() {
  const url = new URL(process.env.POSTGRES_URL);
  
  const client = new Client({
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database...\n');
    
    // Check tournaments table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Tournaments table columns:');
    console.table(columnsResult.rows);
    
    // Check existing tournaments
    const tournamentsResult = await client.query(`
      SELECT id, tournament_id, name, status FROM tournaments;
    `);
    
    console.log('\nExisting tournaments:');
    console.table(tournamentsResult.rows);
    
    // Check if numeric tournament_id 1 exists
    const numericCheck = await client.query(`
      SELECT * FROM tournaments WHERE id = 1;
    `);
    
    console.log('\nTournament with ID=1:');
    if (numericCheck.rows.length > 0) {
      console.log(numericCheck.rows[0]);
    } else {
      console.log('Not found');
    }
    
    // Check if string tournament_id exists
    const stringCheck = await client.query(`
      SELECT * FROM tournaments WHERE tournament_id = 'club-world-cup-2025';
    `);
    
    console.log('\nTournament with tournament_id="club-world-cup-2025":');
    if (stringCheck.rows.length > 0) {
      console.log(stringCheck.rows[0]);
    } else {
      console.log('Not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTournamentStructure(); 