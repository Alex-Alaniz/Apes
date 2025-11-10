# Twitter API Setup Guide for PRIMAPE Engage-to-Earn

## Overview
This guide walks you through setting up Twitter API access for the PRIMAPE Engage-to-Earn V2 system.

## Prerequisites
1. Twitter Developer Account
2. Twitter App with OAuth 2.0 enabled
3. @PrimapeApp Twitter account

## Step 1: Create Twitter Developer Account
1. Go to https://developer.twitter.com
2. Apply for a developer account
3. Complete the application process

## Step 2: Create a Twitter App
1. Navigate to the Twitter Developer Portal
2. Click "Create Project"
3. Give your project a name (e.g., "PRIMAPE Points System")
4. Create an App within the project
5. Configure OAuth 2.0 settings:
   - Type of App: Web App
   - Callback URI: `http://localhost:3000/auth/twitter/callback` (for development)
   - Website URL: Your app URL

## Step 3: Configure Permissions
Required OAuth 2.0 scopes:
- `tweet.read` - Read tweets
- `users.read` - Read user profile info
- `follows.read` - Check following status
- `like.read` - Check liked tweets
- `offline.access` - Refresh tokens

## Step 4: Get API Credentials
From your app settings, obtain:
- Client ID
- Client Secret
- Bearer Token (for app-only requests)

## Step 5: Find @PrimapeApp Twitter ID
Use Twitter API or online tools to find the numeric ID for @PrimapeApp

## Step 6: Configure Environment Variables
Add to your `.env` file:
```bash
# Twitter API Configuration
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback
TWITTER_ENCRYPTION_KEY=generate_32_byte_random_string_here
PRIMAPE_TWITTER_ID=actual_numeric_id_of_primape_app
```

### Generate Encryption Key
```bash
# Generate a secure 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 7: Database Setup
Run the Twitter integration migration:
```bash
cd src/backend
node -e "
const fs = require('fs');
const db = require('./config/database');
const migration = fs.readFileSync('./migrations/006_twitter_integration.sql', 'utf8');
db.query(migration)
  .then(() => console.log('Twitter migration completed'))
  .catch(console.error)
  .finally(() => process.exit());
"
```

## Step 8: Production Considerations

### Security
1. **Token Encryption**: All OAuth tokens are encrypted in the database
2. **Rate Limiting**: Implement proper rate limiting to avoid API limits
3. **Error Handling**: Graceful fallbacks for API failures

### Twitter API Rate Limits
- User auth: 75 requests per 15-minute window per user
- App auth: 300 requests per 15-minute window
- Implement caching and request queuing

### Webhook Setup (Optional)
For real-time engagement tracking:
1. Set up Account Activity API
2. Configure webhook endpoint
3. Subscribe to user events

## Step 9: Testing

### Test Twitter OAuth Flow
```javascript
// In browser console
window.location.href = '/engage-to-earn';
// Click "Link Twitter Account"
// Complete OAuth flow
// Verify account linked successfully
```

### Test Engagement Validation
```javascript
// Test API endpoints
fetch('/api/twitter/primape-posts')
  .then(r => r.json())
  .then(console.log);

// After engaging with a tweet
fetch('/api/twitter/validate-engagement', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': 'your_wallet_address'
  },
  body: JSON.stringify({
    tweet_id: 'tweet_id_here',
    engagement_type: 'like'
  })
});
```

## Troubleshooting

### Common Issues

1. **"No Twitter tokens found"**
   - User hasn't linked Twitter account
   - Tokens expired and refresh failed

2. **"Failed to verify engagement"**
   - API rate limit reached
   - User hasn't actually engaged with tweet
   - Engagement too recent (wait 5-10 seconds)

3. **OAuth callback fails**
   - Check callback URL matches exactly
   - Ensure CORS is configured properly
   - Verify client ID/secret

### Debug Mode
Enable debug logging:
```javascript
// In twitterService.js
console.log('Twitter API Response:', response);
```

## API Usage Examples

### Fetch @PrimapeApp Latest Tweets
```bash
curl http://localhost:5001/api/twitter/primape-posts?limit=5
```

### Verify User Follows @PrimapeApp
```bash
curl http://localhost:5001/api/twitter/verify-follow \
  -H "x-wallet-address: YOUR_WALLET_ADDRESS"
```

### Get User's Twitter Engagement Summary
```bash
curl http://localhost:5001/api/twitter/engagement-summary \
  -H "x-wallet-address: YOUR_WALLET_ADDRESS"
```

## Monitoring

### Track Engagement Metrics
```sql
-- Daily Twitter engagement
SELECT 
  DATE(verified_at) as date,
  engagement_type,
  COUNT(*) as count,
  SUM(points_awarded) as total_points
FROM twitter_engagements
GROUP BY DATE(verified_at), engagement_type
ORDER BY date DESC;

-- Top Twitter engagers
SELECT 
  u.twitter_username,
  COUNT(te.id) as engagements,
  SUM(te.points_awarded) as total_points
FROM twitter_engagements te
JOIN users u ON te.user_address = u.wallet_address
GROUP BY u.twitter_username
ORDER BY total_points DESC
LIMIT 10;
```

## Next Steps
1. Set up monitoring dashboards
2. Implement Twitter Spaces integration
3. Add influencer tier system
4. Create automated engagement campaigns 