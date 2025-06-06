// Set environment variables BEFORE requiring modules
process.env.SUPABASE_URL = "https://xovbmbsnlcmxinlmlimz.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY0NjUwNSwiZXhwIjoyMDY0MjIyNTA1fQ.J3_P7Y-u1OGD9gZlQ1FCHx5pPccPLhfttZOiu-_myOU";

const supabase = require('./config/supabase');

async function checkTables() {
  console.log('🔍 Checking available tables...');
  
  // Test users table (we know this works)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('wallet_address')
    .limit(1);
  
  console.log('✅ Users table:', users ? `EXISTS (${users.length} rows checked)` : 'MISSING');
  
  // Test markets table
  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('market_address')
    .limit(1);
  
  console.log('📊 Markets table:', marketsError ? `ERROR: ${marketsError.message}` : `EXISTS (${markets.length} rows)`);
  
  // Test point_balances table
  const { data: balances, error: balancesError } = await supabase
    .from('point_balances')
    .select('user_address')
    .limit(1);
  
  console.log('💰 Point_balances table:', balancesError ? `ERROR: ${balancesError.message}` : `EXISTS (${balances.length} rows)`);
  
  // Test engagement_points table
  const { data: points, error: pointsError } = await supabase
    .from('engagement_points')
    .select('user_address')
    .limit(1);
  
  console.log('🎯 Engagement_points table:', pointsError ? `ERROR: ${pointsError.message}` : `EXISTS (${points.length} rows)`);
  
  // Test market_metadata table
  const { data: metadata, error: metadataError } = await supabase
    .from('market_metadata')
    .select('id')
    .limit(1);
  
  console.log('📋 Market_metadata table:', metadataError ? `ERROR: ${metadataError.message}` : `EXISTS (${metadata.length} rows)`);
}

checkTables()
  .then(() => {
    console.log('🎉 Table check completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error checking tables:', err);
    process.exit(1);
  }); 