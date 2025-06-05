# Database Setup Guide for Prediction Market Platform

## Prerequisites

1. **PostgreSQL** (version 12 or higher)
2. **Node.js** (version 16 or higher)
3. **npm** or **yarn**

## Step 1: Install PostgreSQL

### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Step 2: Create Database and User

1. Access PostgreSQL as superuser:
```bash
psql -U postgres
```

2. Create database and user:
```sql
-- Create database
CREATE DATABASE prediction_market;

-- Create user (replace 'your_password' with a secure password)
CREATE USER prediction_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE prediction_market TO prediction_user;

-- Exit psql
\q
```

## Step 3: Set Up Environment Variables

1. Copy the example environment file:
```bash
cd backend
cp env.example .env
```

2. Edit `.env` and update the database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prediction_market
DB_USER=prediction_user
DB_PASSWORD=your_password

PORT=5000
NODE_ENV=development

SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib
```

## Step 4: Create Database Schema

1. Connect to the database:
```bash
psql -U prediction_user -d prediction_market -h localhost
```

2. Run the schema file:
```bash
# From the backend directory
psql -U prediction_user -d prediction_market -h localhost -f database/schema.sql
```

Or if you're already in psql:
```sql
\i database/schema.sql
```

## Step 5: Add System Status Table (Optional)

If you want to track sync status, add this table:

```sql
CREATE TABLE IF NOT EXISTS system_status (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Step 6: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 7: Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Step 8: Update Frontend Environment

Create `.env` file in the frontend directory:

```bash
cd ../src/frontend
echo "VITE_API_URL=http://localhost:5000" > .env
```

## Step 9: Test the Setup

1. Check server health:
```bash
curl http://localhost:5000/health
```

2. Test database connection by visiting:
- http://localhost:5000/api/leaderboard
- http://localhost:5000/api/markets

## Database Management Commands

### Backup Database
```bash
pg_dump -U prediction_user -h localhost prediction_market > backup.sql
```

### Restore Database
```bash
psql -U prediction_user -h localhost prediction_market < backup.sql
```

### Reset Database
```bash
# Drop all tables (BE CAREFUL!)
psql -U prediction_user -d prediction_market -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run schema
psql -U prediction_user -d prediction_market -h localhost -f database/schema.sql
```

## Troubleshooting

### Connection Refused Error
- Make sure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check if PostgreSQL is listening on the correct port: `sudo lsof -i :5432`

### Authentication Failed
- Verify username and password in `.env` file
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Permission Denied
- Make sure the user has proper permissions: 
  ```sql
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prediction_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prediction_user;
  ```

## Production Considerations

1. **Use SSL connections** for database in production
2. **Set up connection pooling** (already configured in `db.js`)
3. **Regular backups** - Set up automated daily backups
4. **Monitor performance** - Use `pg_stat_statements` extension
5. **Security** - Use strong passwords and limit network access

## Next Steps

1. The backend will automatically sync blockchain data every 5 minutes
2. User stats are automatically calculated when predictions are recorded
3. The leaderboard view provides real-time rankings
4. Access the API documentation at: http://localhost:5000/api-docs (if implemented)

---

## API Endpoints Overview

### Users
- `GET /api/users/profile/:walletAddress` - Get user profile
- `POST /api/users/profile` - Create/update user profile
- `POST /api/users/follow` - Follow/unfollow user

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard with filters
- `GET /api/leaderboard/top-performers` - Get top performers by category
- `GET /api/leaderboard/rank/:walletAddress` - Get user's rank

### Predictions
- `POST /api/predictions/record` - Record new prediction
- `PUT /api/predictions/outcome/:id` - Update prediction outcome
- `GET /api/predictions/user/:walletAddress` - Get user's predictions

### Markets
- `GET /api/markets` - Get all markets
- `GET /api/markets/:marketPubkey` - Get single market
- `GET /api/markets/:marketPubkey/comments` - Get market comments
- `POST /api/markets/:marketPubkey/comments` - Post comment 