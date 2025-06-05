-- PRIMAPE Database Cleanup for QA Testing
-- WARNING: This will delete all market and prediction data!
-- Make sure to backup any important data before running this script

-- Start transaction
BEGIN;

-- Clear engagement data
DELETE FROM airdrop_claims;
DELETE FROM engagement_points;
DELETE FROM point_balances;

-- Clear prediction data
DELETE FROM predictions;

-- Clear market data
DELETE FROM markets;
DELETE FROM declined_markets;

-- Clear any market metadata (if exists)
DELETE FROM market_metadata WHERE true;

-- Reset sequences if needed
ALTER SEQUENCE IF EXISTS predictions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS engagement_points_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS airdrop_claims_id_seq RESTART WITH 1;

-- Keep user accounts but reset their stats
UPDATE users SET 
    created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE wallet_address IS NOT NULL;

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'Database cleaned for QA testing at %', NOW();
END $$;

COMMIT;

-- Verify cleanup
SELECT 
    'Markets' as table_name, 
    COUNT(*) as record_count 
FROM markets
UNION ALL
SELECT 
    'Predictions' as table_name, 
    COUNT(*) as record_count 
FROM predictions
UNION ALL
SELECT 
    'Engagement Points' as table_name, 
    COUNT(*) as record_count 
FROM engagement_points
UNION ALL
SELECT 
    'Point Balances' as table_name, 
    COUNT(*) as record_count 
FROM point_balances; 