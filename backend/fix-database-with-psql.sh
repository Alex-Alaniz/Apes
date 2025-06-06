#!/bin/bash

# APES Database Fix Script - Using Direct PostgreSQL Connection
# This script connects directly to Supabase using psql and executes the database fixes

echo "🔧 APES Database Fix - PostgreSQL Direct Connection"
echo "=================================================="

# Database connection details
DB_HOST="db.xovbmbsnlcmxinlmlimz.supabase.co"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="APESprediction2024!"

# Test connection first
echo "🔄 Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    echo "Please check your connection details and try again."
    exit 1
fi

echo ""
echo "🚀 Executing database fixes..."
echo ""

# Execute the database fixes
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Add missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- Create the trigger function for updating point balances
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

-- Create the trigger on engagement_points table
DROP TRIGGER IF EXISTS trigger_update_point_balance ON engagement_points;
CREATE TRIGGER trigger_update_point_balance
    AFTER INSERT ON engagement_points
    FOR EACH ROW
    EXECUTE FUNCTION update_point_balance();

-- Test the trigger works
INSERT INTO engagement_points (user_address, activity_type, points_earned, description)
VALUES ('TEST_TRIGGER_USER_PSQL', 'wallet_connection', 25, 'Test trigger functionality via psql')
ON CONFLICT DO NOTHING;

-- Verify it worked
SELECT 
    user_address, 
    total_points, 
    available_points, 
    created_at, 
    updated_at 
FROM point_balances 
WHERE user_address = 'TEST_TRIGGER_USER_PSQL';

-- Show current leaderboard
SELECT 
    pb.user_address,
    COALESCE(u.username, SUBSTRING(pb.user_address, 1, 8) || '...') as display_name,
    pb.total_points,
    pb.available_points,
    pb.updated_at
FROM point_balances pb
LEFT JOIN users u ON pb.user_address = u.wallet_address
ORDER BY pb.total_points DESC
LIMIT 10;

-- Show recent engagement activities
SELECT 
    user_address,
    activity_type,
    points_earned,
    description,
    created_at
FROM engagement_points 
ORDER BY created_at DESC 
LIMIT 10;

-- Success message
SELECT 'Database fixes completed successfully! Check the results above.' as status;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database fixes executed successfully!"
    echo "✅ Point balance trigger is now active"
    echo "✅ New users will get points when connecting wallets"
    echo "✅ Leaderboard will update automatically"
    echo ""
    echo "📊 Check the output above for:"
    echo "   - Test user with 25 points (trigger verification)"
    echo "   - Current leaderboard standings"
    echo "   - Recent engagement activities"
else
    echo ""
    echo "❌ Some database fixes may have failed"
    echo "Check the output above for specific errors"
fi 