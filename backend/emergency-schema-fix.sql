-- ======================================================
-- APES EMERGENCY DATABASE SCHEMA FIX
-- This script fixes ALL database issues in one go
-- ======================================================

-- Step 1: Add ALL missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- Step 2: Ensure point_balances table has correct structure
CREATE TABLE IF NOT EXISTS point_balances (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(255) UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create the trigger function for automatic point balance updates
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

-- Step 4: Create the trigger on engagement_points table
DROP TRIGGER IF EXISTS trigger_update_point_balance ON engagement_points;
CREATE TRIGGER trigger_update_point_balance
    AFTER INSERT ON engagement_points
    FOR EACH ROW
    EXECUTE FUNCTION update_point_balance();

-- Step 5: Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_points_user_address ON engagement_points (user_address);
CREATE INDEX IF NOT EXISTS idx_engagement_points_activity_type ON engagement_points (activity_type);
CREATE INDEX IF NOT EXISTS idx_engagement_points_created_at ON engagement_points (created_at);
CREATE INDEX IF NOT EXISTS idx_point_balances_user_address ON point_balances (user_address);
CREATE INDEX IF NOT EXISTS idx_point_balances_total_points ON point_balances (total_points DESC);

-- Step 6: Clean up any test data from previous failed attempts
DELETE FROM engagement_points WHERE user_address LIKE 'TEST_%';
DELETE FROM point_balances WHERE user_address LIKE 'TEST_%';

-- Step 7: Test the complete system
INSERT INTO engagement_points (user_address, activity_type, points_earned, description)
VALUES ('TEST_EMERGENCY_FIX', 'wallet_connection', 25, 'Emergency schema fix verification test');

-- Step 8: Verify the trigger worked
SELECT 
    'SUCCESS: Point balance trigger is working!' as status,
    user_address, 
    total_points, 
    available_points, 
    created_at, 
    updated_at 
FROM point_balances 
WHERE user_address = 'TEST_EMERGENCY_FIX';

-- Step 9: Show current leaderboard to verify everything works
SELECT 
    'Current Leaderboard:' as info,
    pb.user_address,
    COALESCE(u.username, SUBSTRING(pb.user_address, 1, 8) || '...') as display_name,
    pb.total_points,
    pb.available_points,
    pb.updated_at
FROM point_balances pb
LEFT JOIN users u ON pb.user_address = u.wallet_address
ORDER BY pb.total_points DESC
LIMIT 10;

-- Step 10: Show recent engagement activities
SELECT 
    'Recent Engagement Activities:' as info,
    user_address,
    activity_type,
    points_earned,
    description,
    created_at
FROM engagement_points 
ORDER BY created_at DESC 
LIMIT 10;

-- Success message
SELECT '🎉 EMERGENCY DATABASE FIX COMPLETED SUCCESSFULLY! 🎉' as final_status; 