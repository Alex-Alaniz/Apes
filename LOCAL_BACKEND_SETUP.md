# Local Backend Setup Guide

## Problem
The local backend is failing to connect to the database properly, causing "Failed to create/get user" errors.

## Solution: Create Local Environment File

Create a file `backend/.env` with the following content:

```env
# Use the production Supabase database for local development
DATABASE_URL=postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x

# Alternative: Individual PostgreSQL variables  
POSTGRES_URL=postgres://postgres.xovbmbsnlcmxinlmlimz:uKF5DzUcfwoRlryr@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_HOST=aws-0-us-east-1.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres.xovbmbsnlcmxinlmlimz
POSTGRES_PASSWORD=uKF5DzUcfwoRlryr

# Development settings
NODE_ENV=development
PORT=5001

# CORS
CORS_ORIGIN=http://localhost:3000

# Solana Configuration  
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# APES Token Configuration
APES_PROGRAM_ID=APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS
APES_TOKEN_MINT=9BZJXtmfPpkHnM57gHEx5Pc9oQhLhJtr4mhCsNtttTts
APES_TREASURY=APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z

# Twitter OAuth (add these when setting up Twitter linking)
# TWITTER_CLIENT_ID=your-twitter-client-id
# TWITTER_CLIENT_SECRET=your-twitter-client-secret  
# TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback
# TWITTER_ENCRYPTION_KEY=your-32-byte-hex-encryption-key
# PRIMAPE_TWITTER_ID=your-primape-twitter-account-id
```

## Quick Setup Commands

```bash
# Navigate to backend directory
cd backend

# Create the .env file (copy content above)
touch .env
# Then paste the environment variables above

# Restart the backend server
npm run dev
```

## Expected Results

After creating the .env file, you should see:
```
🚀 Server running on port 5001
📊 Environment: development
💾 Database URL set: true
🔗 Using DATABASE_URL: true
🔗 Using POSTGRES_URL: true
✅ Database connection test successful
```

## Testing

Test the user creation endpoint:
```bash
curl -X POST "http://localhost:5001/api/users/create-or-get" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z"
```

Should return user data instead of `{"error":"Failed to create/get user"}` 