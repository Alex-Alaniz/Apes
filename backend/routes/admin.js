const express = require('express');
const path = require('path');
const db = require('../config/database');
const supabase = require('../config/supabase');
// const marketService = require('../services/marketService'); // Removed: unused import

const router = express.Router();

// Dynamic imports for Solana packages (loaded when needed)
let solanaWeb3, splToken, anchor;
async function loadSolanaModules() {
  if (!solanaWeb3) {
    solanaWeb3 = await import('@solana/web3.js');
    splToken = await import('@solana/spl-token');
    anchor = await import('@coral-xyz/anchor');
  }
  return { solanaWeb3, splToken, anchor };
}

// SECURITY: Move admin wallets to environment variables
// No longer hardcode admin wallets in source code
const getAuthorizedWallets = () => {
  const envWallets = process.env.ADMIN_WALLETS;
  if (!envWallets) {
    console.warn('⚠️ No ADMIN_WALLETS environment variable set. Admin functions disabled.');
    return [];
  }
  
  return envWallets.split(',').map(wallet => wallet.trim()).filter(Boolean);
};

// Secure admin authorization check endpoint
router.get('/check-authorization', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!walletAddress) {
      return res.json({ 
        authorized: false, 
        role: 'guest',
        message: 'No wallet address provided' 
      });
    }

    const authorizedWallets = getAuthorizedWallets();
    const isAuthorized = authorizedWallets.includes(walletAddress);

    // Log authorization attempts for security monitoring
    console.log('🔐 Admin authorization check:', {
      wallet: walletAddress,
      authorized: isAuthorized,
      timestamp: new Date().toISOString()
    });

    // Additional security: Check for any admin-specific database permissions
    let role = 'user';
    let permissions = {};

    if (isAuthorized) {
      role = 'admin';
      permissions = {
        can_create_markets: true,
        can_resolve_markets: true,
        can_manage_users: true,
        can_view_admin_panel: true
      };

      // Optional: Check database for additional role information
      try {
        const userResult = await db.query(
          'SELECT role, permissions FROM users WHERE wallet_address = $1',
          [walletAddress]
        );
        
        if (userResult.rows.length > 0 && userResult.rows[0].role) {
          role = userResult.rows[0].role;
          if (userResult.rows[0].permissions) {
            permissions = { ...permissions, ...userResult.rows[0].permissions };
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not check database role for admin user:', dbError.message);
        // Continue with environment-based authorization
      }
    }

    res.json({
      authorized: isAuthorized,
      role: role,
      permissions: permissions,
      wallet: walletAddress
    });

  } catch (error) {
    console.error('❌ Error checking admin authorization:', error);
    res.status(500).json({ 
      authorized: false, 
      role: 'user',
      error: 'Authorization check failed' 
    });
  }
});

// Enhanced middleware to authenticate admin by wallet with better security
const authenticateAdmin = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'No wallet address provided' });
  }

  const authorizedWallets = getAuthorizedWallets();
  
  if (authorizedWallets.length === 0) {
    console.error('❌ No admin wallets configured. Admin functions disabled.');
    return res.status(503).json({ 
      error: 'Admin functions not available - configuration error' 
    });
  }
  
  // Check if wallet is authorized
  if (!authorizedWallets.includes(walletAddress)) {
    // Log unauthorized attempts for security monitoring
    console.warn('🚨 Unauthorized admin access attempt:', {
      wallet: walletAddress,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({ error: 'Wallet not authorized for admin access' });
  }

  // Log successful admin access
  console.log('✅ Admin access granted:', {
    wallet: walletAddress,
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  req.adminWallet = walletAddress;
  next();
};

// Get all markets for admin (existing functionality with security logging)
router.get('/markets', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Admin fetching all markets');
    
    const result = await db.query(`
      SELECT 
        market_address,
        question,
        options,
        status,
        resolution_date,
        resolved_option,
        category,
        created_at,
        creator_wallet,
        total_volume,
        option_volumes
      FROM markets 
      ORDER BY created_at DESC
    `);

    console.log(`✅ Retrieved ${result.rows.length} markets for admin`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching admin markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get all markets from Polymarket DB (debug endpoint)
router.get('/all-polymarket-markets', authenticateAdmin, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const POLYMARKET_DB_URL = process.env.POLYMARKET_DB_URL || 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';
    
    const pool = new Pool({
      connectionString: POLYMARKET_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Fetch ALL markets from the database for debugging
    const query = `
      SELECT 
        m.poly_id,
        m.market_id as apechain_market_id,
        m.question,
        m.category,
        m.banner,
        m.icon,
        m.end_time,
        m.market_type,
        m.status,
        m.deployed_at,
        -- Get options as JSON array
        COALESCE(
          json_agg(
            json_build_object(
              'label', mo.label,
              'icon', mo.icon,
              'option_poly_id', mo.option_poly_id
            ) ORDER BY mo.id
          ) FILTER (WHERE mo.id IS NOT NULL),
          '[]'::json
        ) as options,
        -- Check if already deployed to Solana
        EXISTS(
          SELECT 1 FROM markets_cache mc 
          WHERE mc.poly_id = m.poly_id
        ) as is_deployed_to_solana
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE 
        m.question IS NOT NULL
        AND m.banner IS NOT NULL
      GROUP BY m.poly_id
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    
    console.log('Fetching all markets from Polymarket DB...');
    const result = await pool.query(query);
    await pool.end();
    
    console.log(`Found ${result.rows.length} markets in Polymarket DB`);
    
    // Transform data for frontend
    const markets = result.rows.map(row => ({
      poly_id: row.poly_id,
      apechain_market_id: row.apechain_market_id,
      question: row.question,
      category: row.category || 'general',
      options: row.options || [],
      assets: {
        banner: row.banner,
        icon: row.icon || row.banner
      },
      end_time: row.end_time,
      market_type: row.market_type || 'binary',
      status: row.status,
      deployed_at: row.deployed_at,
      is_deployed_to_solana: row.is_deployed_to_solana,
      // Additional metadata
      option_count: row.options.length,
      time_remaining: new Date(row.end_time) - new Date(),
      formatted_end_date: new Date(row.end_time).toLocaleDateString(),
      is_active: row.status === 'live' && new Date(row.end_time) > new Date()
    }));
    
    // Separate into deployable and non-deployable
    const deployable = markets.filter(m => !m.is_deployed_to_solana && m.is_active);
    const already_deployed = markets.filter(m => m.is_deployed_to_solana);
    const expired = markets.filter(m => !m.is_active && !m.is_deployed_to_solana);
    
    res.json({ 
      total: markets.length,
      deployable: deployable.length,
      already_deployed: already_deployed.length,
      expired: expired.length,
      markets: deployable,
      all_markets: markets,
      debug_info: {
        total_markets: result.rows.length,
        with_apechain_id: result.rows.filter(r => r.apechain_market_id).length,
        active: result.rows.filter(r => r.status === 'live').length,
        with_banners: result.rows.filter(r => r.banner).length
      }
    });
  } catch (error) {
    console.error('Error fetching all Polymarket markets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch markets',
      details: error.message 
    });
  }
});

// Get pending markets for deployment
router.get('/pending-markets', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Admin fetching pending markets');
    
    // This would typically fetch from a markets queue or external source
    // For now, return empty array - implement based on your market source
    const pendingMarkets = [];
    
    res.json({
      markets: pendingMarkets,
      total: pendingMarkets.length
    });
  } catch (error) {
    console.error('❌ Error fetching pending markets:', error);
    res.status(500).json({ error: 'Failed to fetch pending markets' });
  }
});

// Deploy a specific market to Solana
router.post('/deploy-market/:polyId', authenticateAdmin, async (req, res) => {
  try {
    const { polyId } = req.params;
    
    console.log(`Admin wallet ${req.adminWallet} requesting deployment data for market ${polyId}`);
    
    // Import required modules
    const { Pool } = require('pg');
    
    // Database connection
    const POLYMARKET_DB_URL = process.env.POLYMARKET_DB_URL || 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';
    const pool = new Pool({
      connectionString: POLYMARKET_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Fetch the specific market
    const marketQuery = `
      SELECT 
        m.poly_id,
        m.market_id as apechain_market_id,
        m.question,
        m.category,
        m.banner,
        m.icon,
        m.end_time,
        m.market_type,
        COALESCE(
          json_agg(
            json_build_object(
              'label', mo.label,
              'icon', mo.icon
            ) ORDER BY mo.id
          ) FILTER (WHERE mo.id IS NOT NULL),
          '[]'::json
        ) as options
      FROM markets m
      LEFT JOIN market_options mo ON m.poly_id = mo.market_poly_id
      WHERE m.poly_id = $1
      GROUP BY m.poly_id
    `;
    
    const marketResult = await pool.query(marketQuery, [polyId]);
    await pool.end();
    
    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    const dbMarket = marketResult.rows[0];
    
    // Return the market data for frontend to create the transaction
    const marketData = {
      poly_id: dbMarket.poly_id,
      apechain_market_id: dbMarket.apechain_market_id,
      question: dbMarket.question,
      category: dbMarket.category || 'general',
      options: dbMarket.options.map(o => o.label),
      assets: {
        banner: dbMarket.banner,
        icon: dbMarket.icon || dbMarket.banner
      },
      options_metadata: dbMarket.options,
      end_time: dbMarket.end_time,
      market_type: dbMarket.market_type || 'binary'
    };
    
    res.json({
      success: true,
      marketData: marketData
    });
  } catch (error) {
    console.error('Error preparing market deployment:', error);
    res.status(500).json({ 
      error: 'Failed to prepare market deployment', 
      details: error.message 
    });
  }
});

// Save deployed market
router.post('/save-deployed-market', authenticateAdmin, async (req, res) => {
  try {
    const { 
      market_address,
      poly_id,
      apechain_market_id,
      question,
      category,
      options,
      assets,
      options_metadata,
      end_time,
      transaction_hash
    } = req.body;

    const adminWallet = req.adminWallet;

    console.log('Saving deployed market with data:', {
      market_address,
      poly_id,
      question,
      category,
      options: Array.isArray(options) ? options : JSON.parse(options || '[]'),
      assets
    });

    // Ensure options is properly formatted for PostgreSQL array
    let formattedOptions;
    if (Array.isArray(options)) {
      formattedOptions = options.map(opt => typeof opt === 'string' ? opt : opt.label || opt.text || String(opt));
    } else if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        formattedOptions = Array.isArray(parsed) ? parsed.map(opt => typeof opt === 'string' ? opt : opt.label || opt.text || String(opt)) : [options];
      } catch (e) {
        formattedOptions = [options];
      }
    } else {
      formattedOptions = [];
    }

    console.log('Formatted options for database:', formattedOptions);

    // Check if this is a re-deployment (same poly_id, different market_address)
    const existingMarketQuery = `
      SELECT market_address, assets, options_metadata 
      FROM markets 
      WHERE poly_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const existingResult = await db.query(existingMarketQuery, [poly_id]);
    
    let finalAssets = assets || {};
    let finalOptionsMetadata = options_metadata || [];
    
    // If this is a re-deployment, preserve assets from the original if new ones aren't provided
    if (existingResult.rows.length > 0 && existingResult.rows[0].market_address !== market_address) {
      console.log(`Re-deployment detected for poly_id: ${poly_id}`);
      
      // Parse existing assets and merge with new ones
      try {
        const existingAssets = typeof existingResult.rows[0].assets === 'string' 
          ? JSON.parse(existingResult.rows[0].assets) 
          : existingResult.rows[0].assets || {};
        
        const existingOptionsMetadata = typeof existingResult.rows[0].options_metadata === 'string'
          ? JSON.parse(existingResult.rows[0].options_metadata)
          : existingResult.rows[0].options_metadata || [];
        
        // Merge assets (new assets take precedence)
        finalAssets = { ...existingAssets, ...finalAssets };
        
        // Use new options_metadata if provided, otherwise keep existing
        if (!options_metadata || options_metadata.length === 0) {
          finalOptionsMetadata = existingOptionsMetadata;
        }
        
        // Update icon to match the first deployed option (if we have options_metadata)
        if (finalOptionsMetadata && finalOptionsMetadata.length > 0 && formattedOptions.length > 0) {
          // Find the metadata for the first deployed option
          const firstOptionMeta = finalOptionsMetadata.find(meta => 
            meta && meta.label && formattedOptions[0] && 
            meta.label.toLowerCase().includes(formattedOptions[0].toLowerCase()) ||
            formattedOptions[0].toLowerCase().includes(meta.label.toLowerCase())
          );
          
          if (firstOptionMeta && firstOptionMeta.icon) {
            finalAssets.icon = firstOptionMeta.icon;
            console.log(`Updated icon to match first deployed option (${formattedOptions[0]}):`, firstOptionMeta.icon);
          } else {
            // If no specific icon found, use the banner as fallback
            if (finalAssets.banner) {
              finalAssets.icon = finalAssets.banner;
              console.log('Using banner as icon since no specific option icon found');
            }
          }
        }
        
        console.log('Preserved and updated assets for re-deployment:', finalAssets);
      } catch (e) {
        console.error('Error parsing existing assets:', e);
      }
    }

    // Save to markets table (allow multiple entries for re-deployments)
    await db.query(`
      INSERT INTO markets (
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        options,
        poly_id,
        apechain_market_id,
        assets,
        options_metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (market_address) DO UPDATE SET
        question = EXCLUDED.question,
        category = EXCLUDED.category,
        options = EXCLUDED.options,
        poly_id = EXCLUDED.poly_id,
        apechain_market_id = EXCLUDED.apechain_market_id,
        assets = EXCLUDED.assets,
        options_metadata = EXCLUDED.options_metadata,
        updated_at = NOW()
    `, [
      market_address,
      adminWallet,
      question,
      question, // description
      category || 'general',
      end_time,
      'Active',
      formattedOptions, // PostgreSQL array format
      poly_id,
      apechain_market_id?.toString() || null,
      JSON.stringify(finalAssets),
      JSON.stringify(finalOptionsMetadata)
    ]);

    // Also save to markets_cache for quick access
    try {
      await db.query(`
        INSERT INTO markets_cache (
          market_pubkey,
          question,
          category,
          status,
          options,
          assets,
          options_metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (market_pubkey) DO UPDATE SET
          question = EXCLUDED.question,
          category = EXCLUDED.category,
          options = EXCLUDED.options,
          assets = EXCLUDED.assets,
          options_metadata = EXCLUDED.options_metadata,
          updated_at = NOW()
      `, [
        market_address,
        question,
        category || 'general',
        'Active',
        formattedOptions,
        JSON.stringify(finalAssets),
        JSON.stringify(finalOptionsMetadata)
      ]);
    } catch (cacheError) {
      console.warn('Failed to save to markets_cache (table may not exist or have different schema):', cacheError.message);
      // Continue execution even if cache save fails
    }

    console.log(`✅ Successfully saved market ${market_address} to database with assets:`, finalAssets);

    res.json({
      success: true,
      message: 'Market deployment saved successfully',
      market_address,
      poly_id,
      assets: finalAssets
    });
  } catch (error) {
    console.error('Error saving deployed market:', error);
    res.status(500).json({ 
      error: 'Failed to save deployed market', 
      details: error.message 
    });
  }
});

// Decline/Blacklist a market from deployment
router.post('/decline-market/:polyId', authenticateAdmin, async (req, res) => {
  try {
    const { polyId } = req.params;
    const { reason } = req.body;
    const adminWallet = req.adminWallet;
    
    console.log(`Admin wallet ${adminWallet} declining market ${polyId}`);
    
    // Create or ensure declined_markets table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS declined_markets (
          poly_id VARCHAR(100) PRIMARY KEY,
          declined_by VARCHAR(100) NOT NULL,
          reason TEXT,
          declined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      // Table might already exist
    }
    
    // Insert into declined markets
    await db.query(`
      INSERT INTO declined_markets (poly_id, declined_by, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (poly_id) DO UPDATE
      SET declined_by = EXCLUDED.declined_by,
          reason = EXCLUDED.reason,
          declined_at = CURRENT_TIMESTAMP
    `, [polyId, adminWallet, reason || 'No reason provided']);
    
    res.json({
      success: true,
      message: `Market ${polyId} has been declined and will not be shown for deployment`
    });
  } catch (error) {
    console.error('Error declining market:', error);
    res.status(500).json({ 
      error: 'Failed to decline market', 
      details: error.message 
    });
  }
});

// Manual sync market resolution status from blockchain
router.post('/sync-market-resolution/:address', authenticateAdmin, async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`🔄 Admin manual sync requested for market ${address}`);
    
    // Import the live market sync service
    const liveMarketSync = require('../services/liveMarketSyncService');
    
    // Sync the resolution status from blockchain to database
    const syncResult = await liveMarketSync.syncMarketResolutionStatus(address);
    
    if (syncResult.success && syncResult.wasResolved) {
      console.log(`✅ Market ${address} was resolved and database updated`);
      res.json({ 
        success: true, 
        message: 'Market resolution status synced successfully',
        wasResolved: true,
        winningOption: syncResult.winningOption,
        marketAddress: address,
        previousStatus: syncResult.previousStatus,
        newStatus: syncResult.newStatus
      });
    } else if (syncResult.success && !syncResult.wasResolved) {
      console.log(`📊 Market ${address} is still active on blockchain`);
      res.json({ 
        success: true, 
        message: 'Market is still active on blockchain',
        wasResolved: false,
        marketAddress: address,
        currentStatus: syncResult.currentStatus
      });
    } else {
      console.error(`❌ Failed to sync resolution for ${address}:`, syncResult.error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to sync market resolution status',
        details: syncResult.error,
        marketAddress: address
      });
    }
  } catch (error) {
    console.error('Error in manual sync endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to sync market resolution',
      details: error.message 
    });
  }
});

// Admin market resolution with enhanced security logging
router.post('/resolve-market/:marketAddress', authenticateAdmin, async (req, res) => {
  try {
    const { marketAddress } = req.params;
    const { winningOption } = req.body;
    const adminWallet = req.adminWallet;

    console.log('🎯 Admin resolving market:', {
      market: marketAddress,
      option: winningOption,
      admin: adminWallet,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (typeof winningOption !== 'number' || winningOption < 0) {
      return res.status(400).json({ error: 'Invalid winning option' });
    }

    // Resolve the market in database
    const result = await db.query(`
      UPDATE markets 
      SET status = 'Resolved', 
          resolved_option = $1,
          resolution_date = NOW(),
          resolved_by = $3
      WHERE market_address = $2 
      AND status = 'Active'
      RETURNING *
    `, [winningOption, marketAddress, adminWallet]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found or already resolved' });
    }

    const market = result.rows[0];

    console.log('✅ Market resolved successfully:', {
      market: marketAddress,
      question: market.question,
      winningOption: winningOption,
      admin: adminWallet
    });

    res.json({
      success: true,
      market: market,
      message: `Market resolved with option ${winningOption}`
    });

  } catch (error) {
    console.error('❌ Error resolving market:', error);
    res.status(500).json({ error: 'Failed to resolve market' });
  }
});

// Update market assets (banner and option icons) - LOCAL DATABASE ONLY
router.put('/update-market-assets/:address', authenticateAdmin, async (req, res) => {
  try {
    const { address } = req.params;
    const { assets, options_metadata } = req.body;
    
    if (!assets && !options_metadata) {
      return res.status(400).json({ error: 'No assets data provided' });
    }
    
    // First, check if the market exists in our local database
    const checkQuery = `SELECT * FROM markets WHERE market_address = $1`;
    const checkResult = await db.query(checkQuery, [address]);
    
    if (checkResult.rows.length === 0) {
      // Market doesn't exist in our database, we need to create a minimal record
      // This happens for markets created directly on-chain that aren't in our DB yet
      console.log(`Market ${address} not found in local database, creating minimal record for assets`);
      
      const insertQuery = `
        INSERT INTO markets (
          market_address,
          creator,
          question,
          description,
          category,
          resolution_date,
          status,
          options,
          assets,
          options_metadata,
          created_at,
          updated_at
        ) VALUES (
          $1,
          'unknown',
          'Market from blockchain',
          'Market from blockchain',
          'general',
          NOW() + INTERVAL '30 days',
          'Active',
          ARRAY[]::text[],
          $2,
          $3,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      const result = await db.query(insertQuery, [
        address,
        assets ? JSON.stringify(assets) : '{}',
        options_metadata ? JSON.stringify(options_metadata) : '[]'
      ]);
      
      res.json({
        success: true,
        message: 'Market created in database and assets saved',
        market: result.rows[0]
      });
    } else {
      // Market exists, update it
      const updateQuery = `
        UPDATE markets 
        SET 
          assets = COALESCE($1, assets),
          options_metadata = COALESCE($2, options_metadata),
          updated_at = NOW()
        WHERE market_address = $3
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [
        assets ? JSON.stringify(assets) : null,
        options_metadata ? JSON.stringify(options_metadata) : null,
        address
      ]);
      
      res.json({
        success: true,
        message: 'Market assets updated successfully',
        market: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error updating market assets:', error);
    res.status(500).json({ 
      error: 'Failed to update market assets', 
      details: error.message 
    });
  }
});

// TEST ENDPOINT: Simulate betting activity for dynamic icon testing
router.post('/simulate-betting/:marketAddress', authenticateAdmin, async (req, res) => {
  try {
    const { marketAddress } = req.params;
    const { optionIndex, volume } = req.body;
    
    if (optionIndex === undefined || volume === undefined) {
      return res.status(400).json({ error: 'optionIndex and volume are required' });
    }
    
    // Get current market data
    const marketQuery = `SELECT options, option_volumes, total_volume FROM markets WHERE market_address = $1`;
    const marketResult = await db.query(marketQuery, [marketAddress]);
    
    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    const market = marketResult.rows[0];
    const optionCount = market.options.length;
    
    // Initialize or update option volumes
    let currentVolumes = market.option_volumes || new Array(optionCount).fill(0);
    if (typeof currentVolumes === 'string') {
      currentVolumes = JSON.parse(currentVolumes);
    }
    
    // Add volume to the specified option
    currentVolumes[optionIndex] = (currentVolumes[optionIndex] || 0) + volume;
    const newTotalVolume = currentVolumes.reduce((sum, vol) => sum + vol, 0);
    
    // Update database
    await db.query(`
      UPDATE markets 
      SET option_volumes = $1, total_volume = $2, updated_at = NOW()
      WHERE market_address = $3
    `, [currentVolumes, newTotalVolume, marketAddress]);
    
    // Calculate percentages
    const percentages = currentVolumes.map(vol => (vol / newTotalVolume) * 100);
    
    console.log(`🧪 Simulated ${volume} volume for option ${optionIndex} in market ${marketAddress}`);
    console.log(`📊 New percentages: ${percentages.map((p, i) => `${market.options[i]}: ${p.toFixed(1)}%`).join(', ')}`);
    
    res.json({
      success: true,
      message: 'Betting activity simulated',
      market_address: marketAddress,
      option_volumes: currentVolumes,
      total_volume: newTotalVolume,
      percentages: percentages.map((p, i) => ({ option: market.options[i], percentage: p.toFixed(1) }))
    });
  } catch (error) {
    console.error('Error simulating betting:', error);
    res.status(500).json({ error: 'Failed to simulate betting', details: error.message });
  }
});

// Get deployed markets
router.get('/deployed-markets', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Admin fetching deployed markets');
    
    const result = await db.query(`
      SELECT 
        market_address,
        question,
        options,
        status,
        category,
        created_at,
        creator_wallet,
        total_volume
      FROM markets 
      WHERE market_address IS NOT NULL
      ORDER BY created_at DESC
    `);

    res.json({
      markets: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching deployed markets:', error);
    res.status(500).json({ error: 'Failed to fetch deployed markets' });
  }
});

// Scan all onchain markets and compare with database status
router.get('/blockchain-markets-audit', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 Starting comprehensive blockchain markets audit...');
    
    // Import Solana modules
    const { Connection, PublicKey } = require('@solana/web3.js');
    const liveMarketSync = require('../services/liveMarketSyncService');
    
    // Get network config
    const NETWORK = process.env.VITE_SOLANA_NETWORK || process.env.SOLANA_NETWORK || 'mainnet';
    const NETWORK_CONFIG = {
      devnet: {
        programId: "F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y",
        rpcUrl: "https://api.devnet.solana.com"
      },
      mainnet: {
        programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS", 
        rpcUrl: process.env.SOLANA_RPC_URL || "https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN"
      }
    };
    
    const config = NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG['mainnet'];
    const PROGRAM_ID = config.programId;
    const RPC_ENDPOINT = config.rpcUrl;
    
    console.log(`🌐 Scanning ${NETWORK} network (Program ID: ${PROGRAM_ID})`);
    
    if (!PROGRAM_ID) {
      return res.status(500).json({ 
        error: 'Program ID not configured for network',
        network: NETWORK
      });
    }
    
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    
    // 1. Get ALL market accounts from blockchain
    console.log('🔎 Fetching all market accounts from blockchain...');
    const marketAccounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 1000 // Approximate market account size - adjust if needed
        }
      ]
    });
    
    console.log(`📊 Found ${marketAccounts.length} accounts on blockchain`);
    
    // 2. Get all markets from database
    const dbQuery = `SELECT market_address, question, status, resolved_option FROM markets ORDER BY created_at DESC`;
    const dbResult = await db.query(dbQuery);
    const dbMarkets = dbResult.rows;
    
    console.log(`💾 Found ${dbMarkets.length} markets in database`);
    
    // 3. Process each blockchain market
    const blockchainMarkets = [];
    const errors = [];
    
    for (const { pubkey, account } of marketAccounts) {
      try {
        const marketAddress = pubkey.toString();
        console.log(`🔍 Processing blockchain market: ${marketAddress}`);
        
        // Deserialize market data
        const marketData = liveMarketSync.deserializeMarketAccount(account.data);
        
        // Find corresponding database entry
        const dbMatch = dbMarkets.find(m => m.market_address === marketAddress);
        
        const blockchainMarket = {
          market_address: marketAddress,
          blockchain_status: marketData.status,
          blockchain_question: marketData.question?.substring(0, 100),
          blockchain_winning_option: marketData.winningOption,
          blockchain_option_count: marketData.optionCount,
          blockchain_options: marketData.options,
          database_exists: !!dbMatch,
          database_status: dbMatch?.status || 'NOT_FOUND',
          database_question: dbMatch?.question?.substring(0, 100) || 'NOT_FOUND',
          database_resolved_option: dbMatch?.resolved_option || null,
          status_mismatch: dbMatch ? (marketData.status !== dbMatch.status) : true,
          needs_sync: dbMatch ? (marketData.status === 'Resolved' && dbMatch.status !== 'Resolved') : false
        };
        
        blockchainMarkets.push(blockchainMarket);
        
      } catch (error) {
        errors.push({
          market_address: pubkey.toString(),
          error: error.message
        });
        console.error(`❌ Error processing ${pubkey.toString()}:`, error);
      }
    }
    
    // 4. Find database-only markets (not on blockchain)
    const blockchainAddresses = blockchainMarkets.map(m => m.market_address);
    const databaseOnlyMarkets = dbMarkets.filter(db => !blockchainAddresses.includes(db.market_address));
    
    // 5. Generate summary
    const summary = {
      total_blockchain_markets: blockchainMarkets.length,
      total_database_markets: dbMarkets.length,
      database_only_markets: databaseOnlyMarkets.length,
      blockchain_resolved: blockchainMarkets.filter(m => m.blockchain_status === 'Resolved').length,
      blockchain_active: blockchainMarkets.filter(m => m.blockchain_status === 'Active').length,
      status_mismatches: blockchainMarkets.filter(m => m.status_mismatch).length,
      needs_sync: blockchainMarkets.filter(m => m.needs_sync).length,
      errors: errors.length
    };
    
    console.log('📈 Blockchain Markets Audit Summary:', summary);
    
    res.json({
      success: true,
      network: NETWORK,
      program_id: PROGRAM_ID,
      summary,
      blockchain_markets: blockchainMarkets,
      database_only_markets: databaseOnlyMarkets.map(m => ({
        market_address: m.market_address,
        question: m.question?.substring(0, 100),
        status: m.status,
        resolved_option: m.resolved_option
      })),
      errors,
      recommendations: {
        resolved_markets_to_sync: blockchainMarkets.filter(m => m.needs_sync),
        database_cleanup_candidates: databaseOnlyMarkets.filter(m => m.status === 'Active')
      }
    });
    
  } catch (error) {
    console.error('❌ Error in blockchain markets audit:', error);
    res.status(500).json({ 
      error: 'Failed to audit blockchain markets',
      details: error.message 
    });
  }
});

// Batch sync all resolved markets from blockchain to database
router.post('/batch-sync-resolved-markets', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting batch sync of resolved markets...');
    
    // Import the live market sync service
    const liveMarketSync = require('../services/liveMarketSyncService');
    
    // First, run the audit to find markets that need syncing
    const { Connection, PublicKey } = require('@solana/web3.js');
    
    // Get network config
    const NETWORK = process.env.VITE_SOLANA_NETWORK || process.env.SOLANA_NETWORK || 'mainnet';
    const NETWORK_CONFIG = {
      devnet: {
        programId: "F3cFKHXtoYeTnKE6hd7iy21oAZFGyz7dm2WQKS31M46Y",
        rpcUrl: "https://api.devnet.solana.com"
      },
      mainnet: {
        programId: "APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS", 
        rpcUrl: process.env.SOLANA_RPC_URL || "https://solana-mainnet.g.alchemy.com/v2/LB4s_CFb80irvbKFWL6qN"
      }
    };
    
    const config = NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG['mainnet'];
    const PROGRAM_ID = config.programId;
    
    if (!PROGRAM_ID) {
      return res.status(500).json({ 
        error: 'Program ID not configured for network',
        network: NETWORK
      });
    }
    
    const connection = new Connection(config.rpcUrl, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    
    // Get all blockchain markets
    console.log('🔎 Finding markets that need syncing...');
    const marketAccounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 1000 // Approximate market account size
        }
      ]
    });
    
    // Get database markets
    const dbQuery = `SELECT market_address, question, status FROM markets`;
    const dbResult = await db.query(dbQuery);
    const dbMarkets = dbResult.rows;
    
    // Find markets that are resolved on blockchain but active in database
    const marketsToSync = [];
    const errors = [];
    
    for (const { pubkey, account } of marketAccounts) {
      try {
        const marketAddress = pubkey.toString();
        const marketData = liveMarketSync.deserializeMarketAccount(account.data);
        const dbMatch = dbMarkets.find(m => m.market_address === marketAddress);
        
        // Check if this market needs syncing
        if (dbMatch && marketData.status === 'Resolved' && dbMatch.status !== 'Resolved') {
          marketsToSync.push({
            market_address: marketAddress,
            blockchain_status: marketData.status,
            database_status: dbMatch.status,
            blockchain_winning_option: marketData.winningOption,
            question: marketData.question?.substring(0, 100)
          });
        }
      } catch (error) {
        console.error(`❌ Error checking market ${pubkey.toString()}:`, error);
        errors.push({
          market_address: pubkey.toString(),
          error: error.message
        });
      }
    }
    
    console.log(`🎯 Found ${marketsToSync.length} markets that need syncing`);
    
    if (marketsToSync.length === 0) {
      return res.json({
        success: true,
        message: 'No markets need syncing - all are already in sync!',
        markets_checked: marketAccounts.length,
        database_markets: dbMarkets.length,
        already_synced: 0,
        errors: errors.length
      });
    }
    
    // Sync each market
    const syncResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const market of marketsToSync) {
      try {
        console.log(`🔄 Syncing ${market.market_address}...`);
        
        const syncResult = await liveMarketSync.syncMarketResolutionStatus(market.market_address);
        
        if (syncResult.success && syncResult.wasResolved) {
          successCount++;
          console.log(`✅ Successfully synced ${market.market_address}`);
          syncResults.push({
            market_address: market.market_address,
            question: market.question,
            status: 'success',
            winning_option: syncResult.winningOption,
            message: 'Synced successfully'
          });
        } else {
          errorCount++;
          console.error(`❌ Failed to sync ${market.market_address}:`, syncResult.error);
          syncResults.push({
            market_address: market.market_address,
            question: market.question,
            status: 'error',
            error: syncResult.error || 'Unknown error',
            message: 'Sync failed'
          });
        }
        
        // Add a small delay to avoid overwhelming the RPC
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Exception syncing ${market.market_address}:`, error);
        syncResults.push({
          market_address: market.market_address,
          question: market.question,
          status: 'error',
          error: error.message,
          message: 'Exception during sync'
        });
      }
    }
    
    console.log(`🎯 Batch sync completed: ${successCount} successful, ${errorCount} errors`);
    
    res.json({
      success: true,
      message: `Batch sync completed: ${successCount} markets synced successfully`,
      network: NETWORK,
      summary: {
        total_found: marketsToSync.length,
        successful_syncs: successCount,
        failed_syncs: errorCount,
        processing_errors: errors.length
      },
      sync_results: syncResults,
      processing_errors: errors
    });
    
  } catch (error) {
    console.error('❌ Error in batch sync:', error);
    res.status(500).json({ 
      error: 'Failed to batch sync resolved markets',
      details: error.message 
    });
  }
});

// Reset incorrectly claimed prediction (for emergency use when claims failed but were marked as claimed)
router.post('/reset-claim/:predictionId', async (req, res) => {
  try {
    console.log('🔧 ADMIN: Resetting claim status for prediction:', req.params.predictionId);
    
    const { predictionId } = req.params;
    const { reason } = req.body;

    // Verify the prediction exists and get details
    const checkQuery = `
      SELECT p.*, m.question, m.status, m.resolved_option, m.market_address
      FROM predictions p
      JOIN markets m ON p.market_address = m.market_address
      WHERE p.id = $1
    `;

    const checkResult = await db.query(checkQuery, [predictionId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const prediction = checkResult.rows[0];

    // Log the reset action
    console.log('🔧 Resetting claim for prediction:', {
      id: predictionId,
      user: prediction.user_address,
      market: prediction.question,
      amount: prediction.amount,
      claimed: prediction.claimed,
      payout: prediction.payout,
      reason: reason || 'Admin reset - claim failed but marked as claimed'
    });

    // Reset the claim status
    const resetQuery = `
      UPDATE predictions
      SET 
        claimed = false,
        claim_timestamp = NULL,
        payout = 0
      WHERE id = $1
      RETURNING *
    `;

    const resetResult = await db.query(resetQuery, [predictionId]);

    // Log the reset action in database (create admin_actions table if it doesn't exist)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id SERIAL PRIMARY KEY,
          action_type VARCHAR(50) NOT NULL,
          target_type VARCHAR(50) NOT NULL,
          target_id VARCHAR(100) NOT NULL,
          admin_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `);

      await db.query(`
        INSERT INTO admin_actions (action_type, target_type, target_id, admin_note, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'RESET_CLAIM',
        'prediction', 
        predictionId,
        reason || 'Admin reset - claim failed but marked as claimed',
        JSON.stringify({
          user_address: prediction.user_address,
          market_address: prediction.market_address,
          original_payout: prediction.payout,
          reset_timestamp: new Date().toISOString()
        })
      ]);
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    console.log('✅ Successfully reset claim status for prediction:', predictionId);

    res.json({
      success: true,
      message: 'Claim status reset successfully',
      prediction: resetResult.rows[0],
      action: {
        type: 'RESET_CLAIM',
        reason: reason || 'Admin reset - claim failed but marked as claimed',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error resetting claim status:', error);
    res.status(500).json({ error: 'Failed to reset claim status' });
  }
});

// Admin health check endpoint
router.get('/health', authenticateAdmin, (req, res) => {
  res.json({
    status: 'healthy',
    admin: req.adminWallet,
    timestamp: new Date().toISOString(),
    permissions: ['admin_access']
  });
});

// GET /admin/pending-crypto-markets - Get markets awaiting approval
router.get('/pending-crypto-markets', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!isAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if table exists first
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pending_crypto_markets'
      );
    `;
    
    const tableExists = await db.query(tableExistsQuery);
    
    if (!tableExists.rows[0].exists) {
      return res.json({
        success: true,
        markets: [],
        counts: { pending: 0, approved: 0, deployed: 0, rejected: 0 },
        message: 'Oracle table not found - run migration to enable approval workflow'
      });
    }

    const query = `
      SELECT 
        id, crypto_symbol, crypto_name, current_price, change_24h, volume_24h,
        opportunity_score, price_ranges, market_question, market_description,
        reasons, status, created_by, reviewed_by, review_notes,
        deployed_market_address, deployed_transaction_signature,
        created_at, updated_at, reviewed_at, deployed_at
      FROM pending_crypto_markets
      ORDER BY 
        CASE status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'deployed' THEN 3 
          WHEN 'rejected' THEN 4 
        END,
        created_at DESC
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      markets: result.rows,
      counts: {
        pending: result.rows.filter(m => m.status === 'pending').length,
        approved: result.rows.filter(m => m.status === 'approved').length,
        deployed: result.rows.filter(m => m.status === 'deployed').length,
        rejected: result.rows.filter(m => m.status === 'rejected').length
      }
    });

  } catch (error) {
    console.error('Error fetching pending crypto markets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending crypto markets',
      details: error.message 
    });
  }
});

// POST /admin/run-crypto-oracle - Manually trigger oracle scan
router.post('/run-crypto-oracle', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!isAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Dynamic import to avoid startup issues
    const DailyCryptoOracle = require('../services/dailyCryptoOracle');
    const oracle = new DailyCryptoOracle();
    
    const result = await oracle.runDailyOracle();
    
    res.json(result);

  } catch (error) {
    console.error('Error running crypto oracle:', error);
    res.status(500).json({ 
      error: 'Failed to run crypto oracle',
      details: error.message 
    });
  }
});

// POST /admin/deploy-crypto-market/:marketId - Approve and deploy market
router.post('/deploy-crypto-market/:marketId', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const { marketId } = req.params;
    
    if (!isAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get pending market details
    const marketQuery = 'SELECT * FROM pending_crypto_markets WHERE id = $1 AND status = $2';
    const marketResult = await db.query(marketQuery, [marketId, 'pending']);
    
    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending market not found' });
    }

    const pendingMarket = marketResult.rows[0];

    // Create on-chain market using DailyCryptoPredictionsService
    const DailyCryptoPredictionsService = require('../services/dailyCryptoPredictions');
    const cryptoService = new DailyCryptoPredictionsService();

    // Initialize service
    await cryptoService.initialize();

    // Create market data structure
    const marketData = {
      symbol: pendingMarket.crypto_symbol,
      name: pendingMarket.crypto_name,
      current_price: parseFloat(pendingMarket.current_price)
    };

    // Create on-chain market
    const onChainMarket = await cryptoService.createDailyMarket(marketData, marketData.current_price);

    // Update pending market status
    const updateQuery = `
      UPDATE pending_crypto_markets 
      SET 
        status = 'deployed',
        reviewed_by = $1,
        deployed_market_address = $2,
        deployed_transaction_signature = $3,
        reviewed_at = CURRENT_TIMESTAMP,
        deployed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    await db.query(updateQuery, [
      walletAddress,
      onChainMarket.market_address,
      onChainMarket.transaction_signature,
      marketId
    ]);

    res.json({
      success: true,
      message: `${pendingMarket.crypto_symbol} market deployed successfully`,
      market_address: onChainMarket.market_address,
      transaction_signature: onChainMarket.transaction_signature
    });

  } catch (error) {
    console.error('Error deploying crypto market:', error);
    res.status(500).json({ 
      error: 'Failed to deploy crypto market',
      details: error.message 
    });
  }
});

// POST /admin/reject-crypto-market/:marketId - Reject market opportunity
router.post('/reject-crypto-market/:marketId', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const { marketId } = req.params;
    const { reason } = req.body;
    
    if (!isAuthorized(walletAddress)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateQuery = `
      UPDATE pending_crypto_markets 
      SET 
        status = 'rejected',
        reviewed_by = $1,
        review_notes = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING crypto_symbol
    `;

    const result = await db.query(updateQuery, [walletAddress, reason || 'No reason provided', marketId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending market not found' });
    }

    res.json({
      success: true,
      message: `${result.rows[0].crypto_symbol} market rejected`,
      reason
    });

  } catch (error) {
    console.error('Error rejecting crypto market:', error);
    res.status(500).json({ 
      error: 'Failed to reject crypto market',
      details: error.message 
    });
  }
});

module.exports = router; 