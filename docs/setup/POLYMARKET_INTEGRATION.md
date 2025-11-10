# Polymarket Pipeline Integration

## Overview

This integration connects your Solana prediction market platform with the existing Polymarket pipeline that handles market curation, approval workflows, and asset management.

## Architecture

### Data Flow
1. **Polymarket** → **Approval Pipeline** → **ApeChain** → **Your Solana Platform**
2. Markets are curated and approved through Slack
3. Deployed to ApeChain with blockchain IDs
4. Synced to your Solana platform with all metadata and assets

## Key Features

### 1. Hybrid Image Display
Markets can have:
- **Banner images** - Main market image (from Polymarket)
- **Category icons** - Small icons for market categories
- **Option icons** - Individual icons for each betting option

When images are not available, the UI displays:
- Gradient backgrounds based on category
- Icon components from Lucide React
- Consistent, professional appearance

### 2. Automatic Market Sync
- Polls Polymarket pipeline every 10 minutes (configurable)
- Detects new markets automatically
- Stores metadata for pending creation on Solana
- Updates existing markets with latest data

### 3. Asset Management
- Image URLs stored in database
- Fallback handling for failed image loads
- CDN-ready architecture
- Efficient caching strategies

## API Endpoints

### Primary: `https://polymarket.primape.app/api/v1`

#### `/solana/deployed-markets`
Returns all markets ready for Solana deployment with complete metadata.

#### `/markets?status=live`
Returns only active, deployed markets.

#### `/markets/chain/assets`
Returns asset URLs keyed by blockchain market ID.

### Alternative: `https://polymarket-pipeline-primape.replit.app/api/v1`
Backup endpoint with same API structure.

## Database Schema

### New Fields in `markets` table:
```sql
poly_id VARCHAR(100) UNIQUE       -- Polymarket reference ID
apechain_market_id VARCHAR(100)   -- ApeChain market ID
market_type VARCHAR(20)           -- 'binary' or 'multi'
options_metadata JSONB            -- Option labels and icons
assets JSONB                      -- Banner and category icons
is_trending BOOLEAN               -- Trending status flag
```

### New `market_metadata` table:
Stores pending markets from Polymarket before Solana creation.

## Frontend Integration

### MarketCard Component
Enhanced to display:
- Banner images with gradient fallbacks
- Category badges with icons
- Option icons in voting bars
- Trending indicators
- Responsive image loading

### Usage Example:
```jsx
<MarketCard 
  market={{
    question: "Will Bitcoin reach $100k?",
    assets: {
      banner: "https://polymarket-upload.s3...",
      icon: "https://polymarket-upload.s3..."
    },
    options_metadata: [
      { label: "Yes", icon: "https://..." },
      { label: "No", icon: "https://..." }
    ],
    category: "crypto",
    isTrending: true
  }}
/>
```

## Backend Services

### PolymarketSyncService
Located at: `src/backend/services/polymarketSyncService.js`

Key methods:
- `start()` - Begin automatic syncing
- `syncMarkets()` - Manual sync trigger
- `getPendingMarkets()` - Get markets awaiting Solana creation
- `markMarketAsCreated()` - Update after Solana deployment

### API Routes
- `GET /api/markets` - Returns markets with asset data
- `GET /api/markets/sync/pending` - Get pending markets
- `POST /api/markets/sync` - Trigger manual sync
- `POST /api/markets/create-from-poly/:polyId` - Mark as created

## Configuration

### Environment Variables
```bash
# Enable Polymarket sync (default: false)
ENABLE_POLYMARKET_SYNC=true

# Sync interval in minutes (default: 10)
POLYMARKET_SYNC_INTERVAL=10
```

### Testing
Run the integration test:
```bash
node scripts/test-polymarket-integration.js
```

This will:
- Test API connectivity
- Verify data structure
- Check image URLs
- Validate transformation logic

## Implementation Steps

1. **Run Database Migration**
   ```bash
   psql -d your_database -f src/backend/migrations/002_add_polymarket_fields.sql
   ```

2. **Enable Sync Service**
   Add to `.env`:
   ```
   ENABLE_POLYMARKET_SYNC=true
   ```

3. **Restart Backend**
   The sync will start automatically

4. **Monitor Sync**
   Check logs for:
   - "Starting Polymarket sync..."
   - "Found X markets from Polymarket"
   - "Created metadata for market: [question]"

## Market Creation Flow

1. **Automatic Detection**
   - Sync service finds new markets
   - Stores in `market_metadata` table

2. **Manual Creation** (via admin panel)
   - Fetch pending markets
   - Create on Solana blockchain
   - Call `/api/markets/create-from-poly`

3. **Data Updates**
   - Asset URLs updated automatically
   - Trending status synchronized
   - Option metadata maintained

## UI/UX Considerations

### Consistent Look
- Markets without images use category-based gradients
- Icon fallbacks maintain visual hierarchy
- Loading states for images
- Error boundaries for failed assets

### Performance
- Lazy loading for images
- CDN integration ready
- Efficient caching headers
- Progressive enhancement

## Troubleshooting

### Common Issues

1. **No markets syncing**
   - Check `ENABLE_POLYMARKET_SYNC` is true
   - Verify API endpoints are accessible
   - Check database migrations ran

2. **Images not loading**
   - Verify CORS settings
   - Check image URLs are valid
   - Monitor browser console for errors

3. **Sync failures**
   - Check network connectivity
   - Verify API key/permissions
   - Review server logs

### Debug Commands
```bash
# Test API connectivity
curl https://polymarket.primape.app/api/v1/solana/deployed-markets

# Check pending markets
curl http://localhost:5001/api/markets/sync/pending

# Trigger manual sync
curl -X POST http://localhost:5001/api/markets/sync
```

## Future Enhancements

1. **Webhook Support**
   - Real-time updates instead of polling
   - Instant market creation triggers

2. **Image Optimization**
   - Automatic resizing
   - WebP conversion
   - Local caching proxy

3. **Advanced Filtering**
   - Category-based sync
   - Custom approval rules
   - Market templates 