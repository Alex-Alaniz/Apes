-- Treasury Monitoring Tables
-- Creates tables for tracking treasury balance and risk metrics

-- Treasury snapshots for historical tracking
CREATE TABLE IF NOT EXISTS treasury_snapshots (
    id SERIAL PRIMARY KEY,
    treasury_address VARCHAR(44) NOT NULL,
    token_mint VARCHAR(44) NOT NULL,
    balance BIGINT NOT NULL,
    balance_formatted VARCHAR(50) NOT NULL,
    snapshot_time TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate snapshots per day
    UNIQUE(treasury_address, token_mint, DATE(snapshot_time))
);

-- Risk events and alerts
CREATE TABLE IF NOT EXISTS risk_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'exposure_warning', 'balance_low', 'bet_rejected'
    severity VARCHAR(20) NOT NULL,   -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    treasury_balance BIGINT,
    total_exposure BIGINT,
    exposure_ratio DECIMAL(5,2),
    bet_amount BIGINT,
    potential_payout BIGINT,
    triggered_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Update parlay bets table to include risk assessment
ALTER TABLE parlay_bets 
ADD COLUMN IF NOT EXISTS risk_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS risk_warnings TEXT[],
ADD COLUMN IF NOT EXISTS treasury_balance_at_bet BIGINT,
ADD COLUMN IF NOT EXISTS exposure_ratio_at_bet DECIMAL(5,2);

-- Payout tracking for automated payouts
CREATE TABLE IF NOT EXISTS parlay_payouts (
    id SERIAL PRIMARY KEY,
    bet_id VARCHAR(36) NOT NULL REFERENCES parlay_bets(bet_id),
    user_address VARCHAR(44) NOT NULL,
    payout_amount DECIMAL(20, 6) NOT NULL,
    burn_amount DECIMAL(20, 6) NOT NULL DEFAULT 0,
    transaction_signature VARCHAR(88),
    payout_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin controls for risk management
CREATE TABLE IF NOT EXISTS risk_controls (
    id SERIAL PRIMARY KEY,
    control_name VARCHAR(50) UNIQUE NOT NULL,
    control_value DECIMAL(20, 6) NOT NULL,
    description TEXT,
    updated_by VARCHAR(44),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default risk control values
INSERT INTO risk_controls (control_name, control_value, description) VALUES
('low_treasury_warning', 100000, 'Treasury balance warning threshold (APES)'),
('high_exposure_warning', 0.7, 'High exposure warning ratio (70%)'),
('critical_exposure_limit', 0.9, 'Critical exposure limit ratio (90%)'),
('max_single_bet_ratio', 0.1, 'Maximum single bet as ratio of treasury (10%)'),
('max_daily_volume', 1000000, 'Maximum daily betting volume (APES)'),
('emergency_pause', 0, 'Emergency pause flag (0=false, 1=true)')
ON CONFLICT (control_name) DO NOTHING;

-- System health tracking
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'error'
    last_check TIMESTAMP DEFAULT NOW(),
    error_message TEXT,
    metadata JSONB,
    
    -- Unique constraint for latest status per service
    UNIQUE(service_name)
);

-- Insert initial health records
INSERT INTO system_health (service_name, status) VALUES
('treasury_monitoring', 'healthy'),
('parlay_betting', 'healthy'),
('risk_management', 'healthy'),
('payout_system', 'healthy')
ON CONFLICT (service_name) DO NOTHING;

-- Views for easy querying
CREATE OR REPLACE VIEW treasury_health AS
SELECT 
    ts.treasury_address,
    ts.balance_formatted as current_balance,
    ts.snapshot_time as last_updated,
    (
        SELECT COALESCE(SUM(potential_payout), 0) 
        FROM parlay_bets 
        WHERE status = 'active'
    ) as total_exposure,
    CASE 
        WHEN ts.balance > 0 THEN
            ROUND((
                SELECT COALESCE(SUM(potential_payout * 1000000), 0) 
                FROM parlay_bets 
                WHERE status = 'active'
            ) / ts.balance * 100, 2)
        ELSE 0
    END as exposure_percentage,
    (
        SELECT COUNT(*) 
        FROM parlay_bets 
        WHERE status = 'active'
    ) as active_bets,
    (
        SELECT COUNT(*) 
        FROM risk_events 
        WHERE triggered_at > NOW() - INTERVAL '24 hours'
    ) as recent_risk_events
FROM treasury_snapshots ts
WHERE ts.snapshot_time = (
    SELECT MAX(snapshot_time) 
    FROM treasury_snapshots ts2 
    WHERE ts2.treasury_address = ts.treasury_address
);

-- Function to check if betting should be paused
CREATE OR REPLACE FUNCTION should_pause_betting()
RETURNS BOOLEAN AS $$
DECLARE
    emergency_pause_value DECIMAL;
    current_exposure_ratio DECIMAL;
    critical_limit DECIMAL;
BEGIN
    -- Check emergency pause flag
    SELECT control_value INTO emergency_pause_value
    FROM risk_controls 
    WHERE control_name = 'emergency_pause';
    
    IF emergency_pause_value > 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Check exposure ratio
    SELECT control_value INTO critical_limit
    FROM risk_controls 
    WHERE control_name = 'critical_exposure_limit';
    
    SELECT exposure_percentage / 100 INTO current_exposure_ratio
    FROM treasury_health
    LIMIT 1;
    
    IF current_exposure_ratio >= critical_limit THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log risk events
CREATE OR REPLACE FUNCTION log_risk_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when a bet is rejected due to risk
    IF NEW.risk_approved = FALSE THEN
        INSERT INTO risk_events (
            event_type, 
            severity, 
            description,
            bet_amount,
            potential_payout,
            treasury_balance,
            exposure_ratio
        ) VALUES (
            'bet_rejected',
            'medium',
            'Bet rejected due to risk controls',
            NEW.stake_amount * 1000000,
            NEW.potential_payout * 1000000,
            NEW.treasury_balance_at_bet,
            NEW.exposure_ratio_at_bet
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_risk_events
    AFTER INSERT OR UPDATE ON parlay_bets
    FOR EACH ROW
    EXECUTE FUNCTION log_risk_event();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_events_time ON risk_events (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_type ON risk_events (event_type, severity);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON parlay_payouts (payout_status);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON parlay_payouts (user_address);
CREATE INDEX IF NOT EXISTS idx_payouts_time ON parlay_payouts (created_at DESC);

COMMENT ON TABLE treasury_snapshots IS 'Historical treasury balance tracking';
COMMENT ON TABLE risk_events IS 'Risk management events and alerts';
COMMENT ON TABLE parlay_payouts IS 'Automated payout processing tracking';
COMMENT ON TABLE risk_controls IS 'Configurable risk management parameters';
COMMENT ON TABLE system_health IS 'System service health monitoring';
COMMENT ON VIEW treasury_health IS 'Current treasury and risk status overview';