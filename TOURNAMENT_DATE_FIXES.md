# Tournament Date Display Fixes

## Issue Summary
Tournament markets were showing incorrect dates and bad date filtering on the markets page (https://apes.primape.app/markets). Dates needed to match the same display and filtering as the tournament detail page's Matches tab.

## Root Cause
- Backend stores all dates in UTC (as `resolution_date`)
- Frontend was displaying UTC times without converting to the tournament's timezone (ET/EDT)
- Date grouping and filtering wasn't accounting for timezone differences

## Fixes Applied

### 1. MarketCard Component (src/frontend/src/components/MarketCard.jsx)
Updated the date display logic to convert UTC to EDT for tournament markets:
```javascript
// For tournament markets, display in ET timezone
if (market.tournament_id) {
  // Convert UTC to EDT (UTC-4) for June 2025
  const etDate = new Date(date.getTime() - (4 * 60 * 60 * 1000));
  return format(etDate, 'MMM d, h:mm a') + ' EDT';
}
```

### 2. MarketsPage Date Sorting (src/frontend/src/pages/MarketsPage.jsx)
Fixed date sorting to check all possible date field names:
```javascript
const dateA = a.resolution_date || a.resolutionDate || a.endTime || '';
const dateB = b.resolution_date || b.resolutionDate || b.endTime || '';
```

### 3. MarketsPage Date Grouping (src/frontend/src/pages/MarketsPage.jsx)
Updated date grouping for tournament markets to convert UTC to EDT:
```javascript
// For tournament markets, group by ET date
if (market.tournament_id) {
  // Convert UTC to EDT (UTC-4) for June 2025
  const etDate = new Date(dateObj.getTime() - (4 * 60 * 60 * 1000));
  dateKey = format(etDate, 'yyyy-MM-dd');
}
```

### 4. Added Timezone Indicator
Added EDT indicator for tournament date groups to clarify the timezone:
```javascript
{dateMarkets.some(m => m.tournament_id) && (
  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
    EDT
  </span>
)}
```

## Result
- Tournament markets now display dates in EDT (UTC-4) matching the tournament's timezone
- Date filtering and grouping properly converts UTC to EDT for tournament markets
- Clear timezone indicators help users understand the displayed times
- Consistent date display between markets page and tournament detail page

## Backend Note
The backend continues to store dates in UTC as intended. Only the frontend display layer converts to the appropriate timezone for better user experience. 