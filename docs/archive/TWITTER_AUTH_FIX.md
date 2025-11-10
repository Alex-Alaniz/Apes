# Twitter Authentication Fix Guide

## Problem
The Twitter OAuth callback URL mismatch was preventing successful authentication. The app was redirecting to `/auth/twitter/callback` but the React router was expecting `/twitter-callback`.

## Solution Applied
1. Updated React router to handle the correct path: `/auth/twitter/callback`
2. Updated the default callback URL in the Twitter service to match

## CRITICAL: Missing Backend .env File

**The main issue is that you don't have a `.env` file in `src/backend/`. Without this file, Twitter OAuth cannot work!**

### Create the .env File

1. Navigate to `src/backend/`
2. Create a new file named `.env` (not `.env.example`)
3. Add the following content:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/primape_db

# Server Configuration
PORT=5001
NODE_ENV=development

# Twitter/X OAuth Configuration
TWITTER_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE
TWITTER_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET_HERE
TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback
TWITTER_ENCRYPTION_KEY=7b71f2f607846cd61d65e127f60e62ea6589ce45d17e765b999cf6fc8af4231e
PRIMAPE_TWITTER_ID=YOUR_PRIMAPE_ACCOUNT_ID_HERE

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Get Your Twitter Credentials

1. **Client ID & Secret**:
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Navigate to your app
   - Go to "Keys and tokens" section
   - Copy your OAuth 2.0 Client ID and Client Secret
   - Replace `YOUR_ACTUAL_CLIENT_ID_HERE` and `YOUR_ACTUAL_CLIENT_SECRET_HERE` in the .env file

2. **PRIMAPE Twitter ID**:
   - Go to https://tweeterid.com/
   - Enter `@PrimapeApp` (or the actual PRIMAPE account handle)
   - Copy the numeric ID
   - Replace `YOUR_PRIMAPE_ACCOUNT_ID_HERE` in the .env file

3. **Database URL**:
   - Update with your actual PostgreSQL connection string

## Twitter Developer Portal Setup
1. Go to https://developer.twitter.com/en/portal/dashboard
2. In your app's "User authentication settings", ensure the callback URL is:
   ```
   http://localhost:3000/auth/twitter/callback
   ```
3. Make sure OAuth 2.0 is enabled with the required scopes:
   - tweet.read
   - users.read
   - follows.read
   - like.read
   - offline.access

## Verify the Fix
1. **RESTART YOUR BACKEND SERVER** after creating the .env file
2. Clear your browser's session storage (Developer Tools > Application > Session Storage)
3. Try linking your Twitter account again from the Engage-to-Earn page

## Debugging Tips
- Check browser console for errors
- Check backend server logs for OAuth errors
- Ensure the wallet address is being stored in session storage before OAuth redirect
- Verify the code_verifier is being stored and retrieved correctly
- Make sure the backend server can read the .env file (check server startup logs)

## Common Issues
1. **"Missing verification data"** - Session storage was cleared or not set properly
2. **"Failed to link X account"** - Backend API error, check server logs
3. **"Invalid authorization code"** - Missing .env file or incorrect credentials
4. **404 on callback** - Route mismatch (should be fixed now)

## Production Considerations
For production deployment, you'll need to:
1. Update `TWITTER_CALLBACK_URL` to your production domain
2. Update the callback URL in Twitter Developer Portal to match
3. Use environment variables from your hosting provider instead of .env file
4. Consider using a more secure method for storing the code_verifier (Redis, etc.) 