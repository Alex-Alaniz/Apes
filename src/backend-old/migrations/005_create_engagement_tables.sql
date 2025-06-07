-- Create engagement points tracking table
CREATE TABLE IF NOT EXISTS engagement_points (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    activity_type VARCHAR(50) NOT NULL,
    points_earned INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create point balances table
CREATE TABLE IF NOT EXISTS point_balances (
    user_address VARCHAR(44) PRIMARY KEY REFERENCES users(wallet_address),
    total_points INTEGER DEFAULT 0,
    claimed_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    last_claim_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create airdrop claims table
CREATE TABLE IF NOT EXISTS airdrop_claims (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(44) REFERENCES users(wallet_address),
    points_redeemed INTEGER NOT NULL,
    apes_amount DECIMAL(20, 6) NOT NULL,
    transaction_signature VARCHAR(88),
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Create indexes for performance
CREATE INDEX idx_engagement_user ON engagement_points(user_address);
CREATE INDEX idx_engagement_type ON engagement_points(activity_type);
CREATE INDEX idx_engagement_date ON engagement_points(created_at);

-- Create trigger to update point_balances when engagement_points are added
CREATE OR REPLACE FUNCTION update_point_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO point_balances (user_address, total_points, available_points)
    VALUES (NEW.user_address, NEW.points_earned, NEW.points_earned)
    ON CONFLICT (user_address) DO UPDATE
    SET 
        total_points = point_balances.total_points + NEW.points_earned,
        available_points = point_balances.available_points + NEW.points_earned,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_engagement
AFTER INSERT ON engagement_points
FOR EACH ROW
EXECUTE FUNCTION update_point_balance(); 