import express from 'express';

const router = express.Router();

// Placeholder user routes
router.get('/', (req, res) => {
  res.json({ message: 'Users endpoint' });
});

export default router; 