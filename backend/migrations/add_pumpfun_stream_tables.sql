-- PumpFun Livestream Tables Migration

-- Stream tracking table
CREATE TABLE IF NOT EXISTS pumpfun_streams (
  id SERIAL PRIMARY KEY,
  token_address VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  symbol VARCHAR(20),
  creator_wallet VARCHAR(255),
  stream_url VARCHAR(500),
  viewer_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  featured_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stream markets (5-minute prediction windows)
CREATE TABLE IF NOT EXISTS stream_markets (
  id SERIAL PRIMARY KEY,
  stream_token VARCHAR(255) NOT NULL,
  question VARCHAR(500) NOT NULL,
  options JSONB NOT NULL DEFAULT '["YES", "NO"]',
  duration_minutes INTEGER DEFAULT 5,
  creator_wallet VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, expired, resolved
  winning_option INTEGER,
  total_volume DECIMAL(20, 9) DEFAULT 0,
  option_volumes JSONB DEFAULT '{"0": 0, "1": 0}',
  platform_fee_bps INTEGER DEFAULT 200, -- 2%
  creator_fee_bps INTEGER DEFAULT 50,   -- 0.5%
  streamer_fee_bps INTEGER DEFAULT 50,  -- 0.5%
  total_platform_fee DECIMAL(20, 9) DEFAULT 0,
  total_creator_fee DECIMAL(20, 9) DEFAULT 0,
  total_streamer_fee DECIMAL(20, 9) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stream bets
CREATE TABLE IF NOT EXISTS stream_bets (
  id SERIAL PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES stream_markets(id),
  user_wallet VARCHAR(255) NOT NULL,
  option INTEGER NOT NULL,
  amount DECIMAL(20, 9) NOT NULL,
  tx_signature VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_stream_bets_market (market_id),
  INDEX idx_stream_bets_user (user_wallet)
);

-- Stream payouts
CREATE TABLE IF NOT EXISTS stream_payouts (
  id SERIAL PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES stream_markets(id),
  user_wallet VARCHAR(255) NOT NULL,
  bet_amount DECIMAL(20, 9) NOT NULL,
  payout_amount DECIMAL(20, 9) NOT NULL,
  tx_signature VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_stream_payouts_user (user_wallet)
);

-- Stream statistics
CREATE TABLE IF NOT EXISTS stream_stats (
  id SERIAL PRIMARY KEY,
  stream_token VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_markets INTEGER DEFAULT 0,
  total_volume DECIMAL(20, 9) DEFAULT 0,
  unique_bettors INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stream_token, date)
);

-- Note: Indexes will be created after tables

-- Insert some test streams for development
INSERT INTO pumpfun_streams (token_address, title, symbol, is_featured, featured_order)
VALUES 
  ('7Pnqg1S6MYrL6AP1ZXcToTHfdBbTB77ze6Y33qBBpump', 'Test Stream 1', 'TEST1', true, 1),
  ('J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump', 'Test Stream 2', 'TEST2', true, 2)
ON CONFLICT (token_address) DO NOTHING;