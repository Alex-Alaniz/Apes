-- Create markets table (main table for deployed markets)
CREATE TABLE IF NOT EXISTS markets (
    market_address VARCHAR(44) PRIMARY KEY,
    creator VARCHAR(44) NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    resolution_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active',
    options TEXT[] NOT NULL,
    poly_id VARCHAR(100) UNIQUE,
    apechain_market_id VARCHAR(100),
    assets JSONB,
    options_metadata JSONB,
    option_volumes DECIMAL(20, 6)[],
    total_volume DECIMAL(20, 6) DEFAULT 0,
    resolved_option INTEGER,
    min_bet DECIMAL(20, 6) DEFAULT 10,
    market_type VARCHAR(20) DEFAULT 'binary',
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create declined_markets table
CREATE TABLE IF NOT EXISTS declined_markets (
    poly_id VARCHAR(100) PRIMARY KEY,
    declined_by VARCHAR(100) NOT NULL,
    reason TEXT,
    declined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_creator ON markets(creator);
CREATE INDEX idx_markets_poly_id ON markets(poly_id);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);

-- Add update trigger for markets
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 