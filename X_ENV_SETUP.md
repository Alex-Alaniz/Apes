# 𝕏 OAuth Environment Variables Setup

Add these lines to your backend `.env` file (`src/backend/.env`):

```env
# Twitter/X API Configuration
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here
TWITTER_CALLBACK_URL=http://localhost:3001/twitter-callback
TWITTER_ENCRYPTION_KEY=b940f17769cba373f08c301211b59fb73f4babd727540904f303504b982728f6
```

## How to get your Twitter/X API credentials:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new App or use an existing one
3. Go to "User authentication settings"
4. Configure OAuth 2.0:
   - Enable OAuth 2.0
   - Type of App: Web App
   - Callback URI: `http://localhost:3001/twitter-callback`
   - Website URL: `http://localhost:3001`
5. Save and copy your Client ID and Client Secret

## Important Notes:

- Replace `your_twitter_client_id_here` with your actual Client ID
- Replace `your_twitter_client_secret_here` with your actual Client Secret
- The callback URL must match exactly what you set in Twitter Developer Portal
- After adding these variables, restart your backend server 