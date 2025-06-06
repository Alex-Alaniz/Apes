const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = 'https://xovbmbsnlcmxinlmlimz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdmJtYnNubGNteGlubG1saV96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjkzNjMzMCwiZXhwIjoyMDQ4NTEyMzMwfQ.FHp3o5AZ8X6WXkjvJ-fzxNXyHRCbCVhUNuKQ8_Y1234'; 

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseFix() {
  try {
    console.log('🔧 APES Database Fix - Starting...');
    
    // Test connection first
    console.log('🔄 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1);
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection successful');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'COMPLETE_DATABASE_FIX.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('🔄 Executing database fixes...');
    
    // Split the SQL into individual statements (simple approach)
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('SELECT \'Database fixes'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Error executing statement: ${error.message}`);
            errorCount++;
          } else {
            console.log('✅ Statement executed successfully');
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception executing statement: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Database Fix Summary:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All database fixes completed successfully!');
      
      // Test the trigger
      console.log('\n🔄 Testing the point balance trigger...');
      const testUser = `TEST_USER_${Date.now()}`;
      
      const { error: insertError } = await supabase
        .from('engagement_points')
        .insert({
          user_address: testUser,
          activity_type: 'wallet_connection',
          points_earned: 25,
          description: 'Test wallet connection points'
        });
      
      if (insertError) {
        console.error('❌ Trigger test failed:', insertError.message);
      } else {
        console.log('✅ Trigger test successful - points should be added to point_balances');
        
        // Check if points were added
        const { data: balanceData, error: balanceError } = await supabase
          .from('point_balances')
          .select('*')
          .eq('user_address', testUser);
        
        if (balanceError) {
          console.error('❌ Could not verify trigger:', balanceError.message);
        } else if (balanceData && balanceData.length > 0) {
          console.log('🎉 TRIGGER WORKING! Point balance created:', balanceData[0]);
        } else {
          console.warn('⚠️  Trigger may not be working - no balance found');
        }
      }
    } else {
      console.log('\n⚠️  Some statements failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Critical error running database fix:', error);
  }
}

// Alternative method using direct SQL execution
async function runDatabaseFixDirect() {
  try {
    console.log('🔧 APES Database Fix - Direct SQL Method...');
    
    // Method 1: Try to add columns
    console.log('🔄 Adding missing columns...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE engagement_points 
            ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);`
    });
    
    if (alterError) {
      console.log('ℹ️ Column add result:', alterError.message);
    } else {
      console.log('✅ Columns added successfully');
    }
    
    // Method 2: Create the function
    console.log('🔄 Creating trigger function...');
    const triggerFunction = `
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
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { sql: triggerFunction });
    if (functionError) {
      console.error('❌ Function creation failed:', functionError.message);
    } else {
      console.log('✅ Trigger function created');
    }
    
    // Method 3: Create the trigger
    console.log('🔄 Creating trigger...');
    const triggerSQL = `
      DROP TRIGGER IF EXISTS trigger_update_point_balance ON engagement_points;
      CREATE TRIGGER trigger_update_point_balance
          AFTER INSERT ON engagement_points
          FOR EACH ROW
          EXECUTE FUNCTION update_point_balance();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSQL });
    if (triggerError) {
      console.error('❌ Trigger creation failed:', triggerError.message);
    } else {
      console.log('✅ Trigger created');
    }
    
    console.log('\n🎉 Database fix completed using direct method!');
    
  } catch (error) {
    console.error('💥 Direct method failed:', error);
  }
}

// Run the fix
console.log('🚀 Starting APES Database Fix...');
runDatabaseFixDirect()
  .then(() => {
    console.log('\n✅ Database fix process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database fix failed:', error);
    process.exit(1);
  }); 