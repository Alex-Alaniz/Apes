# Environment Variables Quick Reference

## File Locations
```
├── backend/
│   └── .env              ← Backend environment variables
├── src/
│   └── frontend/
│       └── .env          ← Frontend environment variables
```

## Backend (.env location: `/backend/.env`)
```env
DATABASE_URL=your-database-url
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SOLANA_RPC_URL=https://api.devnet.solana.com
PORT=5001
```

## Frontend (.env location: `/src/frontend/.env`)
```env
VITE_BELIEVE_API_KEY=your-believe-api-key
VITE_BELIEVE_API_URL=https://public.believe.app/v1    # Optional, this is the default
VITE_API_URL=http://localhost:5001    # ← MUST BE 5001, NOT 3000!
```

## Port Reference
| Service | Port | URL |
|---------|------|-----|
| Frontend (UI) | 3000 | http://localhost:3000 |
| Backend (API) | 5001 | http://localhost:5001 |

## Common Mistakes to Avoid
1. ❌ Setting `VITE_API_URL=http://localhost:3000` (wrong - that's the frontend)
2. ❌ Creating .env files in the wrong directory
3. ❌ Forgetting the `VITE_` prefix for frontend variables
4. ❌ Not restarting the dev server after changing .env files

## Testing Your Setup
```bash
# Check if backend is running
curl http://localhost:5001/health

# Check if frontend can reach backend
# Open browser console and run:
fetch('http://localhost:5001/health').then(r => r.json()).then(console.log)
``` 