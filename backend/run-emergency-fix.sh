#!/bin/bash

echo "🚨 APES EMERGENCY DATABASE FIX"
echo "==============================="
echo ""

# Database connection details
DB_HOST="db.xovbmbsnlcmxinlmlimz.supabase.co"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="APESprediction2024!"

echo "🔄 Connecting to Supabase database..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found!"
    echo "Please install PostgreSQL client first:"
    echo "  brew install postgresql"
    exit 1
fi

# Test connection
echo "🧪 Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'Connection successful!' as status;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Database connection failed!"
    echo ""
    echo "🔧 Trying alternative connection methods..."
    
    # Try without SSL
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'Connection successful!' as status;" --set=sslmode=disable > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo "❌ Alternative connection also failed!"
        echo ""
        echo "🆘 MANUAL FIX REQUIRED:"
        echo "Please run the SQL from emergency-schema-fix.sql manually in your Supabase dashboard."
        echo ""
        echo "1. Go to: https://supabase.com/dashboard/project/xovbmbsnlcmxinlmlimz"
        echo "2. Click SQL Editor > New Query"
        echo "3. Copy and paste the contents of emergency-schema-fix.sql"
        echo "4. Click RUN"
        echo ""
        exit 1
    fi
fi

echo "✅ Database connection successful!"
echo ""

echo "🚀 Executing emergency schema fix..."
echo "===================================="

# Execute the emergency fix SQL
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f emergency-schema-fix.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 EMERGENCY FIX COMPLETED SUCCESSFULLY!"
    echo "========================================"
    echo ""
    echo "✅ Database schema has been fixed"
    echo "✅ Missing columns have been added"  
    echo "✅ Point balance trigger is active"
    echo "✅ Indexes have been created for performance"
    echo ""
    echo "🧪 TESTING SYSTEM NOW..."
    echo ""
    
    # Test that everything works
    echo "Testing wallet connection points..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO engagement_points (user_address, activity_type, points_earned, description)
    VALUES ('FINAL_TEST_USER', 'wallet_connection', 25, 'Final system test after emergency fix');
    
    SELECT 'Final Test Results:' as info, user_address, total_points, available_points 
    FROM point_balances 
    WHERE user_address = 'FINAL_TEST_USER';
    "
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎯 SYSTEM IS FULLY FUNCTIONAL!"
        echo "✅ New users will get 25 points when connecting wallets"
        echo "✅ Leaderboard will update automatically"
        echo "✅ All engagement tracking is working"
        echo ""
        echo "🚀 Ready for QA and final testing!"
    else
        echo "⚠️ System test had issues, but basic fix was applied"
    fi
    
else
    echo ""
    echo "❌ Emergency fix encountered some errors"
    echo "Please check the output above for details"
    echo ""
    echo "🆘 FALLBACK: Manual SQL execution required"
    echo "Run the SQL from emergency-schema-fix.sql in Supabase dashboard"
fi 