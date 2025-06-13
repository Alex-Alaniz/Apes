-- Add tournament features to the markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS tournament_id VARCHAR(255);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50);

-- Create index for tournament queries
CREATE INDEX IF NOT EXISTS idx_markets_tournament_id ON markets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_markets_question_tournament ON markets(question, tournament_id);

-- Create authorized market creators table
CREATE TABLE IF NOT EXISTS authorized_market_creators (
  wallet_address VARCHAR(44) PRIMARY KEY,
  added_by VARCHAR(44) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"can_create_markets": true, "can_create_tournament_markets": true}'
);

-- Create market deployment log for audit trail
CREATE TABLE IF NOT EXISTS market_deployment_log (
  id SERIAL PRIMARY KEY,
  market_address VARCHAR(44) NOT NULL,
  deployed_by_wallet VARCHAR(44) NOT NULL,
  deployed_with_key VARCHAR(44) NOT NULL,
  transaction_signature VARCHAR(88),
  tournament_id VARCHAR(255),
  deployment_type VARCHAR(50) DEFAULT 'manual',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for deployment log queries
CREATE INDEX IF NOT EXISTS idx_deployment_log_wallet ON market_deployment_log(deployed_by_wallet);
CREATE INDEX IF NOT EXISTS idx_deployment_log_tournament ON market_deployment_log(tournament_id);

-- Add initial authorized wallets (replace with actual wallet addresses)
-- INSERT INTO authorized_market_creators (wallet_address, added_by) VALUES
--   ('WALLET_ADDRESS_1', 'ADMIN_WALLET'),
--   ('WALLET_ADDRESS_2', 'ADMIN_WALLET'),
--   ('WALLET_ADDRESS_3', 'ADMIN_WALLET'); 