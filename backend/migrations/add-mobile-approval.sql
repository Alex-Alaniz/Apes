-- Add mobile approval column to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS mobile_approved BOOLEAN DEFAULT false;

-- Update some existing active markets to be mobile approved for testing
UPDATE markets 
SET mobile_approved = true 
WHERE status = 'Active' 
  AND options IS NOT NULL 
  AND array_length(options, 1) = 2
  AND question NOT LIKE '%test%'
LIMIT 5;

-- Create index for mobile approved markets
CREATE INDEX IF NOT EXISTS idx_markets_mobile_approved 
ON markets (mobile_approved, status) 
WHERE mobile_approved = true AND status = 'Active';