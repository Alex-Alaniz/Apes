# Database Architecture - IMPORTANT

## Overview - TWO Separate Databases

This project uses **TWO separate Supabase databases** for different purposes:

### 1. Web App Database (Main Database)
- **Environment Variable**: `SUPABASE_URL` in `backend/.env`
- **Purpose**: Main application database shared by web app and backend
- **Contains**:
  ```
  - users (web app users)
  - predictions
  - markets
  - leaderboard (web app leaderboard)
  - referrals (SHARED referral system)
  - referral_stats (SHARED referral system)
  - referral_transactions
  - tournaments
  - and all other web app tables
  ```
- **Used By**:
  - Backend API (`backend/config/supabase.js`)
  - Web Frontend (for direct queries if needed)
  - iOS App (ONLY for referral endpoints via backend API)

### 2. iOS App Database (Separate Instance)
- **Environment Variable**: Set in iOS app config (not in this repo)
- **Purpose**: iOS-specific app data
- **Contains**:
  ```
  - iOS user sessions
  - iOS app analytics
  - iOS-specific leaderboard
  - iOS activity tracking
  - NOT referral data
  ```
- **Used By**:
  - iOS App only (for app-specific features)

## Critical Points

### ✅ Correct Usage:

1. **Referral System** - Uses Web App Database ONLY
   ```javascript
   // iOS app calling referral API (goes to web app database)
   POST https://apes-production.up.railway.app/api/referrals/process
   ```

2. **iOS App Activity** - Uses iOS Database
   ```swift
   // iOS tracking user activity (goes to iOS database)
   supabaseClient.from('ios_user_activity').insert(...)
   ```

### ❌ Avoid These Mistakes:

1. **Don't store referral data in iOS database**
   - All referral data must go through the backend API
   - This ensures cross-platform referral tracking works

2. **Don't confuse environment variables**
   - `SUPABASE_URL` in backend = Web App Database
   - iOS Supabase config = iOS Database

3. **Don't mix leaderboards**
   - Web app leaderboard → Web App Database
   - iOS app leaderboard → iOS Database
   - These are separate systems

## API Endpoints and Database Mapping

| Endpoint | Database | Notes |
|----------|----------|-------|
| `/api/referrals/*` | Web App DB | Shared referral system |
| `/api/users` | Web App DB | Web app users |
| `/api/predictions` | Web App DB | Web app predictions |
| `/api/leaderboard` | Web App DB | Web app leaderboard |
| `/api/markets` | Web App DB | Prediction markets |
| iOS Direct Supabase | iOS DB | iOS-specific data only |

## Environment Setup

### Backend (.env)
```env
# Web App Database (Main)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# This database contains:
# - All web app data
# - Referral system (shared)
# - Markets, predictions, etc.
```

### iOS App
```swift
// Separate iOS Database
let supabaseURL = "https://yyyyy.supabase.co" // Different URL!
let supabaseKey = "yyyyy"

// This database contains:
// - iOS user activity
// - iOS leaderboard
// - iOS analytics
// - NOT referrals
```

## Referral System Flow

```
User clicks referral link (web or iOS)
    ↓
Stored locally (localStorage or AsyncStorage)
    ↓
User connects wallet
    ↓
Call Backend API: POST /api/referrals/process
    ↓
Backend writes to Web App Database (Supabase)
    ↓
Referral tracked across both platforms
```

## Verification Checklist

- [ ] Backend uses `SUPABASE_URL` from backend/.env
- [ ] iOS referral code uses backend API, not direct Supabase
- [ ] iOS app analytics use iOS database
- [ ] Web app never accesses iOS database
- [ ] Referral data only exists in web app database

## Common Issues and Solutions

### Issue: Referrals not showing up cross-platform
**Solution**: Ensure iOS is calling backend API `/api/referrals/*` endpoints, not writing directly to iOS database

### Issue: Leaderboard data mixed up
**Solution**: Web and iOS leaderboards are separate. Don't try to combine them.

### Issue: User data inconsistent
**Solution**: Web users and iOS users are in different databases. Use wallet address as the common identifier.

Remember: The referral system is the ONLY shared data between platforms, and it lives in the Web App Database accessed through the backend API.