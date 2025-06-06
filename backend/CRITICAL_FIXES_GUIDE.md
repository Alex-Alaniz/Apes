# APES Prediction Market - Critical Fixes Guide

## 🚨 Current Issues Identified

1. **New users not getting points when connecting wallets**
2. **Twitter/X linking not working**
3. **Users not appearing on leaderboard after wallet connection**

## 🔧 Root Cause Analysis

### Issue 1: Missing Database Trigger
The `point_balances` table is not being updated when new engagement points are awarded because the database trigger is missing.

### Issue 2: Twitter Routes Using Old PostgreSQL Connection
The Twitter linking routes were still using the old `require('../config/database')` instead of Supabase.

### Issue 3: Missing Database Tables and Columns
Several required tables and columns for Twitter functionality and engagement tracking are missing.

## 🎯 Fixes Implemented

### ✅ 1. Created Supabase-Based Twitter Routes
- **File**: `backend/routes/twitter-supabase.js`
- **Updated**: `backend/server.js` to use new Twitter routes
- **Features**:
  - Debug endpoint for manual Twitter linking: `POST /api/twitter/auth/debug-link`
  - Check Twitter link status: `GET /api/twitter/check-link/:walletAddress`
  - Get Twitter info by wallet: `GET /api/twitter/twitter-by-wallet/:walletAddress`
  - Unlink Twitter: `DELETE /api/twitter/unlink/:walletAddress`

### ✅ 2. Created Database Migration SQL
- **File**: `backend/sql-fixes-for-production.sql`
- Contains all required database schema fixes

### ✅ 3. Created Point Balance Fix Script
- **File**: `backend/fix-point-balance-trigger.js`
- Backfills missing point balances
- Shows SQL for manual execution

## 🚀 Deployment Steps

### Step 1: Execute Database Fixes
Run the following SQL in the Supabase dashboard **SQL Editor**:

```sql
-- 1. Add missing columns to engagement_points table
ALTER TABLE engagement_points 
ADD COLUMN IF NOT EXISTS requires_twitter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);

-- 2. Create the function for updating point balances
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

-- 3. Create the trigger to automatically update point balances
DROP TRIGGER IF EXISTS update_balance_on_engagement ON engagement_points;
CREATE TRIGGER update_balance_on_engagement
AFTER INSERT ON engagement_points
FOR EACH ROW
EXECUTE FUNCTION update_point_balance();
```

### Step 2: Create Missing Tables
```sql
-- Create twitter-related tables if they don't exist
CREATE TABLE IF NOT EXISTS twitter_accounts (
    twitter_id VARCHAR(50) PRIMARY KEY,
    twitter_username VARCHAR(100) NOT NULL,
    twitter_followers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_twitter_links (
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    twitter_id VARCHAR(50) REFERENCES twitter_accounts(twitter_id),
    is_primary_wallet BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (wallet_address, twitter_id)
);

-- Update users table to include twitter fields if missing
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0;
```

### Step 3: Backfill Point Balances
```sql
-- Insert missing point balances based on engagement_points
INSERT INTO point_balances (user_address, total_points, available_points, claimed_points, updated_at)
SELECT 
    user_address,
    SUM(points_earned) as total_points,
    SUM(points_earned) as available_points,
    0 as claimed_points,
    CURRENT_TIMESTAMP as updated_at
FROM engagement_points 
GROUP BY user_address
ON CONFLICT (user_address) DO UPDATE
SET 
    total_points = EXCLUDED.total_points,
    available_points = EXCLUDED.available_points,
    updated_at = CURRENT_TIMESTAMP;
```

### Step 4: Deploy Backend Changes
The backend code has been updated with:
- ✅ New Supabase Twitter routes
- ✅ Updated server.js to use new routes
- ✅ Engagement service already properly configured

## 🧪 Testing Instructions

### Test 1: Wallet Connection Points
1. Connect a new wallet to the app
2. Check if user appears on leaderboard with 25 points
3. **API Test**:
   ```bash
   curl -X POST https://apes-production.up.railway.app/api/users/create-or-get \
   -H "Content-Type: application/json" \
   -H "x-wallet-address: TESTWALLET123" \
   -d '{}'
   ```

### Test 2: Twitter Linking (Debug Mode)
1. Use the debug endpoint to link Twitter:
   ```bash
   curl -X POST https://apes-production.up.railway.app/api/twitter/auth/debug-link \
   -H "Content-Type: application/json" \
   -d '{
     "walletAddress": "TESTWALLET123",
     "twitterId": "12345678",
     "username": "testuser"
   }'
   ```

### Test 3: Verify Point Balance Updates
1. Check if point balances are updated in real-time
2. **Verification Query**:
   ```sql
   SELECT user_address, total_points FROM point_balances ORDER BY total_points DESC LIMIT 10;
   ```

## 🔍 Verification Queries

### Check Trigger Exists
```sql
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'update_balance_on_engagement';
```

### Check Point Balance Sync
```sql
-- Check for users with engagement but no balance
SELECT DISTINCT ep.user_address 
FROM engagement_points ep 
LEFT JOIN point_balances pb ON ep.user_address = pb.user_address 
WHERE pb.user_address IS NULL;
```

### Check Twitter Links
```sql
SELECT u.wallet_address, u.twitter_username, pb.total_points
FROM users u
LEFT JOIN point_balances pb ON u.wallet_address = pb.user_address
WHERE u.twitter_id IS NOT NULL
ORDER BY pb.total_points DESC;
```

## 🎉 Expected Results After Fixes

1. **New wallet connections** → Automatically receive 25 points and appear on leaderboard
2. **Twitter linking** → Works via debug endpoint, awards 100 points
3. **Point balances** → Update in real-time when engagement points are awarded
4. **Leaderboard** → Shows all users with points correctly

## 🚨 Important Notes

- The database trigger **MUST** be created for points to work
- Twitter OAuth is simplified to debug endpoint for now
- All existing engagement points will be backfilled to point_balances
- Frontend will automatically work once backend APIs return correct data

## 📞 Emergency Contact

If issues persist after deployment:
1. Check Railway backend logs for errors
2. Verify database trigger exists in Supabase
3. Test API endpoints manually with curl
4. Check point_balances table for data 