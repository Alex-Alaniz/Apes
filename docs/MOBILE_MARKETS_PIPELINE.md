# Mobile Markets Pipeline Documentation

## Overview

The Mobile Markets Pipeline is a comprehensive system for aggregating, approving, and deploying prediction markets from multiple sources (Polymarket, Kalshi, FanDuel, etc.) to power the APES mobile app with high-quality, high-frequency markets.

## Architecture

### 1. Market Scrapers

#### Polymarket Scraper (`polymarketScraper.js`)
- Fetches markets via API (onchain + offchain data)
- Quality scoring based on volume, liquidity, engagement
- Supports all market types (binary, categorical)
- Real-time price data

#### Kalshi Scraper (`kalshiScraper.js`)
- Integrates with Kalshi's regulated markets
- Focus on sports, politics, and finance
- Binary markets with bid/ask spreads
- Event-based categorization

#### FanDuel Scraper (`fanduelScraper.js`)
- Web scraping for sportsbook odds
- Converts betting lines to binary markets
- Supports NFL, NBA, MLB, NHL, Soccer
- Moneyline, spread, and total markets

### 2. Scraper Orchestrator

The orchestrator (`scraperOrchestrator.js`) manages all scrapers:
- Scheduled scraping intervals
- Quality assessment
- Deduplication
- Database cleanup
- Performance monitoring

### 3. Database Schema

```sql
-- Market sources configuration
market_sources (
  name, type, base_url, api_key, 
  is_active, scrape_interval_minutes,
  last_scraped_at, total_markets_scraped
)

-- Scraped markets staging
scraped_markets (
  source, source_id, question, description,
  category, sport_type, options, assets,
  event_date, end_time, time_category,
  quality_score, approval_status
)

-- Approval tracking
market_approvals (
  scraped_market_id, approved_by, 
  action, reason, created_at
)
```

### 4. Admin Interface

#### Market Approval Page (`AdminMarketApprovalPage.jsx`)
- View pending markets from all sources
- Filter by source, category, sport, timeframe
- Quality score visualization
- Bulk approval/rejection
- Auto-approval settings
- Real-time scraper statistics

#### Features:
- **Pending Markets View**: See all scraped markets awaiting approval
- **High Quality View**: Pre-filtered high-scoring markets
- **Statistics Dashboard**: Scraper performance metrics
- **One-Click Actions**: Approve, reject, or deploy markets

### 5. Deployment Service

The deployment service (`marketDeploymentService.js`) handles:
- Automated market creation on Solana
- Batch deployments
- Gas optimization
- Error recovery
- Status tracking

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
./scripts/install-scraper-deps.sh
```

### 2. Run Database Migrations

```bash
cd backend
psql $DATABASE_URL < migrations/add_market_sources.sql
```

### 3. Configure Environment Variables

Add to `backend/.env`:
```env
# Admin Configuration
ADMIN_WALLETS=wallet1,wallet2,wallet3

# Scraper API Keys (optional)
KALSHI_API_KEY=your-key
KALSHI_API_SECRET=your-secret
POLYGON_RPC_URL=https://polygon-rpc.com

# Deployment Configuration
DEPLOYER_PRIVATE_KEY=base64-encoded-key
```

### 4. Update Server Routes

The server.js file has been updated to:
- Include mobile markets routes
- Start scraper orchestrator on startup
- Add authentication middleware

## Usage

### Manual Scraping

1. Navigate to Admin > Market Pipeline
2. Click "Run Scraper" for any source
3. View results in real-time

### Bulk Approval

1. Filter markets by criteria
2. Select markets using checkboxes
3. Click "Approve Selected" or "Approve & Deploy"

### Auto-Approval

1. Enable auto-approval in High Quality view
2. Set minimum quality score (0.8 recommended)
3. Set maximum markets per run
4. Click "Run Auto-Approval"

### Monitoring

Check scraper health at:
- `/api/mobile/scrapers/stats` - Performance metrics
- `/api/mobile/sources` - Source configuration
- Admin dashboard statistics view

## Quality Scoring

Markets are scored 0-1 based on:

### Polymarket
- Volume (30%): Higher volume = better
- Liquidity (20%): Market depth
- Time relevance (20%): Closer events score higher
- Engagement (20%): Traders and comments
- Binary options (10%): Yes/No markets preferred

### Kalshi
- Volume (30%): Trading volume
- Open interest (20%): Active positions
- Spread (20%): Tighter bid/ask = better
- Time relevance (20%): Event proximity
- Active status (10%): Market state

### FanDuel
- Sport popularity (20%): NFL/NBA score highest
- Market type (20%): Moneyline/spread preferred
- Odds balance (20%): Even odds = better
- Time to event (20%): Near-term events
- Featured status (10%): Promoted markets

## Time Categories

Markets are automatically categorized:
- **Hourly**: Events within 1 hour
- **Daily**: Events within 24 hours
- **Weekly**: Events within 7 days
- **Monthly**: Events within 30 days
- **Other**: Long-term events

## API Endpoints

### Scraper Management
- `GET /api/mobile/scrapers/stats` - Get scraper statistics
- `POST /api/mobile/scrapers/run/:source` - Manually run a scraper
- `GET /api/mobile/sources` - Get source configurations
- `PATCH /api/mobile/sources/:name` - Update source settings

### Market Approval
- `GET /api/mobile/scraped/pending` - Get pending markets
- `GET /api/mobile/scraped/high-quality` - Get high-quality markets
- `POST /api/mobile/scraped/approve-bulk` - Bulk approve markets
- `POST /api/mobile/scraped/reject-bulk` - Bulk reject markets
- `POST /api/mobile/scraped/auto-approve` - Auto-approve high quality

### Deployment
- `GET /api/mobile/deployment/ready` - Get approved markets ready for deployment
- `POST /api/mobile/deployment/mark-deployed` - Mark markets as deployed

## Best Practices

1. **Review Quality Scores**: Markets with scores >0.7 are generally good
2. **Check Event Dates**: Ensure events haven't already occurred
3. **Verify Questions**: Ensure clarity and no duplicates
4. **Monitor Sources**: Disable sources with high error rates
5. **Regular Cleanup**: Old pending markets are auto-cleaned after 24h

## Troubleshooting

### Scrapers Not Running
1. Check if orchestrator started: Look for "Market scraper orchestrator started" in logs
2. Verify source is active: `GET /api/mobile/sources`
3. Check scraper logs: `GET /api/mobile/scrapers/stats`

### Low Quality Markets
1. Adjust source scraping parameters
2. Increase minimum quality threshold
3. Focus on specific categories/sports

### Deployment Failures
1. Check deployer wallet balance
2. Verify Solana RPC connection
3. Review deployment logs in database

## Future Enhancements

1. **Additional Sources**:
   - Manifold Markets
   - PredictIt
   - Metaculus
   - Custom RSS feeds

2. **ML-Based Quality Scoring**:
   - Learn from approval patterns
   - Predict user engagement
   - Optimize for mobile users

3. **Automated Deployment**:
   - Smart contract batching
   - Gas price optimization
   - Cross-chain deployment

4. **Slack Integration**:
   - Real-time notifications
   - Approval via Slack commands
   - Daily summary reports