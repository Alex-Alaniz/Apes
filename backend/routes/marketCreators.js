const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  // Check against environment variable admin wallets
  const adminWallets = process.env.ADMIN_WALLETS?.split(',') || [];
  
  if (!walletAddress || !adminWallets.includes(walletAddress)) {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  }
  
  req.adminWallet = walletAddress;
  next();
};

// GET /api/market-creators - Get all authorized market creators
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        wallet_address,
        added_by,
        added_at,
        is_active,
        permissions
      FROM authorized_market_creators
      ORDER BY added_at DESC
    `);
    
    res.json({
      success: true,
      creators: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching market creators:', error);
    res.status(500).json({ error: 'Failed to fetch market creators' });
  }
});

// POST /api/market-creators - Add a new authorized market creator
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { wallet_address, permissions } = req.body;
    const adminWallet = req.adminWallet;
    
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Check if already exists
    const existing = await db.query(
      'SELECT wallet_address FROM authorized_market_creators WHERE wallet_address = $1',
      [wallet_address]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Wallet already authorized',
        wallet_address 
      });
    }
    
    // Insert new creator
    const result = await db.query(`
      INSERT INTO authorized_market_creators (
        wallet_address,
        added_by,
        permissions
      ) VALUES ($1, $2, $3)
      RETURNING *
    `, [
      wallet_address,
      adminWallet,
      permissions || { can_create_markets: true, can_create_tournament_markets: true }
    ]);
    
    console.log(`✅ Added market creator: ${wallet_address} by ${adminWallet}`);
    
    res.json({
      success: true,
      creator: result.rows[0],
      message: `Successfully authorized ${wallet_address} to create markets`
    });
  } catch (error) {
    console.error('Error adding market creator:', error);
    res.status(500).json({ error: 'Failed to add market creator' });
  }
});

// DELETE /api/market-creators/:wallet - Remove market creator authorization
router.delete('/:wallet', authenticateAdmin, async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const result = await db.query(`
      UPDATE authorized_market_creators 
      SET is_active = false 
      WHERE wallet_address = $1
      RETURNING wallet_address
    `, [wallet]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`🚫 Deactivated market creator: ${wallet}`);
    
    res.json({
      success: true,
      message: `Successfully removed market creation privileges for ${wallet}`
    });
  } catch (error) {
    console.error('Error removing market creator:', error);
    res.status(500).json({ error: 'Failed to remove market creator' });
  }
});

// PUT /api/market-creators/:wallet/reactivate - Reactivate a market creator
router.put('/:wallet/reactivate', authenticateAdmin, async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const result = await db.query(`
      UPDATE authorized_market_creators 
      SET is_active = true 
      WHERE wallet_address = $1
      RETURNING *
    `, [wallet]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    console.log(`✅ Reactivated market creator: ${wallet}`);
    
    res.json({
      success: true,
      creator: result.rows[0],
      message: `Successfully restored market creation privileges for ${wallet}`
    });
  } catch (error) {
    console.error('Error reactivating market creator:', error);
    res.status(500).json({ error: 'Failed to reactivate market creator' });
  }
});

// GET /api/market-creators/check/:wallet - Check if a wallet is authorized
router.get('/check/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Check admin wallets first
    const adminWallets = process.env.ADMIN_WALLETS?.split(',') || [];
    if (adminWallets.includes(wallet)) {
      return res.json({
        authorized: true,
        isAdmin: true,
        permissions: { can_create_markets: true, can_create_tournament_markets: true }
      });
    }
    
    // Check authorized creators table
    const result = await db.query(`
      SELECT 
        wallet_address,
        is_active,
        permissions
      FROM authorized_market_creators 
      WHERE wallet_address = $1
    `, [wallet]);
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.json({
        authorized: false,
        isAdmin: false
      });
    }
    
    res.json({
      authorized: true,
      isAdmin: false,
      permissions: result.rows[0].permissions
    });
  } catch (error) {
    console.error('Error checking creator authorization:', error);
    res.status(500).json({ error: 'Failed to check authorization' });
  }
});

// GET /api/market-creators/deployment-log - Get market deployment history
router.get('/deployment-log', authenticateAdmin, async (req, res) => {
  try {
    const { wallet, tournament_id, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        dl.*,
        m.question,
        m.status as market_status
      FROM market_deployment_log dl
      LEFT JOIN markets m ON dl.market_address = m.market_address
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (wallet) {
      query += ` AND dl.deployed_by_wallet = $${++paramCount}`;
      params.push(wallet);
    }
    
    if (tournament_id) {
      query += ` AND dl.tournament_id = $${++paramCount}`;
      params.push(tournament_id);
    }
    
    query += ` ORDER BY dl.created_at DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      logs: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching deployment log:', error);
    res.status(500).json({ error: 'Failed to fetch deployment log' });
  }
});

module.exports = router; 