-- SAFE Mobile Approval Column Migration
-- This migration ONLY adds the column and index, no data updates
-- Date: 2025-08-28
-- Purpose: Add mobile_approved column to control which markets appear in iOS app

-- Step 1: Check if column exists before adding (SAFE - no data loss possible)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'markets' 
        AND column_name = 'mobile_approved'
    ) THEN
        ALTER TABLE markets ADD COLUMN mobile_approved BOOLEAN DEFAULT false;
        RAISE NOTICE 'Column mobile_approved added successfully';
    ELSE
        RAISE NOTICE 'Column mobile_approved already exists - skipping';
    END IF;
END $$;

-- Step 2: Create index for performance (SAFE - only adds index)
CREATE INDEX IF NOT EXISTS idx_markets_mobile_approved 
ON markets (mobile_approved) 
WHERE mobile_approved = true;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN markets.mobile_approved IS 'Controls visibility in PRIMAPE iOS app. Set to true to show market in mobile.';

-- Verification query (does not modify data)
SELECT 
    COUNT(*) as total_markets,
    COUNT(CASE WHEN mobile_approved = true THEN 1 END) as mobile_approved_count,
    COUNT(CASE WHEN mobile_approved = false OR mobile_approved IS NULL THEN 1 END) as not_approved_count
FROM markets
WHERE status = 'Active';