-- Migration: Add participant_count column to markets table
-- This handles the missing participant_count column gracefully

-- Add participant_count column if it doesn't exist
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_markets_participant_count ON markets(participant_count);

-- Update existing markets to have 0 participant count initially
UPDATE markets 
SET participant_count = 0 
WHERE participant_count IS NULL; 