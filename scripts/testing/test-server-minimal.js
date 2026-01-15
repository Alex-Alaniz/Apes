// Minimal server test to identify startup issues
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./backend/config/database');
    await pool.query('SELECT 1');
    res.json({ database: 'connected' });
  } catch (error) {
    res.status(500).json({ database: 'failed', error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Minimal test server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🗃️ DB Test: http://localhost:${PORT}/test-db`);
});