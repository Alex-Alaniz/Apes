-- Create external market mappings table
CREATE TABLE IF NOT EXISTS external_market_mappings (
    id SERIAL PRIMARY KEY,
    market_address VARCHAR(44) NOT NULL UNIQUE,
    
    -- Polymarket fields
    polymarket_slug VARCHAR(200),
    polymarket_condition_id VARCHAR(100),
    polymarket_market_id VARCHAR(100),
    
    -- Kalshi fields
    kalshi_ticker VARCHAR(50),
    kalshi_market_id VARCHAR(100),
    kalshi_event_ticker VARCHAR(50),
    
    -- Mapping metadata
    mapping_confidence DECIMAL(3,2) DEFAULT 0.0, -- 0-1 confidence score
    auto_mapped BOOLEAN DEFAULT FALSE,
    manual_override BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sync TIMESTAMP
);

-- Create order book cache table
CREATE TABLE IF NOT EXISTS order_book_cache (
    market_address VARCHAR(44) PRIMARY KEY,
    order_book_data JSONB NOT NULL,
    sources VARCHAR(20)[] DEFAULT '{}',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance metrics
    best_bid_price DECIMAL(10,4),
    best_ask_price DECIMAL(10,4),
    spread DECIMAL(10,4),
    total_bid_volume DECIMAL(20,6),
    total_ask_volume DECIMAL(20,6)
);

-- Create historical order book snapshots
CREATE TABLE IF NOT EXISTS order_book_history (
    id SERIAL PRIMARY KEY,
    market_address VARCHAR(44) NOT NULL,
    snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Snapshot data
    best_bid DECIMAL(10,4),
    best_ask DECIMAL(10,4),
    mid_price DECIMAL(10,4),
    spread DECIMAL(10,4),
    bid_volume DECIMAL(20,6),
    ask_volume DECIMAL(20,6),
    
    -- Source info
    sources VARCHAR(20)[],
    
    -- Index for time-series queries
    INDEX idx_ob_history_market_time (market_address, snapshot_time DESC)
);

-- Create market liquidity tracking table
CREATE TABLE IF NOT EXISTS market_liquidity (
    id SERIAL PRIMARY KEY,
    market_address VARCHAR(44) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Liquidity metrics
    total_liquidity_usd DECIMAL(20,2),
    polymarket_liquidity DECIMAL(20,2),
    kalshi_liquidity DECIMAL(20,2),
    apes_liquidity DECIMAL(20,2),
    
    -- Depth metrics
    bid_depth_1pct DECIMAL(20,2), -- Total bids within 1% of best bid
    ask_depth_1pct DECIMAL(20,2), -- Total asks within 1% of best ask
    
    INDEX idx_liquidity_market_time (market_address, timestamp DESC)
);

-- Create arbitrage opportunities table
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    market_address VARCHAR(44) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Opportunity details
    opportunity_type VARCHAR(50), -- 'price_difference', 'liquidity_imbalance'
    source_platform VARCHAR(20),
    target_platform VARCHAR(20),
    
    -- Price data
    source_price DECIMAL(10,4),
    target_price DECIMAL(10,4),
    price_difference DECIMAL(10,4),
    potential_profit_pct DECIMAL(5,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'executed'
    expired_at TIMESTAMP,
    
    INDEX idx_arb_status_time (status, detected_at DESC)
);

-- Create indexes for performance
CREATE INDEX idx_mapping_polymarket ON external_market_mappings(polymarket_slug) WHERE polymarket_slug IS NOT NULL;
CREATE INDEX idx_mapping_kalshi ON external_market_mappings(kalshi_ticker) WHERE kalshi_ticker IS NOT NULL;
CREATE INDEX idx_cache_update ON order_book_cache(last_update);

-- Create update trigger for external_market_mappings
CREATE OR REPLACE FUNCTION update_external_market_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_external_market_mappings_updated_at 
BEFORE UPDATE ON external_market_mappings
FOR EACH ROW EXECUTE FUNCTION update_external_market_mappings_updated_at();

-- Insert some sample mappings for testing
INSERT INTO external_market_mappings (
    market_address,
    polymarket_slug,
    polymarket_condition_id,
    kalshi_ticker,
    mapping_confidence
) VALUES 
    -- Example: Presidential election market
    ('7xKXtg6mBpGvCgdmPPvETV2sGVe8LMJNHhhgH4QfLZe5', 
     'will-donald-trump-win-the-2024-us-presidential-election',
     '0x1234567890abcdef',
     'TRUMP-2024',
     0.95),
     
    -- Example: Bitcoin price market
    ('8yLYug7nBqHvDgEmQQvFUV3tHVf9MLKMKhhgJ5RgMAe6',
     'will-bitcoin-reach-100000-in-2024',
     '0xabcdef1234567890',
     'BTC-100K-2024',
     0.90)
ON CONFLICT (market_address) DO NOTHING;