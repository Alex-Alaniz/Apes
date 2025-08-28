-- Fix missing database columns that are causing 503 errors

-- Add missing 'role' column to users table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        UPDATE users SET role = 'admin' WHERE wallet_address IN (
            'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z',
            '5eC9qH2vZQki2FKLmJR2WCsDw8MxzomyJDyfzoNHM2kE'
        );
    END IF;
END $$;

-- Add missing 'status' column to tables if needed
DO $$ 
BEGIN
    -- Check if markets table has status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'markets' AND column_name = 'status') THEN
        ALTER TABLE markets ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
    END IF;

    -- Check if predictions table exists and has status column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'predictions' AND column_name = 'status') THEN
            ALTER TABLE predictions ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        END IF;
    END IF;
END $$;

-- Create treasury_snapshots table if it doesn't exist
CREATE TABLE IF NOT EXISTS treasury_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    total_balance DECIMAL(20, 9) DEFAULT 0,
    total_exposure DECIMAL(20, 9) DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on treasury snapshots
CREATE INDEX IF NOT EXISTS idx_treasury_snapshots_date 
ON treasury_snapshots (snapshot_date DESC);

-- Insert a default snapshot if table is empty
INSERT INTO treasury_snapshots (snapshot_date, total_balance, total_exposure, risk_level)
SELECT CURRENT_DATE, 1222092565.71, 0, 'LOW'
WHERE NOT EXISTS (SELECT 1 FROM treasury_snapshots WHERE snapshot_date = CURRENT_DATE);