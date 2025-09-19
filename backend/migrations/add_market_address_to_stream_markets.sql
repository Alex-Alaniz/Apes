-- Add on-chain market address and transaction signature to stream_markets table
ALTER TABLE stream_markets 
ADD COLUMN IF NOT EXISTS market_address VARCHAR(44),
ADD COLUMN IF NOT EXISTS tx_signature VARCHAR(88);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stream_markets_market_address 
ON stream_markets(market_address) 
WHERE market_address IS NOT NULL;