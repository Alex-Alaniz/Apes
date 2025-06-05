# 𝕏 (Twitter) OAuth 2.0 Setup Guide

## Prerequisites

1. You need a 𝕏 Developer Account
2. You need to create an App in the 𝕏 Developer Portal

## Step 1: Create a 𝕏 App

1. Go to https://developer.x.com/portal
2. Create a new App or use an existing one
3. In your App settings, enable OAuth 2.0

## Step 2: Configure OAuth 2.0 Settings

1. In your App settings, find the "User authentication settings" section
2. Click "Set up" or "Edit"
3. Configure as follows:
   - **App permissions**: Read and write
   - **Type of App**: Web App, Automated App or Bot
   - **App info**:
     - Callback URI: `http://localhost:3000/auth/twitter/callback` (for development)
     - Website URL: Your website URL
     - Terms of service: Optional
     - Privacy policy: Optional

## Step 3: Get Your Credentials

1. In the "Keys and tokens" section, you'll find:
   - **Client ID**: (looks like: `M1M5R3BMVy13QmpScXkzTUt5OE46MTpjaQ`)
   - **Client Secret**: (click "Regenerate" if needed)

## Step 4: Get the PRIMAPE 𝕏 Account ID

1. Go to https://twitter.com/PrimapeApp (or the actual PRIMAPE account)
2. Use a tool like https://tweeterid.com/ to get the numeric ID
3. Or use the 𝕏 API to lookup the user by username

## Step 5: Configure Environment Variables

Add these to your backend `.env` file:

```env
# 𝕏 OAuth Configuration
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback
PRIMAPE_TWITTER_ID=actual_primape_account_id_here
TWITTER_ENCRYPTION_KEY=generate_a_32_byte_random_key

# Database (if not already set)
DATABASE_URL=your_database_connection_string
```

To generate a secure encryption key, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 6: Database Setup

Ensure these tables exist in your PostgreSQL database:

```sql
-- Twitter OAuth tokens table
CREATE TABLE IF NOT EXISTS twitter_oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(44) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Twitter engagements table
CREATE TABLE IF NOT EXISTS twitter_engagements (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(44) NOT NULL,
  tweet_id VARCHAR(50) NOT NULL,
  engagement_type VARCHAR(20) NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  verified_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_address, tweet_id, engagement_type)
);

-- Primape tweets cache
CREATE TABLE IF NOT EXISTS primape_tweets (
  tweet_id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  media_urls JSONB,
  engagement_stats JSONB,
  created_at TIMESTAMP,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Update users table to include Twitter fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS twitter_linked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0;
```

## Step 7: Test the Integration

1. Start your backend server with the environment variables set
2. Try linking your 𝕏 account from the frontend
3. Check the browser console and server logs for any errors

## Common Issues

1. **"Failed to generate auth link"** - Check that your environment variables are set correctly
2. **"Invalid callback URL"** - Ensure the callback URL in your app settings matches exactly
3. **"No Twitter tokens found"** - The OAuth flow didn't complete successfully
4. **CORS errors** - Make sure your backend CORS settings allow your frontend origin

## Production Considerations

1. Use HTTPS for production callback URLs
2. Store the `code_verifier` in Redis or another temporary storage instead of returning it to the client
3. Implement rate limiting on the Twitter endpoints
4. Add monitoring for failed authentication attempts
5. Consider implementing a Twitter webhook for real-time engagement tracking 