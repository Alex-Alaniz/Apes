-- Create predictions table for tracking user predictions
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) NOT NULL,
    market_address VARCHAR(44) NOT NULL,
    option_index INTEGER NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_signature VARCHAR(88),
    
    -- For tracking claims
    claimed BOOLEAN DEFAULT FALSE,
    claim_timestamp TIMESTAMP,
    payout DECIMAL(20, 6) DEFAULT 0,
    
    -- Indexes for performance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_address) REFERENCES users(wallet_address),
    CONSTRAINT fk_market FOREIGN KEY (market_address) REFERENCES markets(market_address)
);

-- Create indexes for performance
CREATE INDEX idx_predictions_user ON predictions(user_address);
CREATE INDEX idx_predictions_market ON predictions(market_address);
CREATE INDEX idx_predictions_claimed ON predictions(claimed);
CREATE INDEX idx_predictions_timestamp ON predictions(timestamp); 