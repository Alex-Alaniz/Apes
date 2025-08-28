const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Mock daily crypto markets endpoint
app.get('/api/markets/daily-crypto', (req, res) => {
  const mockMarkets = [
    {
      market_address: "test_btc_001",
      question: "Will Bitcoin be above $112368 at 11:59 PM UTC today?",
      description: "Bitcoin price prediction. Current: $112368.00. Resolves at market close.",
      options: ["Yes", "No"],
      category: "Crypto",
      resolution_date: "2025-08-28T23:59:00.000Z",
      creator_fee: 200,
      min_bet: "10000000000",
      volume: "0",
      current_price: 112368,
      crypto_symbol: "BTC",
      status: "Active"
    },
    {
      market_address: "test_eth_001",
      question: "Will Ethereum be above $4640 at 11:59 PM UTC today?",
      description: "Ethereum price prediction. Current: $4640.19. Resolves at market close.",
      options: ["Yes", "No"],
      category: "Crypto",
      resolution_date: "2025-08-28T23:59:00.000Z",
      creator_fee: 200,
      min_bet: "10000000000",
      volume: "0",
      current_price: 4640.19,
      crypto_symbol: "ETH",
      status: "Active"
    },
    {
      market_address: "test_sol_001",
      question: "Will Solana be above $210 at 11:59 PM UTC today?",
      description: "Solana price prediction. Current: $209.52. Resolves at market close.",
      options: ["Yes", "No"],
      category: "Crypto",
      resolution_date: "2025-08-28T23:59:00.000Z",
      creator_fee: 200,
      min_bet: "10000000000",
      volume: "0",
      current_price: 209.52,
      crypto_symbol: "SOL",
      status: "Active"
    }
  ];

  res.json({
    success: true,
    markets: mockMarkets,
    message: "Test daily crypto markets loaded"
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Test server running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔮 Daily Crypto: http://localhost:${PORT}/api/markets/daily-crypto`);
});
