const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./database/db.js');
const userRoutes = require('./routes/users.js');
const leaderboardRoutes = require('./routes/leaderboard.js');
const predictionRoutes = require('./routes/predictions.js');
const marketRoutes = require('./routes/markets.js');
const adminRoutes = require('./routes/admin.js');
const engagementRoutes = require('./routes/engagement.js');
const twitterRoutes = require('./routes/twitter.js');
const syncService = require('./services/syncService.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/twitter', twitterRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test database connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0].now);
    
    // Start blockchain sync service
    syncService.startSync();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
}); 