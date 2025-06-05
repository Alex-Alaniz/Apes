-- Add updated_at column to markets table if it doesn't exist
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP; 