import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = express.Router();

// Check if CommonJS markets routes exist
try {
  const marketsRoutes = require('../../src/backend/routes/markets.js');
  router.use('/', marketsRoutes);
} catch (error) {
  // Fallback if the file doesn't exist
  router.get('/', (req, res) => {
    res.json({ message: 'Markets endpoint' });
  });
}

export default router; 