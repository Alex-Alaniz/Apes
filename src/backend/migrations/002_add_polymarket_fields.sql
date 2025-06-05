-- Migration: Add Polymarket integration fields
-- Date: 2025-05-31

-- Add new columns to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS poly_id VARCHAR(100) UNIQUE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS apechain_market_id VARCHAR(100);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type VARCHAR(20) DEFAULT 'binary';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS options_metadata JSONB;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS assets JSONB;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;

-- Create index for poly_id lookups
CREATE INDEX IF NOT EXISTS idx_markets_poly_id ON markets(poly_id);
CREATE INDEX IF NOT EXISTS idx_markets_apechain_id ON markets(apechain_market_id);

-- Create market_metadata table for storing pending markets
CREATE TABLE IF NOT EXISTS market_metadata (
  id SERIAL PRIMARY KEY,
  poly_id VARCHAR(100) UNIQUE NOT NULL,
  apechain_market_id VARCHAR(100),
  question TEXT NOT NULL,
  category VARCHAR(50),
  market_type VARCHAR(20) DEFAULT 'binary',
  end_time TIMESTAMP WITH TIME ZONE,
  options JSONB NOT NULL,
  options_metadata JSONB,
  assets JSONB,
  status VARCHAR(50) DEFAULT 'pending_creation',
  deployed_at TIMESTAMP WITH TIME ZONE,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for market_metadata
CREATE INDEX IF NOT EXISTS idx_market_metadata_status ON market_metadata(status);
CREATE INDEX IF NOT EXISTS idx_market_metadata_poly_id ON market_metadata(poly_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_metadata_updated_at
    BEFORE UPDATE ON market_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE market_metadata IS 'Stores market data from Polymarket pipeline before creation on Solana';
COMMENT ON COLUMN markets.poly_id IS 'Polymarket ID reference';
COMMENT ON COLUMN markets.apechain_market_id IS 'ApeChain market ID reference';
COMMENT ON COLUMN markets.assets IS 'JSON object containing banner and icon URLs';
COMMENT ON COLUMN markets.options_metadata IS 'JSON array with metadata for each option including icons'; 