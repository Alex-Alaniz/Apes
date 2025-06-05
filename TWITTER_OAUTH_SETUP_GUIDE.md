# Twitter OAuth Setup Guide

## Problem
Twitter linking is failing with "Failed to generate auth link" because the backend is missing Twitter OAuth environment variables.

## Required Environment Variables (Missing from Railway)

Add these to your Railway backend environment:

```env
# Twitter OAuth Configuration
TWITTER_CLIENT_ID=your-twitter-client-id-here
TWITTER_CLIENT_SECRET=your-twitter-client-secret-here
TWITTER_CALLBACK_URL=https://apes-lake.vercel.app/auth/twitter/callback
TWITTER_ENCRYPTION_KEY=a-32-byte-hex-encryption-key
PRIMAPE_TWITTER_ID=your-primape-twitter-account-id
```

## Step 1: Create Twitter OAuth Application

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing app
3. In App Settings → User Authentication Settings:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URL**: `https://apes-lake.vercel.app/auth/twitter/callback`
   - **Website URL**: `https://apes-lake.vercel.app`

4. Save and get your:
   - **Client ID** (starts with something like `UmFuZG9tSVY4MGJHc2xC...`)
   - **Client Secret** (starts with something like `VGhpcyBpcyBhIGZha2Ugc2VjcmV0...`)

## Step 2: Generate Encryption Key

```bash
# Generate a random 32-byte hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Get PRIMAPE Twitter ID

1. Go to [Twitter ID Lookup Tool](https://tweeterid.com/)
2. Enter your @PrimapeApp username
3. Copy the numeric ID

## Step 4: Add to Railway

1. Go to Railway dashboard
2. Select your backend service
3. Go to Variables tab
4. Add each environment variable:

```env
TWITTER_CLIENT_ID=your-actual-client-id
TWITTER_CLIENT_SECRET=your-actual-client-secret
TWITTER_CALLBACK_URL=https://apes-lake.vercel.app/auth/twitter/callback
TWITTER_ENCRYPTION_KEY=your-generated-32-byte-hex-key
PRIMAPE_TWITTER_ID=your-actual-twitter-id
```

## Step 5: Redeploy Backend

After adding the environment variables, redeploy your Railway backend service.

## Testing

After setup, test Twitter linking:
1. Go to your profile page
2. Try linking Twitter account
3. Should now generate proper auth URL and work correctly

## Troubleshooting

- **"Invalid client"**: Check CLIENT_ID is correct
- **"Invalid redirect"**: Ensure CALLBACK_URL matches exactly in Twitter app settings
- **"Server error"**: Check all environment variables are set in Railway
- **"Encryption error"**: Regenerate ENCRYPTION_KEY with proper 32-byte hex format 