-- Add mobile_approved column to markets table for admin control
-- This allows admins to control which markets appear in the mobile app

-- Add the column if it doesn't exist
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS mobile_approved BOOLEAN DEFAULT false;

-- Create an index for better performance on mobile queries  
CREATE INDEX IF NOT EXISTS idx_markets_mobile_approved 
ON markets (mobile_approved) 
WHERE mobile_approved = true;

-- Create a combined index for the mobile API query
CREATE INDEX IF NOT EXISTS idx_markets_mobile_query 
ON markets (status, mobile_approved, created_at) 
WHERE status = 'Active' AND mobile_approved = true;

-- Update existing active binary markets to be approved for mobile by default
-- (This is a one-time setup - future markets will need explicit approval)
UPDATE markets 
SET mobile_approved = true 
WHERE status = 'Active' 
  AND options IS NOT NULL 
  AND array_length(options, 1) = 2
  AND mobile_approved IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN markets.mobile_approved IS 'Controls whether this market appears in the mobile app. Must be explicitly approved by admin.';