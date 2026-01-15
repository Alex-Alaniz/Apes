# Polymarket Database Integration Summary

## Overview

We've successfully integrated with the Polymarket Pipeline database to fetch markets directly and deploy them to Solana. This replaces the need for API access and provides direct database queries.

## Database Details

**Connection Information:**
- Host: `ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Connection String: `postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require`

**Database Schema:**
- **markets** table: Contains market data with fields:
  - `poly_id`: Polymarket ID
  - `market_id`: ApeChain market ID (numeric)
  - `question`, `category`, `banner`, `icon`
  - `end_time`, `status`, `market_type`
  - `deployed_at`: When deployed to ApeChain

- **market_options** table: Options for each market
  - `market_poly_id`: Links to markets.poly_id
  - `label`: Option text
  - `icon`: Option icon URL

## Scripts Created

### 1. `scripts/test-polymarket-db.js`
- Database exploration tool
- Shows table structure and sample data

### 2. `scripts/query-polymarket-markets.js`
- Analyzes market data
- Shows active markets and deployment status

### 3. `scripts/polymarket-to-solana-integration.js`
- **Production script** for deploying markets
- Fetches from Polymarket DB → Checks ApeChain → Deploys to Solana
- Features:
  - Batch processing
  - Duplicate detection
  - ApeChain verification (optional)
  - Full image/metadata preservation

## Usage

### Basic deployment (5 markets):
```bash
node scripts/polymarket-to-solana-integration.js
```

### Deploy specific number:
```bash
node scripts/polymarket-to-solana-integration.js --limit 10
```

### Skip ApeChain verification (testing):
```bash
node scripts/polymarket-to-solana-integration.js --limit 3 --skip-apechain
```

### View help:
```bash
node scripts/polymarket-to-solana-integration.js --help
```

## Process Flow

1. **Query Polymarket DB**
   - Filters: `status='live'`, `market_id IS NOT NULL`, `end_time > NOW()`
   - Joins with market_options table for full data

2. **Check Existing Deployment**
   - Queries our backend API by poly_id
   - Skips if already on Solana

3. **Verify ApeChain Status** (optional)
   - Calls `getMarketInfo(marketId)` on ApeChain
   - Skips if market is resolved
   - Can be disabled with `--skip-apechain`

4. **Deploy to Solana**
   - Creates market with Anchor
   - Uses end_time from database
   - Limits to 4 options (Solana contract limitation)

5. **Save to Backend**
   - POST to `/api/markets/cache`
   - Stores in both markets_cache and markets tables
   - Preserves all metadata and images

## Backend API Endpoints Added

- `GET /api/markets/by-poly-id/:polyId` - Check if market exists
- `POST /api/markets/cache` - Save deployed market data
- `GET /api/markets/cache` - List all cached markets

## Market Data Example

From the database, we found active markets like:
- "Trump divorce in 2025?" (ApeChain ID: 50)
- "NBA Western Conference Champion" (ApeChain ID: 1)
- "Bird flu vaccine in 2025?" (ApeChain ID: 49)

Each market includes:
- Full question text
- Category (sports, politics, crypto, etc.)
- Banner and icon images
- Multiple options with their own icons
- End time for resolution

## Environment Configuration

Add to your `.env` file:
```bash
# Already added (embedded in scripts for now)
POLYMARKET_DB_URL=postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require

# Still needed
APECHAIN_RPC_URL=https://rpc.apechain.com/rpc
APECHAIN_MARKET_CONTRACT=0x... # Get actual contract address
```

## Next Steps

1. **Get ApeChain Contract Address**
   - Required for on-chain verification
   - Without it, use `--skip-apechain` flag

2. **Run Initial Migration**
   - Start with small batch: `--limit 3`
   - Monitor for any issues
   - Scale up gradually

3. **Set Up Automation**
   - Create cron job to run periodically
   - Check for new markets every hour/day
   - Log results for monitoring

4. **Monitor Performance**
   - Track success/failure rates
   - Monitor gas costs on Solana
   - Check image loading performance

## Benefits

- **Direct DB Access**: No API rate limits
- **Rich Data**: Full access to images and metadata
- **Efficient**: Batch processing with duplicate detection
- **Flexible**: Can skip ApeChain check for testing
- **Automated**: Can be scheduled with cron 