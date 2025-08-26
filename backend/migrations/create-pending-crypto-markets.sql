-- Create pending_crypto_markets table for approval workflow
CREATE TABLE IF NOT EXISTS pending_crypto_markets (
    id SERIAL PRIMARY KEY,
    crypto_symbol VARCHAR(10) NOT NULL,
    crypto_name VARCHAR(50) NOT NULL,
    current_price DECIMAL(20, 8) NOT NULL,
    change_24h DECIMAL(10, 4),
    volume_24h DECIMAL(25, 2),
    opportunity_score INTEGER DEFAULT 0,
    price_ranges JSONB,
    market_question TEXT NOT NULL,
    market_description TEXT,
    reasons JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, deployed
    created_by VARCHAR(50) DEFAULT 'oracle_system',
    reviewed_by VARCHAR(100),
    review_notes TEXT,
    deployed_market_address VARCHAR(44),
    deployed_transaction_signature VARCHAR(88),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    deployed_at TIMESTAMP,
    
    -- Prevent duplicate opportunities for same crypto on same day
    UNIQUE(crypto_symbol, DATE(created_at))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_crypto_markets_status ON pending_crypto_markets(status);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_markets_created_at ON pending_crypto_markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_markets_crypto_symbol ON pending_crypto_markets(crypto_symbol);

-- Add update trigger
CREATE OR REPLACE FUNCTION update_pending_crypto_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pending_crypto_markets_updated_at 
    BEFORE UPDATE ON pending_crypto_markets 
    FOR EACH ROW EXECUTE FUNCTION update_pending_crypto_markets_updated_at();

-- Add comments
COMMENT ON TABLE pending_crypto_markets IS 'Queue for crypto market opportunities awaiting admin approval';
COMMENT ON COLUMN pending_crypto_markets.opportunity_score IS 'Oracle-calculated score (0-8) based on volatility, volume, and market conditions';
COMMENT ON COLUMN pending_crypto_markets.status IS 'pending, approved, rejected, or deployed';
COMMENT ON COLUMN pending_crypto_markets.price_ranges IS 'JSON array of predicted price ranges and probabilities';