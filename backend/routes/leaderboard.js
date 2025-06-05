import express from 'express';

const router = express.Router();

// Placeholder leaderboard routes
router.get('/', (req, res) => {
  res.json({ message: 'Leaderboard endpoint' });
});

export default router; 