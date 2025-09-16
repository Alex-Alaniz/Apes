# APES Polymarket Integration - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js v18+ installed
- [ ] PostgreSQL database (Railway, Supabase, or local)
- [ ] Solana RPC endpoint (Helius, Alchemy, or public)
- [ ] Polygon RPC endpoint (Alchemy, Infura, or public)
- [ ] Domain names for web services
- [ ] SSL certificates configured

## Environment Variables

Create `.env` files with the following variables:

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Blockchain RPCs
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
POLYGON_RPC_URL=https://polygon-rpc.com

# API Keys (optional but recommended)
POLYMARKET_API_KEY=your_api_key
KALSHI_API_KEY=your_api_key

# Security
ENCRYPTION_PASSWORD=strong_password_for_wallet_encryption
JWT_SECRET=your_jwt_secret
ADMIN_WALLETS=wallet1,wallet2,wallet3

# Services
TELEGRAM_BOT_TOKEN=your_bot_token
REDIS_URL=redis://localhost:6379

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your_datadog_key
```

### Chrome Extension
```javascript
// config.js
const CONFIG = {
  API_URL: 'https://api.primape.app',
  WS_URL: 'wss://ws.primape.app',
  SOLANA_RPC: 'https://api.mainnet-beta.solana.com'
};
```

## Database Setup

### 1. Create Database
```bash
# Using Railway CLI
railway run psql -c "CREATE DATABASE apes_polymarket;"

# Or using standard PostgreSQL
createdb apes_polymarket
```

### 2. Run Migrations
```bash
cd backend

# Run order book tables migration
psql $DATABASE_URL -f migrations/create_order_book_tables.sql

# Run Polymarket proxy tables migration  
psql $DATABASE_URL -f migrations/create_polymarket_proxy_tables.sql

# Or use the migration scripts
node scripts/run-order-book-migration.js
```

### 3. Verify Tables
```sql
-- Check all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## Backend Deployment

### Railway Deployment

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

2. **Create Project**
```bash
railway new apes-polymarket-backend
cd backend
railway link
```

3. **Add PostgreSQL**
```bash
railway add postgresql
```

4. **Set Environment Variables**
```bash
railway variables set SOLANA_RPC_URL="https://..."
railway variables set POLYGON_RPC_URL="https://..."
# Set all other variables
```

5. **Deploy**
```bash
railway up
```

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy API**
```bash
cd backend
vercel --prod
```

3. **Configure Environment**
- Go to Vercel Dashboard
- Add all environment variables
- Redeploy

### Docker Deployment

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5001
CMD ["node", "server.js"]
```

2. **Build and Run**
```bash
docker build -t apes-backend .
docker run -p 5001:5001 --env-file .env apes-backend
```

## Chrome Extension Deployment

### 1. Prepare for Production
```bash
cd chrome-extension

# Update manifest.json version
# Update API URLs in content.js and background.js
# Add icon files (16x16, 48x48, 128x128)
```

### 2. Build Extension
```bash
# Create ZIP file
zip -r apes-market-access.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "*.DS_Store"
```

### 3. Publish to Chrome Web Store

1. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer fee
3. Click "New Item"
4. Upload ZIP file
5. Fill in details:
   - Title: APES Market Access
   - Description: Trade on Polymarket with APES token benefits
   - Category: Productivity
   - Language: English
6. Add screenshots (1280x800 or 640x400)
7. Submit for review

### 4. Testing
```bash
# Load unpacked for testing
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select chrome-extension directory
5. Test on polymarket.com
```

## Telegram Bot Deployment

### 1. Create Bot
```bash
# Message @BotFather on Telegram
/newbot
# Name: APES Market Access
# Username: ApesMarketBot
# Save the token
```

### 2. Deploy Bot

**Using PM2 (Recommended)**
```bash
cd telegram-bot
npm install
npm install -g pm2

# Start bot
pm2 start index.js --name "apes-telegram-bot"
pm2 save
pm2 startup
```

**Using Systemd**
```bash
# Create service file
sudo nano /etc/systemd/system/apes-bot.service

[Unit]
Description=APES Telegram Bot
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/home/nodejs/apes/telegram-bot
ExecStart=/usr/bin/node index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target

# Start service
sudo systemctl enable apes-bot
sudo systemctl start apes-bot
```

### 3. Set Webhook (Optional)
```javascript
// For production, use webhooks instead of polling
const bot = new TelegramBot(token, {
  webHook: {
    port: process.env.PORT || 8443,
    host: '0.0.0.0'
  }
});

bot.setWebHook(`https://your-domain.com/bot${token}`);
```

## Security Hardening

### 1. API Security
```nginx
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... proxy settings
    }
}
```

### 2. Database Security
```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### 3. Key Management
```bash
# Use HashiCorp Vault or AWS KMS for production
vault kv put secret/apes/wallets encryption_key="..."
```

## Monitoring Setup

### 1. Health Checks
```javascript
// Add to backend
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      rpc: await checkRPC()
    }
  });
});
```

### 2. Logging
```bash
# Setup CloudWatch/Datadog
npm install winston winston-cloudwatch

# Or use Railway logs
railway logs -f
```

### 3. Alerts
```yaml
# datadog-monitors.yaml
- name: "High API Error Rate"
  type: "metric alert"
  query: "sum(last_5m):sum:api.errors{env:prod} > 100"
  
- name: "Database Connection Pool Exhausted"  
  type: "metric alert"
  query: "avg(last_5m):avg:db.pool.available{env:prod} < 2"
```

## Load Testing

```bash
# Install artillery
npm install -g artillery

# Create test script
cat > load-test.yml << EOF
config:
  target: "https://api.primape.app"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 100
scenarios:
  - name: "Place Order"
    engine: "http"
    flow:
      - post:
          url: "/api/polymarket/place-order"
          json:
            marketId: "test-market"
            size: 100
            side: "BUY"
EOF

# Run test
artillery run load-test.yml
```

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] Security audit completed
- [ ] Load testing passed (1000+ concurrent users)
- [ ] Backup systems tested
- [ ] Documentation complete
- [ ] Support team trained

### Launch Day
- [ ] Enable monitoring alerts
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Test with small group
- [ ] Monitor error rates

### Post-Launch
- [ ] Monitor performance metrics
- [ ] Address user feedback
- [ ] Scale infrastructure as needed
- [ ] Plan feature updates

## Rollback Plan

```bash
# Backend rollback
railway rollback
# or
vercel rollback

# Database rollback
psql $DATABASE_URL < backup.sql

# Chrome extension
# Submit previous version to Chrome Store

# Telegram bot
pm2 restart apes-telegram-bot --update-env
```

## Support Contacts

- **Technical Issues**: tech@primape.app
- **Security**: security@primape.app
- **Infrastructure**: DevOps team on Discord
- **Emergencies**: Use PagerDuty escalation

---

## Quick Commands Reference

```bash
# Check all services
./scripts/health-check.sh

# View logs
railway logs -f
pm2 logs apes-telegram-bot

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restart services
pm2 restart all
railway restart

# Update environment
railway variables set KEY=value
pm2 reload ecosystem.config.js
```

Remember: Always test in staging before production deployment!