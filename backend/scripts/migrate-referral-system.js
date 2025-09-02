const db = require('../config/database');
const { checkReferralTables } = require('./check-referral-tables');

async function runMigration() {
  console.log('🚀 Starting referral system migration...\n');

  try {
    // First check existing state
    const { missingTables } = await checkReferralTables();
    
    console.log('\n📦 Running migrations...\n');

    // Create referrals table
    if (missingTables.includes('referrals')) {
      console.log('Creating referrals table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS referrals (
          id SERIAL PRIMARY KEY,
          referrer_wallet VARCHAR(44) NOT NULL,
          referred_wallet VARCHAR(44) NOT NULL UNIQUE,
          referral_code VARCHAR(44) NOT NULL,
          source_platform VARCHAR(20) DEFAULT 'web',
          is_active BOOLEAN DEFAULT true,
          referred_at TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_referred_wallet UNIQUE (referred_wallet)
        );
      `);
      console.log('✅ referrals table created');
    }

    // Create referral_stats table
    if (missingTables.includes('referral_stats')) {
      console.log('Creating referral_stats table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_stats (
          id SERIAL PRIMARY KEY,
          referrer_wallet VARCHAR(44) NOT NULL UNIQUE,
          total_referrals INTEGER DEFAULT 0,
          active_referrals INTEGER DEFAULT 0,
          total_volume_generated DECIMAL(20, 9) DEFAULT 0,
          total_rewards_earned DECIMAL(20, 9) DEFAULT 0,
          pending_rewards DECIMAL(20, 9) DEFAULT 0,
          last_claim_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          last_updated TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ referral_stats table created');
    }

    // Create referral_transactions table
    if (missingTables.includes('referral_transactions')) {
      console.log('Creating referral_transactions table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_transactions (
          id SERIAL PRIMARY KEY,
          referrer_wallet VARCHAR(44) NOT NULL,
          referred_wallet VARCHAR(44) NOT NULL,
          prediction_id INTEGER,
          market_address VARCHAR(88),
          transaction_type VARCHAR(20) NOT NULL, -- 'prediction', 'claim'
          amount DECIMAL(20, 9) NOT NULL,
          fee_amount DECIMAL(20, 9),
          referral_fee DECIMAL(20, 9),
          transaction_signature VARCHAR(88),
          status VARCHAR(20) DEFAULT 'pending',
          processed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ referral_transactions table created');
    }

    // Add columns to users table if missing
    console.log('\nChecking users table columns...');
    
    // Check and add referral_code (now using wallet address)
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'referral_code') THEN
          ALTER TABLE users ADD COLUMN referral_code VARCHAR(44);
          -- Set referral_code to wallet_address for existing users
          UPDATE users SET referral_code = wallet_address WHERE referral_code IS NULL;
        END IF;
      END $$;
    `);
    console.log('✅ referral_code column checked');

    // Check and add referred_by
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'referred_by') THEN
          ALTER TABLE users ADD COLUMN referred_by VARCHAR(44);
        END IF;
      END $$;
    `);
    console.log('✅ referred_by column checked');

    // Check and add referral_source
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'referral_source') THEN
          ALTER TABLE users ADD COLUMN referral_source VARCHAR(20);
        END IF;
      END $$;
    `);
    console.log('✅ referral_source column checked');

    // Create indexes
    console.log('\nCreating indexes...');

    // Indexes for referrals table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet 
      ON referrals(referrer_wallet);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referred_wallet 
      ON referrals(referred_wallet);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referral_code 
      ON referrals(referral_code);
    `);

    // Indexes for referral_stats table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_stats_referrer_wallet 
      ON referral_stats(referrer_wallet);
    `);

    // Indexes for referral_transactions table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer 
      ON referral_transactions(referrer_wallet);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_transactions_referred 
      ON referral_transactions(referred_wallet);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_transactions_status 
      ON referral_transactions(status);
    `);

    // Indexes for users table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_referral_code 
      ON users(referral_code);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_referred_by 
      ON users(referred_by);
    `);

    console.log('✅ All indexes created');

    // Create triggers for updated_at
    console.log('\nCreating triggers...');

    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await db.query(`
      CREATE TRIGGER update_referrals_updated_at 
      BEFORE UPDATE ON referrals 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await db.query(`
      CREATE TRIGGER update_referral_stats_updated_at 
      BEFORE UPDATE ON referral_stats 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers created');

    // Add foreign key constraints
    console.log('\nAdding foreign key constraints...');

    // Check if foreign keys already exist before adding
    const fkCheckQuery = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_name = 'referral_transactions';
    `;
    
    const fkResult = await db.query(fkCheckQuery);
    const existingFKs = fkResult.rows.map(r => r.constraint_name);

    if (!existingFKs.includes('fk_referral_transactions_prediction')) {
      await db.query(`
        ALTER TABLE referral_transactions 
        ADD CONSTRAINT fk_referral_transactions_prediction 
        FOREIGN KEY (prediction_id) 
        REFERENCES predictions(id) 
        ON DELETE SET NULL;
      `);
      console.log('✅ Foreign key to predictions added');
    }

    console.log('\n🎉 Migration completed successfully!');

    // Final check
    console.log('\n📊 Final database state:');
    await checkReferralTables();

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✅ All migrations completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };