-- Add support for multiple market sources and enhanced metadata

-- Add source tracking columns to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS mobile_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS mobile_priority INTEGER DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS time_category VARCHAR(20); -- 'hourly', 'daily', 'weekly', 'monthly', 'other'
ALTER TABLE markets ADD COLUMN IF NOT EXISTS sport_type VARCHAR(50); -- 'nfl', 'nba', 'soccer', etc.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS event_date TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'approved', 'deploying', 'deployed', 'rejected'
ALTER TABLE markets ADD COLUMN IF NOT EXISTS deployment_tx VARCHAR(88);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS deployment_error TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0; -- 0-1 score for market quality

-- Create market_sources table for tracking scraping sources
CREATE TABLE IF NOT EXISTS market_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'api', 'scraper', 'onchain'
    base_url TEXT,
    api_key TEXT, -- encrypted
    is_active BOOLEAN DEFAULT TRUE,
    scrape_interval_minutes INTEGER DEFAULT 30,
    last_scraped_at TIMESTAMP,
    total_markets_scraped INTEGER DEFAULT 0,
    total_markets_approved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scraped_markets table for staging/approval
CREATE TABLE IF NOT EXISTS scraped_markets (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    sport_type VARCHAR(50),
    options JSONB NOT NULL,
    options_metadata JSONB,
    assets JSONB,
    event_date TIMESTAMP,
    end_time TIMESTAMP,
    time_category VARCHAR(20),
    source_url TEXT,
    source_data JSONB, -- Raw data from source
    quality_score DECIMAL(3,2),
    approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'duplicate'
    approved_by VARCHAR(44),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    market_address VARCHAR(44), -- Set when deployed
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Create market_approvals table for tracking approval history
CREATE TABLE IF NOT EXISTS market_approvals (
    id SERIAL PRIMARY KEY,
    scraped_market_id INTEGER REFERENCES scraped_markets(id),
    approved_by VARCHAR(44) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'deploy'
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_markets_source ON markets(source);
CREATE INDEX idx_markets_mobile_approved ON markets(mobile_approved);
CREATE INDEX idx_markets_time_category ON markets(time_category);
CREATE INDEX idx_markets_deployment_status ON markets(deployment_status);
CREATE INDEX idx_scraped_markets_approval_status ON scraped_markets(approval_status);
CREATE INDEX idx_scraped_markets_source ON scraped_markets(source, source_id);
CREATE INDEX idx_scraped_markets_event_date ON scraped_markets(event_date);

-- Insert default market sources
INSERT INTO market_sources (name, type, base_url) VALUES 
    ('polymarket', 'api', 'https://polymarket.com/api'),
    ('kalshi', 'api', 'https://api.kalshi.com/v1'),
    ('fanduel', 'scraper', 'https://sportsbook.fanduel.com'),
    ('manifold', 'api', 'https://manifold.markets/api/v0'),
    ('predictit', 'scraper', 'https://www.predictit.org')
ON CONFLICT (name) DO NOTHING;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_market_sources_updated_at BEFORE UPDATE ON market_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();