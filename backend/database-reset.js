const supabase = require('./config/supabase');
const pool = require('./config/database');

async function resetDatabase() {
  console.log('🔄 Starting database reset and cleanup...');

  try {
    // 1. Clean up test users and Railway test data
    console.log('🧹 Cleaning up test users...');
    
    // Remove users with test patterns in their wallet addresses
    const { data: testUsers, error: testUsersError } = await supabase
      .from('users')
      .delete()
      .or('wallet_address.ilike.%test%,wallet_address.ilike.%demo%,wallet_address.ilike.%railway%')
      .select();

    if (testUsersError) {
      console.error('Error cleaning test users:', testUsersError);
    } else {
      console.log(`✅ Removed ${testUsers?.length || 0} test users`);
    }

    // 2. Fix orphaned engagement points (points without users)
    console.log('🔧 Fixing orphaned engagement points...');
    
    const { data: orphanedPoints, error: orphanedError } = await supabase
      .from('engagement_points')
      .delete()
      .not('user_address', 'in', `(SELECT wallet_address FROM users)`)
      .select();

    if (orphanedError) {
      console.error('Error cleaning orphaned points:', orphanedError);
    } else {
      console.log(`✅ Removed ${orphanedPoints?.length || 0} orphaned engagement points`);
    }

    // 3. Recalculate all point balances
    console.log('🔄 Recalculating point balances...');
    
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('wallet_address');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    let updatedCount = 0;
    for (const user of allUsers || []) {
      try {
        // Calculate total points for user
        const { data: userPoints, error: pointsError } = await supabase
          .from('engagement_points')
          .select('points_earned')
          .eq('user_address', user.wallet_address);

        if (pointsError) {
          console.error(`Error calculating points for ${user.wallet_address}:`, pointsError);
          continue;
        }

        const totalPoints = userPoints.reduce((sum, record) => sum + (record.points_earned || 0), 0);

        // Get existing claimed points
        const { data: existingBalance, error: balanceError } = await supabase
          .from('point_balances')
          .select('claimed_points')
          .eq('user_address', user.wallet_address)
          .single();

        const claimedPoints = existingBalance?.claimed_points || 0;
        const availablePoints = Math.max(0, totalPoints - claimedPoints);

        // Update or create point balance
        const { error: upsertError } = await supabase
          .from('point_balances')
          .upsert({
            user_address: user.wallet_address,
            total_points: totalPoints,
            available_points: availablePoints,
            claimed_points: claimedPoints,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_address'
          });

        if (upsertError) {
          console.error(`Error updating balance for ${user.wallet_address}:`, upsertError);
        } else {
          updatedCount++;
        }

      } catch (error) {
        console.error(`Error processing user ${user.wallet_address}:`, error);
      }
    }

    console.log(`✅ Updated point balances for ${updatedCount} users`);

    // 4. Remove duplicate Twitter links
    console.log('🔧 Cleaning duplicate Twitter links...');
    
    const { data: duplicateLinks, error: duplicateError } = await supabase
      .rpc('remove_duplicate_twitter_links');

    if (duplicateError) {
      console.error('Error removing duplicate links:', duplicateError);
    } else {
      console.log('✅ Cleaned up duplicate Twitter links');
    }

    // 5. Verify data integrity
    console.log('🔍 Verifying data integrity...');
    
    const { data: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact' });

    const { data: pointBalanceCount, error: balanceCountError } = await supabase
      .from('point_balances')
      .select('*', { count: 'exact' });

    const { data: engagementCount, error: engagementCountError } = await supabase
      .from('engagement_points')
      .select('*', { count: 'exact' });

    if (!userCountError && !balanceCountError && !engagementCountError) {
      console.log('📊 Database stats after cleanup:');
      console.log(`   Users: ${userCount.length}`);
      console.log(`   Point balances: ${pointBalanceCount.length}`);
      console.log(`   Engagement points: ${engagementCount.length}`);
    }

    console.log('✅ Database reset completed successfully!');
    
    return {
      success: true,
      stats: {
        usersRemoved: testUsers?.length || 0,
        orphanedPointsRemoved: orphanedPoints?.length || 0,
        balancesUpdated: updatedCount,
        totalUsers: userCount?.length || 0,
        totalPointBalances: pointBalanceCount?.length || 0,
        totalEngagementPoints: engagementCount?.length || 0
      }
    };

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// Function to create missing database indexes for better performance
async function createIndexes() {
  console.log('🔧 Creating database indexes for performance...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_engagement_points_user_address ON engagement_points(user_address);',
    'CREATE INDEX IF NOT EXISTS idx_engagement_points_activity_type ON engagement_points(activity_type);',
    'CREATE INDEX IF NOT EXISTS idx_engagement_points_created_at ON engagement_points(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_point_balances_total_points ON point_balances(total_points DESC);',
    'CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);',
    'CREATE INDEX IF NOT EXISTS idx_wallet_twitter_links_twitter_id ON wallet_twitter_links(twitter_id);'
  ];

  try {
    for (const index of indexes) {
      await pool.query(index);
    }
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    // Continue - indexes are optional for functionality
  }
}

// Run the reset if called directly
if (require.main === module) {
  resetDatabase()
    .then(async (result) => {
      console.log('🎯 Reset result:', result);
      await createIndexes();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase, createIndexes }; 