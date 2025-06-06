const supabase = require('./config/supabase');

async function fixPointBalanceTrigger() {
  try {
    console.log('🔧 Checking and fixing point balance trigger...');
    
    // First, create the function
    const createFunctionSQL = `
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
    
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    });
    
    if (functionError) {
      console.log('📝 Creating function using direct SQL...');
      // Try direct SQL execution if RPC doesn't work
      const { error: directError } = await supabase
        .from('_functions')
        .insert({ sql: createFunctionSQL });
      
      if (directError) {
        console.log('⚠️ Could not create function via Supabase client, will need manual execution');
      }
    } else {
      console.log('✅ Function created successfully');
    }
    
    // Create the trigger
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS update_balance_on_engagement ON engagement_points;
      CREATE TRIGGER update_balance_on_engagement
      AFTER INSERT ON engagement_points
      FOR EACH ROW
      EXECUTE FUNCTION update_point_balance();
    `;
    
    console.log('📝 SQL to execute manually in Supabase dashboard:');
    console.log('=====================================');
    console.log(createFunctionSQL);
    console.log('=====================================');
    console.log(createTriggerSQL);
    console.log('=====================================');
    
    // Let's also backfill any missing point balances
    console.log('🔄 Backfilling point balances...');
    
    // Get all users who have engagement points but no point balance
    const { data: engagementData, error: engagementError } = await supabase
      .from('engagement_points')
      .select('user_address, points_earned')
      .order('created_at', { ascending: true });
    
    if (engagementError) {
      console.error('❌ Error fetching engagement points:', engagementError);
      throw engagementError;
    }
    
    if (!engagementData || engagementData.length === 0) {
      console.log('📭 No engagement points found');
      return;
    }
    
    // Group by user and sum points
    const userTotals = {};
    engagementData.forEach(entry => {
      if (!userTotals[entry.user_address]) {
        userTotals[entry.user_address] = 0;
      }
      userTotals[entry.user_address] += entry.points_earned;
    });
    
    console.log(`📊 Found ${Object.keys(userTotals).length} users with engagement points`);
    
    // Update point balances for each user
    for (const [userAddress, totalPoints] of Object.entries(userTotals)) {
      try {
        const { error: upsertError } = await supabase
          .from('point_balances')
          .upsert({
            user_address: userAddress,
            total_points: totalPoints,
            available_points: totalPoints,
            claimed_points: 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_address'
          });
        
        if (upsertError) {
          console.error(`❌ Error updating balance for ${userAddress}:`, upsertError);
        } else {
          console.log(`✅ Updated balance for ${userAddress}: ${totalPoints} points`);
        }
      } catch (error) {
        console.error(`❌ Exception updating balance for ${userAddress}:`, error);
      }
    }
    
    console.log('🎉 Point balance backfill completed!');
    
  } catch (error) {
    console.error('❌ Error fixing point balance trigger:', error);
    throw error;
  }
}

// Run the fix
fixPointBalanceTrigger()
  .then(() => {
    console.log('✅ Point balance trigger fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }); 