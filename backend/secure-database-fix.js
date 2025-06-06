const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use environment variables (no hardcoded keys!)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 APES Secure Database Fix');
console.log('📍 Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('🔑 Service Key:', supabaseServiceKey ? 'Set (hidden)' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing environment variables!');
  console.error('Please ensure your .env file contains:');
  console.error('SUPABASE_URL=your_supabase_url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\nFor security, get these from your Supabase dashboard.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\n🔄 Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function runDatabaseFix() {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('\n💥 Cannot proceed without valid Supabase connection');
      console.error('Please check your environment variables and try again.');
      return;
    }

    console.log('\n🚀 Running database fixes...');
    
    // Test if we can insert into engagement_points (this will trigger the point balance update if working)
    console.log('🔄 Testing engagement points insertion...');
    const testUser = `TEST_DB_FIX_${Date.now()}`;
    
    const { error: insertError } = await supabase
      .from('engagement_points')
      .insert({
        user_address: testUser,
        activity_type: 'wallet_connection',
        points_earned: 25,
        description: 'Database fix test - wallet connection'
      });

    if (insertError) {
      console.error('❌ Failed to insert test engagement points:', insertError.message);
      console.log('\n📋 Manual steps required:');
      console.log('1. Go to your Supabase dashboard SQL editor');
      console.log('2. Run the SQL script from COMPLETE_DATABASE_FIX.sql');
      return;
    }

    console.log('✅ Test engagement points inserted successfully');

    // Check if point balance was created (trigger working)
    console.log('🔄 Checking if point balance trigger is working...');
    const { data: balanceData, error: balanceError } = await supabase
      .from('point_balances')
      .select('*')
      .eq('user_address', testUser);

    if (balanceError) {
      console.error('❌ Error checking point balances:', balanceError.message);
    } else if (balanceData && balanceData.length > 0) {
      console.log('🎉 SUCCESS! Point balance trigger is working correctly');
      console.log('📊 Test user balance:', balanceData[0]);
      console.log('\n✅ Your database is properly configured!');
      console.log('✅ New users will now get points when connecting wallets');
      console.log('✅ Leaderboard will update automatically');
    } else {
      console.log('⚠️ Point balance not created - trigger may be missing');
      console.log('\n📋 Please run the SQL script manually in Supabase dashboard');
    }

    // Show current leaderboard
    console.log('\n📊 Current leaderboard preview:');
    const { data: leaderboard, error: leaderError } = await supabase
      .from('point_balances')
      .select(`
        user_address,
        total_points,
        available_points,
        users!inner(username)
      `)
      .order('total_points', { ascending: false })
      .limit(5);

    if (leaderError) {
      console.log('ℹ️ Could not fetch leaderboard:', leaderError.message);
    } else {
      leaderboard?.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.users?.username || entry.user_address.slice(0, 8)} - ${entry.total_points} points`);
      });
    }

  } catch (error) {
    console.error('💥 Database fix failed:', error.message);
  }
}

// Run the fix
runDatabaseFix()
  .then(() => {
    console.log('\n🏁 Database fix process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Critical error:', error.message);
    process.exit(1);
  }); 