import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = express.Router();

// Check if CommonJS predictions routes exist
try {
  const predictionsRoutes = require('../../src/backend/routes/predictions.js');
  router.use('/', predictionsRoutes);
} catch (error) {
  // Fallback if the file doesn't exist
  router.get('/', (req, res) => {
    res.json({ message: 'Predictions endpoint' });
  });
}

export default router; 