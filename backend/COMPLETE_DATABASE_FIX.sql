-- ==================================================
-- APES Prediction Market - Complete Database Fix
-- Run this ENTIRE script in your Supabase SQL Editor
-- ==================================================

-- 1. Add missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- 2. Create the trigger function for updating point balances
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

-- 3. Create the trigger on engagement_points table
DROP TRIGGER IF EXISTS trigger_update_point_balance ON engagement_points;
CREATE TRIGGER trigger_update_point_balance
    AFTER INSERT ON engagement_points
    FOR EACH ROW
    EXECUTE FUNCTION update_point_balance();

-- 4. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_points_user_address ON engagement_points (user_address);
CREATE INDEX IF NOT EXISTS idx_engagement_points_activity_type ON engagement_points (activity_type);
CREATE INDEX IF NOT EXISTS idx_point_balances_user_address ON point_balances (user_address);
CREATE INDEX IF NOT EXISTS idx_point_balances_total_points ON point_balances (total_points DESC);

-- 5. Insert test data to verify the trigger works
INSERT INTO engagement_points (user_address, activity_type, points_earned, description)
VALUES ('TEST_TRIGGER_USER', 'wallet_connection', 25, 'Test trigger functionality')
ON CONFLICT DO NOTHING;

-- 6. Verify the trigger worked by checking point_balances
SELECT 
    user_address, 
    total_points, 
    available_points, 
    created_at, 
    updated_at 
FROM point_balances 
WHERE user_address = 'TEST_TRIGGER_USER';

-- 7. Show current leaderboard data
SELECT 
    pb.user_address,
    u.username,
    pb.total_points,
    pb.available_points,
    pb.updated_at
FROM point_balances pb
LEFT JOIN users u ON pb.user_address = u.wallet_address
ORDER BY pb.total_points DESC
LIMIT 10;

-- 8. Show recent engagement activities
SELECT 
    user_address,
    activity_type,
    points_earned,
    description,
    created_at
FROM engagement_points 
ORDER BY created_at DESC 
LIMIT 20;

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================
SELECT 'Database fixes completed successfully! Check the results above.' as status; 