-- PRIMAPE Complete Database Cleanup for Fresh E2E Testing
-- ⚠️  COMPLETE CLEAN: This clears ALL data including Polymarket markets
-- 🎯 Goal: Fresh slate for full end-to-end testing

-- Start transaction for safety
BEGIN;

-- 🧹 Clear platform engagement data
DELETE FROM airdrop_claims WHERE id IS NOT NULL;
DELETE FROM engagement_points WHERE id IS NOT NULL;
DELETE FROM point_balances WHERE user_address IS NOT NULL;
DELETE FROM twitter_engagements WHERE id IS NOT NULL;

-- 🧹 Clear platform prediction data
DELETE FROM predictions WHERE id IS NOT NULL;
DELETE FROM prediction_history WHERE id IS NOT NULL;

-- 🧹 Clear platform user data (handle foreign keys properly)
-- Delete dependent tables first (references users table)
DELETE FROM user_stats WHERE wallet_address IS NOT NULL;
DELETE FROM wallet_twitter_links WHERE wallet_address IS NOT NULL;

-- Now delete users
DELETE FROM users WHERE wallet_address IS NOT NULL;

-- 🧹 Clear platform market cache (our Solana market data)
DELETE FROM markets_cache WHERE market_pubkey IS NOT NULL;

-- 🧹 Clear ALL POLYMARKET DATA for complete fresh testing
DELETE FROM market_comments WHERE id IS NOT NULL;
DELETE FROM market_metadata WHERE id IS NOT NULL;
DELETE FROM declined_markets WHERE id IS NOT NULL;
DELETE FROM markets WHERE id IS NOT NULL;

-- 📊 Reset sequences
DO $$
BEGIN
    -- Reset sequences if they exist
    PERFORM setval(pg_get_serial_sequence('predictions', 'id'), 1, false) WHERE pg_get_serial_sequence('predictions', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('engagement_points', 'id'), 1, false) WHERE pg_get_serial_sequence('engagement_points', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('airdrop_claims', 'id'), 1, false) WHERE pg_get_serial_sequence('airdrop_claims', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('users', 'id'), 1, false) WHERE pg_get_serial_sequence('users', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('wallet_twitter_links', 'id'), 1, false) WHERE pg_get_serial_sequence('wallet_twitter_links', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('markets', 'id'), 1, false) WHERE pg_get_serial_sequence('markets', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('market_metadata', 'id'), 1, false) WHERE pg_get_serial_sequence('market_metadata', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('market_comments', 'id'), 1, false) WHERE pg_get_serial_sequence('market_comments', 'id') IS NOT NULL;
    PERFORM setval(pg_get_serial_sequence('declined_markets', 'id'), 1, false) WHERE pg_get_serial_sequence('declined_markets', 'id') IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Ignore sequence reset errors if sequences don't exist
    NULL;
END $$;

-- ✅ Verify complete cleanup (should show 0 for ALL tables)
SELECT 
    'Platform Users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'Platform User Stats' as table_name, 
    COUNT(*) as record_count 
FROM user_stats
UNION ALL
SELECT 
    'Twitter Links' as table_name, 
    COUNT(*) as record_count 
FROM wallet_twitter_links
UNION ALL
SELECT 
    'Platform Predictions' as table_name, 
    COUNT(*) as record_count 
FROM predictions
UNION ALL
SELECT 
    'Platform Engagement' as table_name, 
    COUNT(*) as record_count 
FROM engagement_points
UNION ALL
SELECT 
    'Platform Cache' as table_name, 
    COUNT(*) as record_count 
FROM markets_cache
UNION ALL
SELECT 
    '🧹 Polymarket Markets (CLEARED)' as table_name, 
    COUNT(*) as record_count 
FROM markets
UNION ALL
SELECT 
    '🧹 Market Metadata (CLEARED)' as table_name, 
    COUNT(*) as record_count 
FROM market_metadata
UNION ALL
SELECT 
    '🧹 Market Comments (CLEARED)' as table_name, 
    COUNT(*) as record_count 
FROM market_comments
UNION ALL
SELECT 
    '🧹 Declined Markets (CLEARED)' as table_name, 
    COUNT(*) as record_count 
FROM declined_markets;

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE '✅ Complete database cleaned for fresh E2E testing at %', NOW();
    RAISE NOTICE '🧹 ALL data cleared - platform AND Polymarket data';
    RAISE NOTICE '🎯 Ready for fresh market deployment and full testing flow';
    RAISE NOTICE '🔄 Can now test: market creation, predictions, claims, Polymarket integration';
END $$;

COMMIT; 