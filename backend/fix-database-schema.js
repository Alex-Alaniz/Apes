const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the anon key for basic operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saV96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5MzYzMzAsImV4cCI6MjA0ODUxMjMzMH0.M5jJ9xvJJ5Z4y6Y8X9wY7vZ3qN1pQ2oK8L7mR6N4P9X";

console.log('🔧 APES Database Schema Fix');
console.log('📍 Supabase URL:', supabaseUrl || 'Missing');

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFixSchema() {
  try {
    console.log('\n🔍 Checking current database schema...');
    
    // Check what columns exist in engagement_points table
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'engagement_points' })
      .then(result => {
        // If RPC doesn't exist, try a simple query to check schema
        return supabase.from('engagement_points').select('*').limit(1);
      });
    
    if (columnError) {
      console.log('ℹ️ Could not fetch schema via RPC, trying direct query...');
      
      // Try to insert a test record to see what columns are missing
      const testData = {
        user_address: 'TEST_SCHEMA_CHECK',
        activity_type: 'wallet_connection',
        points_earned: 25
      };
      
      const { error: insertError } = await supabase
        .from('engagement_points')
        .insert(testData);
      
      if (insertError) {
        console.log('📋 Current schema issue:', insertError.message);
        
        if (insertError.message.includes('description')) {
          console.log('🔧 Adding missing description column...');
          await addMissingColumns();
        }
      } else {
        console.log('✅ Basic schema looks good');
        await checkPointBalanceTrigger();
      }
    }
    
  } catch (error) {
    console.error('💥 Schema check failed:', error.message);
    await manualSchemaFix();
  }
}

async function addMissingColumns() {
  console.log('🔧 Attempting to add missing columns...');
  
  // Since we can't run DDL with anon key, we'll need to use direct SQL
  const missingColumns = [
    'description TEXT',
    'requires_twitter BOOLEAN DEFAULT FALSE',
    'tweet_id VARCHAR(100)'
  ];
  
  console.log('📋 Missing columns that need to be added:');
  missingColumns.forEach(col => console.log(`   - ${col}`));
  
  console.log('\n⚠️ These columns need to be added manually in Supabase dashboard.');
  await manualSchemaFix();
}

async function checkPointBalanceTrigger() {
  console.log('\n🔄 Testing point balance trigger...');
  
  const testUser = `TEST_TRIGGER_${Date.now()}`;
  
  // Insert test engagement points
  const { error: insertError } = await supabase
    .from('engagement_points')
    .insert({
      user_address: testUser,
      activity_type: 'wallet_connection',
      points_earned: 25,
      description: 'Test trigger functionality'
    });
  
  if (insertError) {
    console.error('❌ Could not insert test engagement points:', insertError.message);
    await manualSchemaFix();
    return;
  }
  
  console.log('✅ Test engagement points inserted');
  
  // Check if point balance was created
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const { data: balanceData, error: balanceError } = await supabase
    .from('point_balances')
    .select('*')
    .eq('user_address', testUser);
  
  if (balanceError) {
    console.error('❌ Error checking point balances:', balanceError.message);
  } else if (balanceData && balanceData.length > 0) {
    console.log('🎉 SUCCESS! Point balance trigger is working!');
    console.log('📊 Test user balance:', balanceData[0]);
    console.log('\n✅ Database is fully functional!');
    return true;
  } else {
    console.log('⚠️ Point balance not created - trigger is missing');
    await manualSchemaFix();
  }
  
  return false;
}

async function manualSchemaFix() {
  console.log('\n📋 MANUAL SCHEMA FIX REQUIRED');
  console.log('============================================');
  console.log('\nPlease execute this SQL in your Supabase SQL Editor:');
  console.log('\n```sql');
  
  const fixSQL = `
-- Fix 1: Add missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- Fix 2: Create the trigger function for point balances
CREATE OR REPLACE FUNCTION update_point_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO point_balances (user_address, total_points, available_points)
    VALUES (NEW.user_address, NEW.points_earned, NEW.points_earned)
    ON CONFLICT (user_address) DO UPDATE
    SET 
        total_points = point_balances.total_points + NEW.points_earned,
        available_points = point_balances.available_points + NEW.points_earned,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Create the trigger
DROP TRIGGER IF EXISTS trigger_update_point_balance ON engagement_points;
CREATE TRIGGER trigger_update_point_balance
    AFTER INSERT ON engagement_points
    FOR EACH ROW
    EXECUTE FUNCTION update_point_balance();

-- Fix 4: Test the trigger
INSERT INTO engagement_points (user_address, activity_type, points_earned, description)
VALUES ('TEST_MANUAL_FIX', 'wallet_connection', 25, 'Manual schema fix test')
ON CONFLICT DO NOTHING;

-- Fix 5: Verify it worked
SELECT * FROM point_balances WHERE user_address = 'TEST_MANUAL_FIX';
`;
  
  console.log(fixSQL);
  console.log('```\n');
  console.log('🎯 After running this SQL:');
  console.log('✅ New users will get 25 points when connecting wallets');
  console.log('✅ Leaderboard will update automatically');
  console.log('✅ All engagement tracking will work');
}

// Run the schema check
checkAndFixSchema()
  .then(() => {
    console.log('\n🏁 Schema check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Schema check failed:', error.message);
    process.exit(1);
  }); 