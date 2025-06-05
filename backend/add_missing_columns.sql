-- Add missing columns to markets table
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS min_bet DECIMAL(20, 6) DEFAULT 10;

ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS market_type VARCHAR(20) DEFAULT 'binary';

ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE; 