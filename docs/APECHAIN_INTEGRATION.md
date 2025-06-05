# ApeChain to Solana Market Integration

## Overview

This document describes the backend strategy for creating markets on Solana by fetching data directly from Polymarket's database and verifying market status on ApeChain before deployment.

## Architecture

```
Polymarket DB → ApeChain Verification → Solana Deployment → Local Backend
     ↓                    ↓                      ↓                ↓
  Market Data      Status Check           Create Market    Cache Metadata
```

## Process Flow

### 1. Database Fetch
- Connect directly to Polymarket's PostgreSQL database
- Query markets with `apechain_market_id` that aren't yet on Solana
- Retrieve market question, options, category, and image metadata

### 2. ApeChain Verification
- Use ApeChain market ID to check on-chain status
- Call `getMarketInfo(marketId)` on the ApeChain contract
- Returns: `question`, `endTime`, `resolved`, `winningOptionIndex`

### 3. Market Filtering
- **Skip** markets where `resolved = true` (already settled)
- **Process** markets where `resolved = false` (still active)

### 4. Solana Deployment
- Create market with data from DB and endTime from ApeChain
- Map banner and option images from database
- Store transaction hash and Solana address

## Database Schema

### Markets Table
```sql
CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  poly_id VARCHAR(255) UNIQUE NOT NULL,
  apechain_market_id VARCHAR(255),
  question TEXT NOT NULL,
  category VARCHAR(100),
  options JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  banner_url TEXT,
  icon_url TEXT,
  solana_address VARCHAR(44),
  solana_tx_hash VARCHAR(88),
  solana_created_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Option Metadata Table
```sql
CREATE TABLE market_option_metadata (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  option_index INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

### Environment Variables
```bash
# Polymarket Database
POLYMARKET_DB_URL=postgresql://username:password@host:port/database

# ApeChain
APECHAIN_RPC_URL=https://rpc.apechain.com/rpc
APECHAIN_MARKET_CONTRACT=0x... # Market contract address

# Solana (existing)
VITE_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_PROGRAM_ID=YOUR_PROGRAM_ID
VITE_APES_TOKEN_MINT=APESxbwPNyJW62vSY83zENJwoL2gXJ8HbpXfkBGfnghe
```

## Scripts

### 1. `create-markets-from-apechain.js`
- Demo script with simulated data
- Shows the integration flow
- Good for testing without DB access

### 2. `apechain-db-integration.js`
- Production script with real PostgreSQL connection
- Batch processing with retries
- Updates Polymarket DB with Solana addresses

### 3. `setup-apechain-integration.js`
- Setup helper that checks environment
- Shows expected database schema
- Creates example configuration

## Usage Examples

### Test Run (Simulated Data)
```bash
node scripts/create-markets-from-apechain.js --limit 5
```

### Production Run
```bash
node scripts/apechain-db-integration.js --limit 10 --batch 5
```

### Dry Run (Check Only)
```bash
node scripts/apechain-db-integration.js --dry-run --limit 20
```

## Data Flow Example

1. **Database Query**:
```json
{
  "apechain_market_id": "1",
  "poly_id": "event-16174",
  "question": "Will Bitcoin reach $100k by end of 2025?",
  "category": "crypto",
  "options": ["Yes", "No"],
  "assets": {
    "banner": "https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-100k-banner.jpg",
    "icon": "https://polymarket-upload.s3.us-east-2.amazonaws.com/bitcoin-icon.png"
  },
  "options_metadata": [
    { "label": "Yes", "icon": "https://polymarket-upload.s3.us-east-2.amazonaws.com/yes-icon.png" },
    { "label": "No", "icon": "https://polymarket-upload.s3.us-east-2.amazonaws.com/no-icon.png" }
  ]
}
```

2. **ApeChain Response**:
```json
{
  "question": "Will Bitcoin reach $100k by end of 2025?",
  "endTime": 1767225600,
  "resolved": false,
  "winningOptionIndex": 0
}
```

3. **Solana Creation**:
- Market created with endTime from ApeChain
- Images mapped from database
- Transaction recorded

## Benefits

1. **Direct DB Access**: No API rate limits or availability issues
2. **On-chain Verification**: Ensures markets aren't already resolved
3. **Image Preservation**: Maps all visual assets from Polymarket
4. **Automated Process**: Can be scheduled to run periodically
5. **Audit Trail**: Updates source DB with Solana addresses

## Error Handling

- **DB Connection Failures**: Retry with exponential backoff
- **ApeChain RPC Errors**: Multiple retry attempts
- **Solana Transaction Failures**: Log and skip to next market
- **Missing Data**: Skip markets with incomplete information

## Monitoring

Track these metrics:
- Markets processed per run
- Success/skip/fail rates
- ApeChain RPC response times
- Solana transaction costs
- Database query performance

## Future Enhancements

1. **Webhook Integration**: Real-time updates when new markets appear
2. **Resolution Sync**: Monitor ApeChain for market resolutions
3. **Image Caching**: Store images on IPFS or Arweave
4. **Multi-chain Support**: Extend to other prediction market chains
5. **Automated Scheduling**: Cron job for periodic market sync 