# Deployment Trigger

This file exists to trigger fresh deployments when needed.

## Latest Changes
- Fixed WebSocket errors by switching to HTTP-only connections
- Implemented immediate Believe API burn triggering  
- Switched from Helius to Alchemy RPC for better rate limits
- Added comprehensive error handling and debugging

## Environment Variables Required
- `VITE_BELIEVE_API_KEY`: Believe API key for token burns

Last updated: 2025-06-07 18:05:00 