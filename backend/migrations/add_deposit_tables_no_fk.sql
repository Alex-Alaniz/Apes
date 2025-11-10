-- Migration: Add deposit tracking tables (No Foreign Keys)
-- This version doesn't require the users table to exist

-- Deposit addresses for each user/chain
CREATE TABLE IF NOT EXISTS deposit_addresses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Using wallet address as user_id
  chain_id INTEGER NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chain_id)
);

-- Track all deposits
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  deposit_address VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  token VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for deposits table
CREATE INDEX IF NOT EXISTS idx_user_deposits ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposit_address ON deposits(deposit_address);

-- User balances per chain
CREATE TABLE IF NOT EXISTS user_balances (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL,
  balance DECIMAL(20, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, chain_id, token)
);

-- Bridge transactions
CREATE TABLE IF NOT EXISTS bridge_transactions (
  id SERIAL PRIMARY KEY,
  deposit_id INTEGER REFERENCES deposits(id),
  user_id VARCHAR(255) NOT NULL,
  source_chain INTEGER NOT NULL,
  destination_chain INTEGER NOT NULL,
  source_token VARCHAR(255) NOT NULL,
  destination_token VARCHAR(255) NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  protocol VARCHAR(50) NOT NULL, -- cctp, lifi, wormhole
  source_tx_hash VARCHAR(255),
  destination_tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  fees_usd DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Supported chains configuration
CREATE TABLE IF NOT EXISTS supported_chains (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  rpc_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default supported chains
INSERT INTO supported_chains (chain_id, name, rpc_url) VALUES
  (1, 'Ethereum', 'https://eth.llamarpc.com'),
  (137, 'Polygon', 'https://polygon-rpc.com'),
  (42161, 'Arbitrum', 'https://arb1.arbitrum.io/rpc')
ON CONFLICT (chain_id) DO NOTHING;