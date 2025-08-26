-- Add transaction_signature column to markets table for tracking on-chain creation
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS transaction_signature VARCHAR(88);

-- Add index for transaction signature lookups
CREATE INDEX IF NOT EXISTS idx_markets_transaction_signature 
ON markets(transaction_signature);

-- Add comment explaining the column
COMMENT ON COLUMN markets.transaction_signature IS 'Solana transaction signature for on-chain market creation';