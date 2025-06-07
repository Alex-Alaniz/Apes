require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const polymarketSyncService = require('./services/polymarketSyncService');
const BurnEventProcessor = require('./services/burnEventProcessor');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/markets', require('./routes/markets'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/engagement', require('./routes/engagement'));
app.use('/api/twitter', require('./routes/twitter'));

// Test database connection
db.query('SELECT NOW()')
  .then(result => {
    console.log('Database connected successfully');
    console.log('Database connection test successful:', result.rows[0].now);
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Start burn event processor
console.log('Starting burn event processor...');
const burnEventProcessor = new BurnEventProcessor();
burnEventProcessor.start().catch(error => {
  console.error('Failed to start burn event processor:', error);
});

// Start Polymarket sync service if enabled
if (process.env.ENABLE_POLYMARKET_SYNC === 'true') {
  console.log('Starting Polymarket sync service...');
  polymarketSyncService.start(parseInt(process.env.POLYMARKET_SYNC_INTERVAL || '10'));
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (burnEventProcessor) {
    burnEventProcessor.stop();
  }
  if (process.env.ENABLE_POLYMARKET_SYNC === 'true') {
    polymarketSyncService.stop();
  }
  await db.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 