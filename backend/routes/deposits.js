/**
 * Deposit API Routes
 * Handles cross-chain deposits and bridging
 */

const express = require('express');
const router = express.Router();
const DepositService = require('../services/depositService');
// Simple auth middleware - checks for wallet address
const authenticateToken = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'No wallet address provided' });
  }
  
  // In production, verify wallet signature
  req.user = {
    id: walletAddress, // Use wallet as ID for now
    wallet_address: walletAddress
  };
  
  next();
};
const { body, query, validationResult } = require('express-validator');

// Initialize deposit service
const depositService = new DepositService();
depositService.initialize().catch(console.error);

/**
 * GET /api/deposits/address/:chainId
 * Get or generate deposit address for a specific chain
 */
router.get('/address/:chainId', authenticateToken, async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const userId = req.user.id; // This is the wallet address

    console.log('Generating deposit address for:', { userId, chainId });

    if (!chainId || isNaN(chainId)) {
      return res.status(400).json({ error: 'Invalid chain ID' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const depositAddress = await depositService.generateDepositAddress(userId, chainId);
    
    res.json({
      success: true,
      address: depositAddress.address,
      chainId: depositAddress.chain_id,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${depositAddress.address}`
    });

  } catch (error) {
    console.error('Error getting deposit address:', error);
    res.status(500).json({ 
      error: 'Failed to generate deposit address',
      details: error.message 
    });
  }
});

/**
 * GET /api/deposits/quote
 * Get bridging quote for cross-chain transfer
 */
router.get('/quote', authenticateToken, [
  query('fromChain').isNumeric().withMessage('fromChain must be numeric'),
  query('toChain').isNumeric().withMessage('toChain must be numeric'),
  query('token').notEmpty().withMessage('token is required'),
  query('amount').isNumeric().withMessage('amount must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromChain, toChain, token, amount } = req.query;

    const quote = await depositService.getBestRoute({
      fromChain: parseInt(fromChain),
      toChain: parseInt(toChain),
      token,
      amount,
      fromAddress: req.user.wallet_address,
      toAddress: req.user.wallet_address
    });

    res.json({
      success: true,
      quote
    });

  } catch (error) {
    console.error('Error getting quote:', error);
    res.status(500).json({ 
      error: 'Failed to get quote',
      details: error.message
    });
  }
});

/**
 * POST /api/deposits/process
 * Process an incoming deposit (webhook or manual)
 */
router.post('/process', [
  body('chainId').isNumeric(),
  body('address').notEmpty(),
  body('txHash').notEmpty(),
  body('amount').isNumeric(),
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In production, verify webhook signature
    const { chainId, address, txHash, amount, token } = req.body;

    // Find user by deposit address
    const db = require('../database/db');
    const depositAddress = await db.query(
      'SELECT user_id FROM deposit_addresses WHERE address = $1 AND chain_id = $2',
      [address, chainId]
    );

    if (depositAddress.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit address not found' });
    }

    const userId = depositAddress.rows[0].user_id;

    const deposit = await depositService.processDeposit({
      userId,
      chainId: parseInt(chainId),
      address,
      txHash,
      amount,
      token
    });

    res.json({
      success: true,
      deposit
    });

  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

/**
 * GET /api/deposits/history
 * Get user's deposit history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const history = await depositService.getDepositHistory(userId, limit);

    res.json({
      success: true,
      deposits: history
    });

  } catch (error) {
    console.error('Error getting deposit history:', error);
    res.status(500).json({ error: 'Failed to get deposit history' });
  }
});

/**
 * GET /api/deposits/balances
 * Get user's aggregated balances across chains
 */
router.get('/balances', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const balances = await depositService.getAggregatedBalance(userId);

    // Group by token
    const tokenBalances = {};
    balances.forEach(b => {
      if (!tokenBalances[b.token]) {
        tokenBalances[b.token] = {
          token: b.token,
          totalBalance: 0,
          chains: {}
        };
      }
      tokenBalances[b.token].chains[b.chain_id] = b.balance;
      tokenBalances[b.token].totalBalance += parseFloat(b.balance);
    });

    res.json({
      success: true,
      balances: Object.values(tokenBalances)
    });

  } catch (error) {
    console.error('Error getting balances:', error);
    res.status(500).json({ error: 'Failed to get balances' });
  }
});

/**
 * GET /api/deposits/supported-chains
 * Get list of supported chains
 */
router.get('/supported-chains', async (req, res) => {
  try {
    const chains = [
      { id: 1, name: 'Ethereum', symbol: 'ETH' },
      { id: 137, name: 'Polygon', symbol: 'MATIC' },
      { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
      // { id: 101, name: 'Solana', symbol: 'SOL' } // Coming soon
    ];

    res.json({
      success: true,
      chains
    });

  } catch (error) {
    console.error('Error getting chains:', error);
    res.status(500).json({ error: 'Failed to get supported chains' });
  }
});

/**
 * POST /api/deposits/bridge
 * Initiate a bridge transfer
 */
router.post('/bridge', authenticateToken, [
  body('depositId').isNumeric(),
  body('toChain').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // TODO: Implement bridge execution
    res.json({
      success: false,
      message: 'Bridge execution coming soon'
    });

  } catch (error) {
    console.error('Error initiating bridge:', error);
    res.status(500).json({ error: 'Failed to initiate bridge' });
  }
});

module.exports = router;