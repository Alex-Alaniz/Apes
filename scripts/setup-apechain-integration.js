#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log(`
🔧 ApeChain to Solana Integration Setup
======================================

This script helps you set up the environment for fetching markets from 
Polymarket's database and verifying their status on ApeChain before 
creating them on Solana.

📋 Requirements:
----------------
1. PostgreSQL database access to Polymarket
2. ApeChain RPC endpoint
3. ApeChain market contract address
4. Solana wallet with APES tokens
5. Node.js dependencies installed

📊 Expected Database Schema:
---------------------------

-- Main markets table
CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  poly_id VARCHAR(255) UNIQUE NOT NULL,
  apechain_market_id VARCHAR(255),
  question TEXT NOT NULL,
  category VARCHAR(100),
  options JSONB NOT NULL, -- Array of option strings
  status VARCHAR(50) DEFAULT 'active',
  banner_url TEXT,
  icon_url TEXT,
  solana_address VARCHAR(44), -- Added when deployed to Solana
  solana_tx_hash VARCHAR(88),
  solana_created_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Option metadata table
CREATE TABLE market_option_metadata (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  option_index INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_markets_apechain_id ON markets(apechain_market_id);
CREATE INDEX idx_markets_poly_id ON markets(poly_id);
CREATE INDEX idx_markets_solana_address ON markets(solana_address);
CREATE INDEX idx_markets_status ON markets(status);

🌐 Environment Variables:
------------------------
Add these to your .env file:

# Polymarket Database
POLYMARKET_DB_URL=postgresql://username:password@host:port/database

# ApeChain Configuration
APECHAIN_RPC_URL=https://rpc.apechain.com/rpc
APECHAIN_MARKET_CONTRACT=0x... # Replace with actual contract

# Solana Configuration (already in your .env)
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
VITE_PROGRAM_ID=YOUR_PROGRAM_ID
VITE_APES_TOKEN_MINT=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe
SOLANA_WALLET_PATH=/path/to/wallet/keypair.json

📝 Usage Examples:
-----------------

1. Test connection and fetch 5 markets:
   node scripts/create-markets-from-apechain.js --limit 5

2. Production run with PostgreSQL:
   node scripts/apechain-db-integration.js --limit 10 --batch 5

3. Dry run to check markets without creating:
   node scripts/apechain-db-integration.js --dry-run --limit 20

🔍 Sample SQL Queries:
---------------------

-- Find unprocessed markets with ApeChain IDs
SELECT 
  m.poly_id,
  m.apechain_market_id,
  m.question,
  m.category,
  m.options,
  COUNT(mom.id) as option_count
FROM markets m
LEFT JOIN market_option_metadata mom ON m.id = mom.market_id
WHERE m.apechain_market_id IS NOT NULL
  AND m.solana_address IS NULL
  AND m.status = 'active'
GROUP BY m.id
ORDER BY m.created_at DESC
LIMIT 10;

-- Check processing status
SELECT 
  COUNT(*) FILTER (WHERE solana_address IS NOT NULL) as deployed_to_solana,
  COUNT(*) FILTER (WHERE apechain_market_id IS NOT NULL) as has_apechain_id,
  COUNT(*) FILTER (WHERE apechain_market_id IS NOT NULL AND solana_address IS NULL) as ready_to_deploy,
  COUNT(*) as total_markets
FROM markets
WHERE status = 'active';

🚀 Quick Start:
--------------
`);

// Check if .env exists
const envPath = path.join(process.cwd(), 'src/frontend/.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found at src/frontend/.env');
  console.log('   Create one based on the template above.');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingVars = [];
  
  const requiredVars = [
    'POLYMARKET_DB_URL',
    'APECHAIN_RPC_URL', 
    'APECHAIN_MARKET_CONTRACT',
    'VITE_SOLANA_RPC_URL',
    'VITE_PROGRAM_ID',
    'VITE_APES_TOKEN_MINT'
  ];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log('\n   Add these to your .env file.');
  } else {
    console.log('\n✅ All required environment variables are present!');
  }
}

// Create example .env.apechain template
const templatePath = path.join(process.cwd(), '.env.apechain.example');
const template = `# ApeChain Integration Configuration

# Polymarket PostgreSQL Database
# Format: postgresql://username:password@host:port/database
POLYMARKET_DB_URL=postgresql://readonly:password@polymarket-db.example.com:5432/polymarket

# ApeChain RPC and Contract
APECHAIN_RPC_URL=https://rpc.apechain.com/rpc
APECHAIN_MARKET_CONTRACT=0x1234567890123456789012345678901234567890

# Optional: Specific wallet for market creation
# SOLANA_WALLET_PATH=/home/user/.config/solana/market-creator.json
`;

fs.writeFileSync(templatePath, template);
console.log(`\n📄 Created example template at: ${templatePath}`);

console.log(`
📚 Next Steps:
-------------
1. Get Polymarket database credentials
2. Get ApeChain market contract address
3. Update your .env file with the values
4. Run: npm install pg ethers
5. Test with: node scripts/create-markets-from-apechain.js --help

Need help? Check the README or run scripts with --help flag.
`); 