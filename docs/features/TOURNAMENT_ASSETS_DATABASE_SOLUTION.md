# Tournament Assets Database Solution

## Overview
This solution provides a permanent, database-backed system for managing tournament assets that are shared across the entire application and accessible to all authorized admin team members.

## Features Implemented

### 1. Database Schema
Created a `tournaments` table with JSONB fields for storing:
- **assets**: Default tournament banner and icon
- **team_logos**: Team name to logo URL mapping
- **match_banners**: Match ID to banner URL mapping

### 2. API Endpoints

#### GET `/api/tournaments/:tournamentId/details`
- Fetches tournament details including all assets
- Public endpoint (no auth required)
- Returns tournament metadata and asset configurations

#### PUT `/api/tournaments/:tournamentId/assets`
- Updates tournament assets
- Admin-only endpoint (requires authorized wallet)
- Updates banner, icon, team logos, and match banners

### 3. Admin Tournament Page Updates
- Removed localStorage persistence
- Added API integration for loading/saving assets
- Assets now persist in database and sync across all admin users
- Loading state while fetching assets from API

### 4. Tournament Detail Page Integration
- Fetches tournament assets on page load
- Displays tournament banner dynamically
- Shows team logos in match cards (Overview tab)
- Assets visible in Bracket view
- Real-time updates when admin changes assets

## How It Works

### For Admins
1. Navigate to `/admin/tournament`
2. Click "Asset Manager"
3. Update any of:
   - Default Tournament Banner
   - Tournament Icon
   - Individual Match Banners
   - Team Logos
4. Click "Save Assets" - saves to database
5. Changes visible immediately across platform

### For Users
1. Visit tournament page at `/tournaments/club-world-cup-2025`
2. See custom tournament banner at top
3. View team logos in match listings
4. All assets loaded from database

## Database Migration

Run the migration to create the tournaments table:

```bash
node run-tournament-migration.js
```

This creates:
- `tournaments` table with JSONB asset fields
- Indexes for performance
- Default FIFA Club World Cup 2025 tournament

## Asset Structure in Database

```json
{
  "assets": {
    "banner": "https://...",
    "icon": "https://..."
  },
  "team_logos": {
    "Real Madrid": "https://...",
    "Barcelona": "https://...",
    // ... more teams
  },
  "match_banners": {
    "1": "https://...",  // Match ID to banner URL
    "2": "https://...",
    // ... more matches
  }
}
```

## Benefits Over localStorage

1. **Persistence**: Data persists permanently in database
2. **Team Collaboration**: All admin team members see same assets
3. **Cross-Device**: Assets available on any device/browser
4. **Scalability**: No storage limits like localStorage
5. **Integration**: Assets available to all parts of the app
6. **API Access**: Can be accessed programmatically

## Security

- Asset updates require admin wallet authorization
- Only wallets in `authorizedWallets.js` can modify assets
- Read access is public (for tournament pages)

## Testing

1. **Admin Flow**:
   ```
   - Connect authorized wallet
   - Go to /admin/tournament
   - Open Asset Manager
   - Add team logos and banners
   - Save and refresh - assets persist
   ```

2. **User Flow**:
   ```
   - Visit /tournaments/club-world-cup-2025
   - Check tournament banner loads
   - View Overview tab - see team logos
   - Check Bracket tab - assets visible
   ```

## Future Enhancements

1. **Asset Upload**: Direct file upload instead of URL input
2. **Asset CDN**: Store images on CDN for better performance
3. **Asset Versioning**: Track changes to assets over time
4. **Asset Preview**: Preview assets before saving
5. **Bulk Import**: Import all team logos at once
6. **Tournament Templates**: Save asset configurations as templates 