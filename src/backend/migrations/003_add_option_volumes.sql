-- Migration: Add option_volumes column for tracking individual option pools
-- Date: 2025-06-01

-- Add option_volumes column if it doesn't exist
ALTER TABLE markets ADD COLUMN IF NOT EXISTS option_volumes NUMERIC[] DEFAULT ARRAY[0, 0, 0, 0];

-- Add total_volume column if it doesn't exist
ALTER TABLE markets ADD COLUMN IF NOT EXISTS total_volume NUMERIC DEFAULT 0;

-- Add updated_at column if it doesn't exist
ALTER TABLE markets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to update updated_at timestamp on markets table
DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;

CREATE TRIGGER update_markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_total_volume ON markets(total_volume);
CREATE INDEX IF NOT EXISTS idx_markets_updated_at ON markets(updated_at);

-- Add comments for documentation
COMMENT ON COLUMN markets.option_volumes IS 'Array of token amounts in each option pool';
COMMENT ON COLUMN markets.total_volume IS 'Total tokens across all option pools'; 