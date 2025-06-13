const express = require('express');
const router = express.Router();
const db = require('../config/database');
const supabase = require('../config/supabase');
const liveMarketSync = require('../services/liveMarketSyncService');

// GET /api/markets/check-duplicate - Check if a market already exists
router.get('/check-duplicate', async (req, res) => {
  try {
    const { question, tournament_id } = req.query;
    
    if (!question) {
      return res.status(400).json({ error: 'Question parameter is required' });
    }
    
    console.log(`🔍 Checking for duplicate market: "${question}"${tournament_id ? ` in tournament ${tournament_id}` : ''}`);
    
    let query;
    let params;
    
    if (tournament_id) {
      query = `
        SELECT market_address, question, created_at, status, tournament_id
        FROM markets 
        WHERE question = $1 
          AND tournament_id = $2
          AND status != 'Resolved'
        LIMIT 1
      `;
      params = [question, tournament_id];
    } else {
      query = `
        SELECT market_address, question, created_at, status, tournament_id
        FROM markets 
        WHERE question = $1 
          AND category = 'Sports'
          AND status != 'Resolved'
        LIMIT 1
      `;
      params = [question];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length > 0) {
      console.log(`✅ Found existing market for "${question}"`);
      return res.json({
        exists: true,
        market: result.rows[0]
      });
    }
    
    console.log(`❌ No duplicate found for "${question}"`);
    return res.json({
      exists: false
    });
    
  } catch (error) {
    console.error('Error checking for duplicate market:', error);
    res.status(500).json({ error: 'Failed to check for duplicate' });
  }
});

// GET /api/markets - Fetch all markets with enhanced data including assets
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Fetching markets using Supabase...');
    
    const { data: result, error } = await supabase
      .from('markets')
      .select(`
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        min_bet,
        resolved_option,
        options,
        option_volumes,
        total_volume,
        poly_id,
        apechain_market_id,
        market_type,
        options_metadata,
        assets,
        is_trending,
        participant_count,
        tournament_id,
        tournament_type,
        created_at,
        updated_at
      `)
      .not('market_address', 'like', 'test-market%')  // Filter out test markets
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log(`📊 Found ${result.length} markets in database`);
    
    // If no markets found, return empty array with helpful message
    if (result.length === 0) {
      console.log('📭 No active markets found in database - database may be cleared for mainnet');
      console.log('🔗 Frontend will fallback to live blockchain data or show empty state');
      return res.json([]);
    }
    
    // Check if blockchain resolution checking is requested
    const shouldCheckBlockchain = req.query.check_blockchain === 'true' || 
                                  req.query.include_resolved === 'true';
    
    console.log(`📊 Processing ${result.length} markets${shouldCheckBlockchain ? ' with blockchain resolution checking' : ' (blockchain checks skipped for performance)'}`);
    
    // Transform the data to include calculated fields and real-time blockchain resolution status
    const markets = await Promise.all(result.map(async (market) => {
      // Calculate option percentages
      const optionPercentages = [];
      if (market.total_volume > 0 && market.option_volumes) {
        market.option_volumes.forEach(volume => {
          optionPercentages.push((volume / market.total_volume) * 100);
        });
      } else {
        // Default to even split if no volume
        market.options.forEach(() => optionPercentages.push(50));
      }

      // 🔴 OPTIMIZED: Make blockchain resolution checking optional and non-blocking
      let blockchainResolution = null;
      
      // Only check blockchain resolution for specific cases, not all markets
      if (shouldCheckBlockchain) {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Blockchain check timeout')), 3000)
          );
          
          blockchainResolution = await Promise.race([
            liveMarketSync.syncMarketResolutionStatus(market.market_address),
            timeoutPromise
          ]);
          
          if (blockchainResolution && blockchainResolution.success && blockchainResolution.wasResolved) {
            console.log(`🏆 Market ${market.market_address} is RESOLVED on blockchain:`, {
              winner: blockchainResolution.winningOption,
              question: market.question?.substring(0, 50)
            });
          }
        } catch (blockchainError) {
          // Silently skip blockchain check on error/timeout
          console.log(`⚠️ Skipping blockchain check for ${market.market_address}: ${blockchainError.message}`);
          blockchainResolution = null;
        }
      }

      // Use blockchain data if available, otherwise use database data
      const actualStatus = (blockchainResolution?.wasResolved && blockchainResolution?.newStatus) 
        ? blockchainResolution.newStatus 
        : market.status;
      
      const actualResolvedOption = (blockchainResolution?.wasResolved && blockchainResolution?.winningOption !== undefined)
        ? blockchainResolution.winningOption
        : market.resolved_option;

      // Parse assets and options_metadata properly
      let parsedAssets = {};
      let parsedOptionsMetadata = [];
      
      try {
        if (market.assets) {
          parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
        }
      } catch (e) {
        console.error('Error parsing assets for market:', market.market_address, e);
        parsedAssets = {};
      }
      
      try {
        if (market.options_metadata) {
          parsedOptionsMetadata = typeof market.options_metadata === 'string' ? JSON.parse(market.options_metadata) : market.options_metadata;
        }
      } catch (e) {
        console.error('Error parsing options_metadata for market:', market.market_address, e);
        parsedOptionsMetadata = [];
      }

      // Determine dynamic banner icon based on market status
      let dynamicIcon = parsedAssets.icon; // Default to current icon
      
      if (market.status === 'Resolved' && market.resolved_option !== null && parsedOptionsMetadata.length > 0) {
        // For resolved markets: Show winning option's icon
        const winningOptionMeta = parsedOptionsMetadata[market.resolved_option];
        if (winningOptionMeta && winningOptionMeta.icon) {
          dynamicIcon = winningOptionMeta.icon;
          console.log(`🏆 Resolved market ${market.market_address}: Using winning option icon`);
        }
      } else if (market.status === 'Active' && optionPercentages.length > 0 && parsedOptionsMetadata.length > 0) {
        // For active markets: Show leading option's icon
        const leadingOptionIndex = optionPercentages.indexOf(Math.max(...optionPercentages));
        const leadingOptionMeta = parsedOptionsMetadata[leadingOptionIndex];
        if (leadingOptionMeta && leadingOptionMeta.icon) {
          dynamicIcon = leadingOptionMeta.icon;
          console.log(`📊 Active market ${market.market_address}: Using leading option (${market.options[leadingOptionIndex]}) icon`);
        }
      }
      
      // Update assets with dynamic icon
      const finalAssets = {
        ...parsedAssets,
        icon: dynamicIcon,
        banner: parsedAssets.banner // Keep original banner
      };

      const transformedMarket = {
        ...market,
        // Override with live blockchain resolution data if available
        status: actualStatus,
        resolved_option: actualResolvedOption,
        
        publicKey: market.market_address,
        endTime: market.resolution_date,
        winningOption: actualResolvedOption,
        optionPools: market.option_volumes || [],
        optionPercentages,
        optionProbabilities: optionPercentages, // For backwards compatibility
        assets: finalAssets, // Use updated assets with dynamic icon
        options_metadata: parsedOptionsMetadata,
        
        // Add missing volume field that frontend expects
        totalVolume: parseFloat(market.total_volume || 0),
        // Add other missing fields
        optionCount: market.options?.length || 0,
        participantCount: parseInt(market.participant_count || 0), // Use actual participant count from DB
        minBetAmount: parseFloat(market.min_bet || 10),
        creatorFeeRate: 2.5, // Default fee rate
        resolutionDate: market.resolution_date,
        creator: market.creator || 'Unknown',
        // Add Polymarket specific fields
        polyId: market.poly_id,
        apechainMarketId: market.apechain_market_id,
        
        // Add tournament fields
        tournament_id: market.tournament_id,
        tournament_type: market.tournament_type || 'league', // Default to 'league' if not set
        
        // 🔴 OPTIMIZED: Add blockchain resolution indicators (only when checked)
        isBlockchainResolved: blockchainResolution?.wasResolved || false,
        blockchainStatus: blockchainResolution?.newStatus || actualStatus,
        dataSource: blockchainResolution?.wasResolved ? 'live_blockchain_resolution' : 'database',
        lastResolutionCheck: shouldCheckBlockchain ? new Date().toISOString() : null,
        blockchainCheckSkipped: !shouldCheckBlockchain
      };

      // Log first market for debugging
      if (result.indexOf(market) === 0) {
        console.log('📋 First market data (with blockchain resolution check):', {
          question: market.question?.substring(0, 50),
          database_status: market.status,
          blockchain_status: actualStatus,
          resolved_option: actualResolvedOption,
          is_blockchain_resolved: blockchainResolution?.wasResolved || false,
          poly_id: market.poly_id,
          market_address: market.market_address,
          total_volume: market.total_volume,
          participant_count: market.participant_count,
          assets: Object.keys(parsedAssets),
          options_count: market.options?.length
        });
      }

      return transformedMarket;
    }));

    // Filter out resolved markets from the main active list if they're actually resolved
    const activeMarkets = markets.filter(market => market.status === 'Active' || market.status === 'active');
    const resolvedMarkets = markets.filter(market => market.status === 'Resolved' || market.status === 'resolved');
    
    console.log(`📊 Market breakdown: ${activeMarkets.length} active, ${resolvedMarkets.length} resolved`);
    console.log(`✅ Processed ${markets.length} markets${shouldCheckBlockchain ? ' with blockchain resolution checking' : ' (blockchain checks skipped for performance)'}`);

    // Return only active markets for the main endpoint (or include resolved based on query param)
    const includeResolved = req.query.include_resolved === 'true';
    const finalMarkets = includeResolved ? markets : activeMarkets;

    res.json(finalMarkets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    
    // If participant_count column doesn't exist, try without it
    if (error.message && error.message.includes('participant_count')) {
      console.log('⚠️  participant_count column missing, falling back to query without it');
      
      try {
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('markets')
          .select(`
            market_address,
            creator,
            question,
            description,
            category,
            resolution_date,
            status,
            min_bet,
            resolved_option,
            options,
            option_volumes,
            total_volume,
            poly_id,
            apechain_market_id,
            market_type,
            options_metadata,
            assets,
            is_trending,
            tournament_id,
            tournament_type,
            created_at,
            updated_at
          `)
          .eq('status', 'Active')
          .not('market_address', 'like', 'test-market%')  // Filter out test markets
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        console.log(`📊 Fallback query found ${fallbackResult.length} markets`);
        
        // Transform the data with participantCount defaulted to 0
        const markets = fallbackResult.map(market => {
          // Improved percentage calculation with better fallback logic
          const optionPercentages = [];
          
          if (market.option_volumes && market.option_volumes.length > 0) {
            // Try to calculate from option volumes first
            const volumeSum = market.option_volumes.reduce((sum, vol) => sum + parseFloat(vol || 0), 0);
            
            if (volumeSum > 0) {
              // Calculate from actual volumes
              market.option_volumes.forEach(volume => {
                optionPercentages.push((parseFloat(volume || 0) / volumeSum) * 100);
              });
            } else {
              // If volumes are all zero, distribute equally
              market.option_volumes.forEach(() => {
                optionPercentages.push(100 / market.option_volumes.length);
              });
            }
          } else if (market.options && market.options.length > 0) {
            // Fallback to equal distribution based on number of options
            market.options.forEach(() => {
              optionPercentages.push(100 / market.options.length);
            });
          }

          let parsedAssets = {};
          let parsedOptionsMetadata = [];
          
          try {
            if (market.assets) {
              parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
            }
          } catch (e) {
            parsedAssets = {};
          }
          
          try {
            if (market.options_metadata) {
              parsedOptionsMetadata = typeof market.options_metadata === 'string' ? JSON.parse(market.options_metadata) : market.options_metadata;
            }
          } catch (e) {
            parsedOptionsMetadata = [];
          }

          return {
            ...market,
            publicKey: market.market_address,
            endTime: market.resolution_date,
            winningOption: market.resolved_option,
            optionPools: market.option_volumes || [],
            optionPercentages,
            optionProbabilities: optionPercentages,
            assets: parsedAssets,
            options_metadata: parsedOptionsMetadata,
            totalVolume: parseFloat(market.total_volume || 0),
            optionCount: market.options?.length || 0,
            participantCount: 0, // Default to 0 when column doesn't exist
            minBetAmount: parseFloat(market.min_bet || 10),
            creatorFeeRate: 2.5,
            resolutionDate: market.resolution_date,
            creator: market.creator || 'Unknown',
            polyId: market.poly_id,
            apechainMarketId: market.apechain_market_id,
            tournament_id: market.tournament_id,
            tournament_type: market.tournament_type || 'league'
          };
        });
        
        res.json(markets);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        res.status(500).json({ error: 'Failed to fetch markets' });
      }
    } else {
    res.status(500).json({ error: 'Failed to fetch markets' });
    }
  }
});

// GET /api/markets/resolved - Fetch all resolved markets with winners
router.get('/resolved', async (req, res) => {
  try {
    console.log('🏆 Fetching resolved markets with blockchain verification...');
    
    const query = `
      SELECT 
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        min_bet,
        resolved_option,
        options,
        option_volumes,
        total_volume,
        poly_id,
        apechain_market_id,
        market_type,
        options_metadata,
        assets,
        is_trending,
        participant_count,
        tournament_id,
        tournament_type,
        created_at,
        updated_at
      FROM markets 
      WHERE status = 'Resolved'
      ORDER BY updated_at DESC
    `;

    const result = await db.query(query);
    
    console.log(`📊 Found ${result.rows.length} resolved markets in database`);
    
    // Transform resolved markets data
    const resolvedMarkets = result.rows.map(market => {
      // Calculate option percentages with improved logic
      const optionPercentages = [];
      
      if (market.option_volumes && market.option_volumes.length > 0) {
        // Try to calculate from option volumes first
        const volumeSum = market.option_volumes.reduce((sum, vol) => sum + parseFloat(vol || 0), 0);
        
        if (volumeSum > 0) {
          // Calculate from actual volumes
          market.option_volumes.forEach(volume => {
            optionPercentages.push((parseFloat(volume || 0) / volumeSum) * 100);
          });
        } else {
          // If volumes are all zero, distribute equally
          market.option_volumes.forEach(() => {
            optionPercentages.push(100 / market.option_volumes.length);
          });
        }
      } else if (market.options && market.options.length > 0) {
        // Fallback to equal distribution based on number of options
        market.options.forEach(() => {
          optionPercentages.push(100 / market.options.length);
        });
      }

      // Parse assets and options_metadata
      let parsedAssets = {};
      let parsedOptionsMetadata = [];
      
      try {
        if (market.assets) {
          parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
        }
      } catch (e) {
        parsedAssets = {};
      }
      
      try {
        if (market.options_metadata) {
          parsedOptionsMetadata = typeof market.options_metadata === 'string' ? JSON.parse(market.options_metadata) : market.options_metadata;
        }
      } catch (e) {
        parsedOptionsMetadata = [];
      }

      // Get winning option details
      const winnerName = market.resolved_option !== null && market.resolved_option !== undefined
        ? market.options[market.resolved_option] || `Option ${market.resolved_option}`
        : 'Unknown';

      // Use winning option's icon for resolved markets
      let winnerIcon = parsedAssets.icon;
      if (market.resolved_option !== null && parsedOptionsMetadata[market.resolved_option]) {
        winnerIcon = parsedOptionsMetadata[market.resolved_option].icon || winnerIcon;
      }

      const resolvedMarket = {
        ...market,
        status: 'Resolved',
        publicKey: market.market_address,
        endTime: market.resolution_date,
        winningOption: market.resolved_option,
        winnerName,
        winnerIcon,
        optionPools: market.option_volumes || [],
        optionPercentages,
        totalVolume: parseFloat(market.total_volume || 0),
        optionCount: market.options?.length || 0,
        participantCount: parseInt(market.participant_count || 0),
        assets: {
          ...parsedAssets,
          icon: winnerIcon, // Show winner's icon
          banner: parsedAssets.banner
        },
        options_metadata: parsedOptionsMetadata,
        
        // Resolution metadata
        resolutionSource: 'database',
        lastResolutionCheck: new Date().toISOString(),
        resolvedAt: market.updated_at,
        
        // Additional fields
        minBetAmount: parseFloat(market.min_bet || 10),
        creatorFeeRate: 2.5,
        resolutionDate: market.resolution_date,
        creator: market.creator || 'Unknown',
        polyId: market.poly_id,
        apechainMarketId: market.apechain_market_id,
        
        // Tournament fields
        tournament_id: market.tournament_id,
        tournament_type: market.tournament_type || 'league'
      };

      console.log(`🏆 Resolved market: ${market.question?.substring(0, 50)} - Winner: ${winnerName} (Option ${market.resolved_option})`);
      return resolvedMarket;
    });
    
    console.log(`✅ Returning ${resolvedMarkets.length} resolved markets`);
    
    res.json({
      success: true,
      total: resolvedMarkets.length,
      markets: resolvedMarkets,
      summary: {
        totalResolved: resolvedMarkets.length,
        blockchainVerified: 0, // We'll enhance this later
        databaseOnly: resolvedMarkets.length
      },
      lastChecked: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching resolved markets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch resolved markets',
      details: error.message 
    });
  }
});

// POST /api/markets/sync-resolution/:address - Sync resolution status for specific market
router.post('/sync-resolution/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`🔍 Resolution sync requested for market: ${address}`);
    
    // Check and sync resolution status from blockchain
    const result = await liveMarketSync.syncMarketResolutionStatus(address);
    
    if (result.success) {
      if (result.wasResolved && result.updatedInDatabase) {
        console.log(`✅ Market ${address} was resolved and database updated`);
        res.json({
          success: true,
          message: 'Market resolution status updated successfully',
          marketAddress: address,
          wasResolved: true,
          winningOption: result.winningOption,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus
        });
      } else if (result.wasResolved && !result.updatedInDatabase) {
        console.log(`⚠️ Market ${address} is resolved but database update failed`);
        res.json({
          success: false,
          message: 'Market is resolved on blockchain but database update failed',
          marketAddress: address,
          wasResolved: true,
          winningOption: result.winningOption,
          error: result.error
        });
      } else {
        console.log(`📊 Market ${address} is still active on blockchain`);
        res.json({
          success: true,
          message: 'Market is still active on blockchain',
          marketAddress: address,
          wasResolved: false,
          currentStatus: result.currentStatus
        });
      }
    } else {
      console.error(`❌ Error syncing resolution for ${address}:`, result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync resolution status',
        details: result.error,
        marketAddress: address
      });
    }
    
  } catch (error) {
    console.error('Error in sync-resolution endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during resolution sync',
      details: error.message 
    });
  }
});

// GET /api/markets/resolution-status/:address - Check resolution status without updating
router.get('/resolution-status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`👀 Checking resolution status for market: ${address}`);
    
    // Get current database status
    const dbQuery = `
      SELECT market_address, status, resolved_option, question 
      FROM markets 
      WHERE market_address = $1
    `;
    
    const dbResult = await db.query(dbQuery, [address]);
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found in database' });
    }
    
    const dbMarket = dbResult.rows[0];
    
    // Get live blockchain status (read-only check)
    try {
      const liveData = await liveMarketSync.getLiveMarketData(address);
      
      const statusMismatch = dbMarket.status !== liveData.status;
      
      res.json({
        success: true,
        marketAddress: address,
        database: {
          status: dbMarket.status,
          resolvedOption: dbMarket.resolved_option,
          question: dbMarket.question
        },
        blockchain: {
          status: liveData.status || 'Unknown',
          winningOption: liveData.winningOption || null
        },
        statusMismatch,
        needsSync: statusMismatch,
        recommendations: statusMismatch ? [
          'Status mismatch detected between database and blockchain',
          `Use POST /api/markets/sync-resolution/${address} to sync the status`
        ] : [
          'Database and blockchain status are in sync'
        ]
      });
    } catch (blockchainError) {
      console.warn('Could not fetch blockchain status:', blockchainError.message);
      res.json({
        success: true,
        marketAddress: address,
        database: {
          status: dbMarket.status,
          resolvedOption: dbMarket.resolved_option,
          question: dbMarket.question
        },
        blockchain: {
          status: 'Error fetching from blockchain',
          error: blockchainError.message
        },
        statusMismatch: 'Unknown',
        needsSync: 'Recommended'
      });
    }
    
  } catch (error) {
    console.error('Error checking resolution status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check resolution status',
      details: error.message 
    });
  }
});

// GET /api/markets/:address - Get single market with assets
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const { data: result, error } = await supabase
      .from('markets')
      .select(`
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        min_bet,
        resolved_option,
        options,
        option_volumes,
        total_volume,
        poly_id,
        apechain_market_id,
        market_type,
        options_metadata,
        assets,
        is_trending,
        created_at,
        tournament_id,
        tournament_type
      `)
      .eq('market_address', address)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ Error fetching market:', error);
      throw error;
    }
    
    if (!result) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const market = result;
    
    // Calculate option percentages with improved logic
    const optionPercentages = [];
    
    if (market.option_volumes && market.option_volumes.length > 0) {
      // Try to calculate from option volumes first
      const volumeSum = market.option_volumes.reduce((sum, vol) => sum + parseFloat(vol || 0), 0);
      
      if (volumeSum > 0) {
        // Calculate from actual volumes
        market.option_volumes.forEach(volume => {
          optionPercentages.push((parseFloat(volume || 0) / volumeSum) * 100);
        });
      } else {
        // If volumes are all zero, distribute equally
        market.option_volumes.forEach(() => {
          optionPercentages.push(100 / market.option_volumes.length);
        });
      }
    } else if (market.options && market.options.length > 0) {
      // Fallback to equal distribution based on number of options
      market.options.forEach(() => {
        optionPercentages.push(100 / market.options.length);
      });
    }

    // Parse assets and options_metadata properly
    let parsedAssets = {};
    let parsedOptionsMetadata = [];
    
    try {
      if (market.assets) {
        parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
      }
    } catch (e) {
      console.error('Error parsing assets for market:', market.market_address, e);
      parsedAssets = {};
    }
    
    try {
      if (market.options_metadata) {
        parsedOptionsMetadata = typeof market.options_metadata === 'string' ? JSON.parse(market.options_metadata) : market.options_metadata;
      }
    } catch (e) {
      console.error('Error parsing options_metadata for market:', market.market_address, e);
      parsedOptionsMetadata = [];
    }

    // Determine dynamic banner icon based on market status
    let dynamicIcon = parsedAssets.icon; // Default to current icon
    
    if (market.status === 'Resolved' && market.resolved_option !== null && parsedOptionsMetadata.length > 0) {
      // For resolved markets: Show winning option's icon
      const winningOptionMeta = parsedOptionsMetadata[market.resolved_option];
      if (winningOptionMeta && winningOptionMeta.icon) {
        dynamicIcon = winningOptionMeta.icon;
        console.log(`🏆 Resolved market ${market.market_address}: Using winning option icon`);
      }
    } else if (market.status === 'Active' && optionPercentages.length > 0 && parsedOptionsMetadata.length > 0) {
      // For active markets: Show leading option's icon
      const leadingOptionIndex = optionPercentages.indexOf(Math.max(...optionPercentages));
      const leadingOptionMeta = parsedOptionsMetadata[leadingOptionIndex];
      if (leadingOptionMeta && leadingOptionMeta.icon) {
        dynamicIcon = leadingOptionMeta.icon;
        console.log(`📊 Active market ${market.market_address}: Using leading option (${market.options[leadingOptionIndex]}) icon`);
      }
    }
    
    // Update assets with dynamic icon
    const finalAssets = {
      ...parsedAssets,
      icon: dynamicIcon,
      banner: parsedAssets.banner // Keep original banner
    };

    const transformedMarket = {
      ...market,
      publicKey: market.market_address,
      endTime: market.resolution_date,
      winningOption: market.resolved_option,
      optionPools: market.option_volumes || [],
      optionPercentages,
      optionProbabilities: optionPercentages,
      assets: finalAssets,
      options_metadata: parsedOptionsMetadata,
      // Add missing fields that frontend expects
      totalVolume: parseFloat(market.total_volume || 0),
      optionCount: market.options?.length || 0,
      participantCount: 0, // Default to 0, could be calculated from blockchain
      minBetAmount: parseFloat(market.min_bet || 10),
      creatorFeeRate: 2.5, // Default fee rate
      resolutionDate: market.resolution_date,
      creator: market.creator || 'Unknown',
      // Add Polymarket specific fields
      polyId: market.poly_id,
      apechainMarketId: market.apechain_market_id,
      tournament_id: market.tournament_id,
      tournament_type: market.tournament_type || 'league'
    };

    res.json(transformedMarket);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

// GET /api/markets/pending - Get markets pending creation from Polymarket
router.get('/sync/pending', async (req, res) => {
  try {
    const { data: result, error } = await supabase
      .from('market_metadata')
      .select('*')
      .eq('status', 'pending_creation')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching pending markets:', error);
      throw error;
    }
    
    res.json(result || []);
  } catch (error) {
    console.error('Error fetching pending markets:', error);
    res.status(500).json({ error: 'Failed to fetch pending markets' });
  }
});

// POST /api/markets/sync - Trigger manual sync from Polymarket
router.post('/sync', async (req, res) => {
  try {
    const polymarketSync = require('../services/polymarketSyncService');
    await polymarketSync.syncMarkets();
    res.json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error('Error during manual sync:', error);
    res.status(500).json({ error: 'Failed to sync markets' });
  }
});

// POST /api/markets/create-from-poly - Create market on Solana from Polymarket data
router.post('/create-from-poly/:polyId', async (req, res) => {
  try {
    const { polyId } = req.params;
    const { solanaMarketAddress } = req.body;
    
    if (!solanaMarketAddress) {
      return res.status(400).json({ error: 'Solana market address required' });
    }

    const polymarketSync = require('../services/polymarketSyncService');
    await polymarketSync.markMarketAsCreated(polyId, solanaMarketAddress);
    
    res.json({ message: 'Market created successfully' });
  } catch (error) {
    console.error('Error creating market from Polymarket:', error);
    res.status(500).json({ error: 'Failed to create market' });
  }
});

// GET /api/markets/cache
router.get('/cache', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('markets_cache')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching cached markets:', error);
    res.status(500).json({ error: 'Failed to fetch cached markets' });
  }
});

// Get market by poly_id
router.get('/by-poly-id/:polyId', async (req, res) => {
  try {
    const { polyId } = req.params;
    
    const { data, error } = await supabase
      .from('markets_cache')
      .select('*')
      .eq('poly_id', polyId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching market by poly_id:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

// POST /api/markets/sync-volumes - Sync market volumes from blockchain
router.post('/sync-volumes', async (req, res) => {
  try {
    const { marketAddress, optionPools, totalVolume, participantCount } = req.body;
    
    if (!marketAddress || !optionPools) {
      return res.status(400).json({ error: 'Market address and option pools required' });
    }
    
    console.log(`🔄 Syncing volumes for market ${marketAddress}:`, {
      optionPools,
      totalVolume,
      participantCount
    });
    
    // Update the market with the actual blockchain volumes and participant count
    const updateQuery = `
      UPDATE markets 
      SET 
        option_volumes = $1,
        total_volume = $2,
        participant_count = $3,
        updated_at = NOW()
      WHERE market_address = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      optionPools, // Array of volumes for each option
      totalVolume || optionPools.reduce((sum, vol) => sum + vol, 0),
      participantCount || 0,
      marketAddress
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    console.log(`✅ Successfully updated market ${marketAddress} with volumes:`, {
      total_volume: result.rows[0].total_volume,
      participant_count: result.rows[0].participant_count
    });
    
    res.json({ 
      success: true, 
      message: 'Market volumes and participant count updated successfully',
      market: result.rows[0]
    });
  } catch (error) {
    console.error('Error syncing market volumes:', error);
    res.status(500).json({ error: 'Failed to sync market volumes' });
  }
});

// GET /api/markets/debug/all - Debug endpoint to check all markets in database
router.get('/debug/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        market_address,
        question,
        category,
        status,
        options,
        poly_id,
        apechain_market_id,
        assets,
        options_metadata,
        created_at
      FROM markets 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    
    console.log(`🔍 DEBUG: Found ${result.rows.length} total markets in database`);
    
    // Transform data for debugging
    const markets = result.rows.map(market => {
      let parsedAssets = {};
      let parsedOptionsMetadata = [];
      
      try {
        if (market.assets) {
          parsedAssets = typeof market.assets === 'string' ? JSON.parse(market.assets) : market.assets;
        }
      } catch (e) {
        console.error('Error parsing assets:', e);
      }
      
      try {
        if (market.options_metadata) {
          parsedOptionsMetadata = typeof market.options_metadata === 'string' ? JSON.parse(market.options_metadata) : market.options_metadata;
        }
      } catch (e) {
        console.error('Error parsing options_metadata:', e);
      }
      
      return {
        market_address: market.market_address,
        question: market.question,
        category: market.category,
        status: market.status,
        options: market.options,
        poly_id: market.poly_id,
        apechain_market_id: market.apechain_market_id,
        assets: parsedAssets,
        options_metadata: parsedOptionsMetadata,
        created_at: market.created_at,
        has_assets: Object.keys(parsedAssets).length > 0,
        has_poly_id: !!market.poly_id
      };
    });
    
    res.json({ 
      total: markets.length,
      markets: markets,
      debug_info: {
        with_assets: markets.filter(m => m.has_assets).length,
        with_poly_id: markets.filter(m => m.has_poly_id).length,
        active: markets.filter(m => m.status === 'Active').length
      }
    });
  } catch (error) {
    console.error('Error fetching debug markets:', error);
    res.status(500).json({ error: 'Failed to fetch debug markets', details: error.message });
  }
});

// POST /api/markets/force-sync - Manually sync specific markets with test data  
router.post('/force-sync', async (req, res) => {
  try {
    console.log('🔧 Force syncing market data...');
    
    // Get all active markets
    const query = `
      SELECT market_address, question, total_volume, option_volumes
      FROM markets 
      WHERE status = 'Active'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await db.query(query);
    console.log(`Found ${result.rows.length} markets to sync`);
    
    let syncedCount = 0;
    
    for (const market of result.rows) {
      try {
        // Create realistic volume data based on current state or generate reasonable defaults
        let optionPools = market.option_volumes || [];
        let totalVolume = parseFloat(market.total_volume || 0);
        let participantCount = 0;
        
        // If market has no volume, generate some realistic test data
        if (totalVolume === 0 || !optionPools.length) {
          // Generate realistic volume for active markets (between 1000-5000 APES)
          totalVolume = Math.floor(Math.random() * 4000) + 1000;
          
          // For binary markets, split 60/40 or 70/30
          if (market.question.includes('Yes') || market.question.includes('No')) {
            const yesPercentage = 0.6 + Math.random() * 0.2; // 60-80%
            optionPools = [
              Math.floor(totalVolume * yesPercentage),
              Math.floor(totalVolume * (1 - yesPercentage))
            ];
          } else {
            // For other markets, create varied distribution
            const split1 = Math.random() * 0.6 + 0.2; // 20-80%
            const split2 = Math.random() * (1 - split1);
            optionPools = [
              Math.floor(totalVolume * split1),
              Math.floor(totalVolume * split2),
              Math.floor(totalVolume * (1 - split1 - split2))
            ];
          }
          
          // Generate participant count (5-25 participants per 1000 APES)
          participantCount = Math.floor((totalVolume / 1000) * (5 + Math.random() * 20));
        } else {
          // Use existing data and add some participants
          participantCount = Math.max(1, Math.floor(totalVolume / 100)); // 1 participant per 100 APES
        }
        
        // Update the market
        const updateQuery = `
          UPDATE markets 
          SET 
            option_volumes = $1,
            total_volume = $2,
            participant_count = $3,
            updated_at = NOW()
          WHERE market_address = $4
          RETURNING market_address, total_volume, participant_count
        `;
        
        const updateResult = await db.query(updateQuery, [
          optionPools,
          totalVolume,
          participantCount,
          market.market_address
        ]);
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Synced ${market.market_address}:`, {
            question: market.question?.substring(0, 40),
            totalVolume,
            participantCount,
            optionPools: optionPools.length
          });
          syncedCount++;
        }
        
      } catch (marketError) {
        console.error(`Error syncing market ${market.market_address}:`, marketError);
      }
    }
    
    console.log(`🎉 Force sync completed: ${syncedCount}/${result.rows.length} markets updated`);
    
    res.json({
      success: true,
      message: 'Markets force synced successfully',
      synced: syncedCount,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error in force sync:', error);
    res.status(500).json({ error: 'Failed to force sync markets' });
  }
});

// POST /api/markets/recount-participants - Properly count unique participants for all markets
router.post('/recount-participants', async (req, res) => {
  try {
    console.log('🔄 Recounting participants for all markets...');
    
    // Get all active markets
    const marketsQuery = `
      SELECT market_address, question 
      FROM markets 
      WHERE status = 'Active'
    `;
    
    const marketsResult = await db.query(marketsQuery);
    console.log(`Found ${marketsResult.rows.length} markets to recount`);
    
    let updatedCount = 0;
    
    for (const market of marketsResult.rows) {
      try {
        // Count unique participants for this market from prediction_history table
        const participantQuery = `
          SELECT COUNT(DISTINCT wallet_address) as unique_participants
          FROM prediction_history 
          WHERE market_pubkey = $1
        `;
        
        const participantResult = await db.query(participantQuery, [market.market_address]);
        const uniqueParticipants = parseInt(participantResult.rows[0]?.unique_participants || 0);
        
        // Update the market with correct participant count
        const updateQuery = `
          UPDATE markets 
          SET participant_count = $1, updated_at = NOW()
          WHERE market_address = $2
          RETURNING market_address, participant_count
        `;
        
        const updateResult = await db.query(updateQuery, [uniqueParticipants, market.market_address]);
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ ${market.market_address}: ${uniqueParticipants} unique participants`);
          updatedCount++;
        }
        
      } catch (marketError) {
        console.error(`Error recounting participants for ${market.market_address}:`, marketError);
      }
    }
    
    console.log(`🎉 Participant recount completed: ${updatedCount}/${marketsResult.rows.length} markets updated`);
    
    res.json({
      success: true,
      message: 'Participant counts recalculated successfully',
      updated: updatedCount,
      total: marketsResult.rows.length
    });
    
  } catch (error) {
    console.error('Error recounting participants:', error);
    res.status(500).json({ error: 'Failed to recount participants' });
  }
});

// POST /api/markets/update-participant - Track unique participants when a prediction is placed
router.post('/update-participant', async (req, res) => {
  try {
    const { marketAddress, walletAddress } = req.body;
    
    if (!marketAddress || !walletAddress) {
      return res.status(400).json({ error: 'Market address and wallet address required' });
    }
    
    console.log(`👤 Checking unique participant for market ${marketAddress}, wallet ${walletAddress}`);
    
    // Check if this wallet has EVER participated in this specific market
    let hasParticipated = false;
    
    try {
      // Method 1: Check prediction_history table if it exists
      const historyQuery = `
        SELECT COUNT(*) as count 
        FROM prediction_history 
        WHERE market_pubkey = $1 AND wallet_address = $2
        LIMIT 1
      `;
      
      const historyResult = await db.query(historyQuery, [marketAddress, walletAddress]);
      const historyCount = parseInt(historyResult.rows[0]?.count || 0);
      
      if (historyCount > 0) {
        hasParticipated = true;
        console.log(`✅ Wallet ${walletAddress} already has ${historyCount} predictions in market ${marketAddress}`);
      }
      
    } catch (historyError) {
      console.log('📝 prediction_history table not available, using alternative method');
      
      // Method 2: Check if participant_count would indicate this user already participated
      // This is less accurate but better than double-counting
      try {
        const marketQuery = `
          SELECT participant_count, total_volume 
          FROM markets 
          WHERE market_address = $1
        `;
        
        const marketResult = await db.query(marketQuery, [marketAddress]);
        const currentCount = parseInt(marketResult.rows[0]?.participant_count || 0);
        const totalVolume = parseFloat(marketResult.rows[0]?.total_volume || 0);
        
        // If participant count is 1 or more and there's volume, assume this wallet already participated
        // This is a conservative approach to prevent double-counting
        if (currentCount >= 1 && totalVolume > 0) {
          hasParticipated = true;
          console.log(`⚠️  Conservative approach: market already has ${currentCount} participants, not incrementing`);
        }
      } catch (marketError) {
        console.error('Error checking market data:', marketError);
      }
    }
    
    if (hasParticipated) {
      // This wallet has already participated, don't increment count
      console.log('✅ Wallet already participated in this market, participant count unchanged');
      return res.json({ 
        success: true, 
        message: 'Participant already counted (no change)',
        isNewParticipant: false,
        participantCount: null // Don't return count since we didn't change it
      });
    }
    
    // This is a genuinely new participant - increment the count
    console.log(`🆕 New unique participant detected for market ${marketAddress}`);
    
    const updateQuery = `
      UPDATE markets 
      SET participant_count = COALESCE(participant_count, 0) + 1,
          updated_at = NOW()
      WHERE market_address = $1
      RETURNING participant_count
    `;
    
    const updateResult = await db.query(updateQuery, [marketAddress]);
    
    if (updateResult.rows.length > 0) {
      const newCount = updateResult.rows[0].participant_count;
      console.log(`🎉 New unique participant added! Market ${marketAddress} now has ${newCount} participants`);
      
      res.json({
        success: true,
        message: 'New unique participant counted',
        isNewParticipant: true,
        participantCount: newCount
      });
    } else {
      res.status(404).json({ error: 'Market not found' });
    }
    
  } catch (error) {
    console.error('Error updating participant count:', error);
    res.status(500).json({ error: 'Failed to update participant count' });
  }
});

// POST /api/markets - Create new manually created market (from CreateMarketPage)
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new manually created market...');
    
    const {
      market_address,
      question,
      category,
      options,
      end_time,
      creator_address,
      transaction_hash,
      status = 'Active',
      tournament_id,
      tournament_type,
      description,
      assets,
      optionsMetadata,
      minBetAmount = 10,
      creatorFeeRate = 2.5
    } = req.body;

    const walletAddress = req.headers['x-wallet-address'];
    
    // Validate required fields
    if (!market_address || !question || !options || !Array.isArray(options)) {
      return res.status(400).json({ 
        error: 'Missing required fields: market_address, question, options' 
      });
    }

    // 🚫 DUPLICATE PREVENTION CHECK
    if (tournament_id) {
      console.log(`🔍 Checking for duplicate market: "${question}" in tournament ${tournament_id}`);
      
      const duplicateCheck = await db.query(`
        SELECT market_address, question, created_at, status
        FROM markets 
        WHERE question = $1 
          AND (
            (tournament_id = $2 AND tournament_id IS NOT NULL)
            OR (category = 'Sports' AND status != 'Resolved' AND question = $1)
          )
        LIMIT 1
      `, [question, tournament_id]);
      
      if (duplicateCheck.rows.length > 0) {
        const existing = duplicateCheck.rows[0];
        console.log(`⚠️ DUPLICATE DETECTED: Market already exists for "${question}"`);
        
        return res.status(409).json({
          error: 'Market already exists',
          code: 'DUPLICATE_MARKET',
          existing_market: {
            address: existing.market_address,
            question: existing.question,
            created_at: existing.created_at,
            status: existing.status
          },
          message: `A market for "${question}" already exists${tournament_id ? ' in this tournament' : ''}. Market address: ${existing.market_address}`
        });
      }
    }

    // Ensure we have a creator
    const creator = creator_address || walletAddress || 'unknown';
    
    console.log('Market creation data:', {
      market_address,
      question: question?.substring(0, 50),
      category,
      options: options.length,
      creator
    });

    // Initialize option volumes with realistic starter amounts for better UX
    // This gives new markets some apparent activity to attract initial users
    // Note: These are display values only and don't represent actual staked funds
    const totalStarterVolume = 500 + Math.random() * 1000; // 500-1500 APES
    const optionVolumes = [];
    
    if (options.length === 2) {
      // Binary market: slight bias towards one option (55-65% vs 35-45%)
      const bias = 0.55 + Math.random() * 0.10; // 55-65%
      optionVolumes.push(Math.round(totalStarterVolume * bias));
      optionVolumes.push(Math.round(totalStarterVolume * (1 - bias)));
    } else {
      // Multi-option market: distribute more evenly but with some variation
      let remainingVolume = totalStarterVolume;
      for (let i = 0; i < options.length - 1; i++) {
        const maxShare = remainingVolume / (options.length - i);
        const minShare = Math.max(50, remainingVolume * 0.15); // At least 15% or 50 APES
        const share = Math.round(Math.random() * (maxShare - minShare) + minShare);
        optionVolumes.push(share);
        remainingVolume -= share;
      }
      optionVolumes.push(Math.max(0, remainingVolume)); // Add remaining to last option
    }
    
    const actualTotalVolume = optionVolumes.reduce((sum, vol) => sum + vol, 0);

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
        min_bet,
        option_volumes,
        total_volume,
        poly_id,
        tournament_id,
        tournament_type,
        assets,
        options_metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      ON CONFLICT (market_address) DO UPDATE SET
        question = EXCLUDED.question,
        category = EXCLUDED.category,
        options = EXCLUDED.options,
        tournament_id = EXCLUDED.tournament_id,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      market_address,
      creator,
      question,
      description || question, // use description or fallback to question
      category || 'General',
      end_time ? new Date(end_time) : null,
      status,
      options, // PostgreSQL array format
      minBetAmount,
      optionVolumes,
      actualTotalVolume, // realistic initial total_volume
      `user-created-${Date.now()}`, // unique poly_id for manually created markets
      tournament_id || null,
      tournament_type || null,
      assets ? JSON.stringify(assets) : null,
      optionsMetadata ? JSON.stringify(optionsMetadata) : null
    ]);

    const market = result.rows[0];
    console.log('✅ User-created market saved to database:', {
      market_address: market.market_address,
      question: market.question?.substring(0, 50),
      creator: market.creator,
      poly_id: market.poly_id
    });

    // Also try to save to markets_cache for immediate visibility
    try {
      await db.query(`
        INSERT INTO markets_cache (
          market_pubkey,
          question,
          category,
          status,
          options,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (market_pubkey) DO UPDATE SET
          question = EXCLUDED.question,
          category = EXCLUDED.category,
          options = EXCLUDED.options,
          updated_at = NOW()
      `, [
        market_address,
        question,
        category || 'General',
        status,
        options
      ]);
      console.log('✅ Market also saved to cache for immediate visibility');
    } catch (cacheError) {
      console.warn('⚠️ Failed to save to markets_cache (table may not exist):', cacheError.message);
      // Continue execution even if cache save fails
    }

    res.json({
      success: true,
      market,
      message: 'Market created successfully and will appear on markets page'
    });
  } catch (error) {
    console.error('❌ Error creating manually created market:', error);
    res.status(500).json({ 
      error: 'Failed to create market', 
      details: error.message 
    });
  }
});

// POST /api/markets/cache - Cache market data
router.post('/cache', async (req, res) => {
  try {
    const marketData = req.body;
    
    // Validate required fields
    if (!marketData.market_address || !marketData.poly_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: market_address and poly_id are required' 
      });
    }
    
    // Upsert into markets_cache table
    const { data, error } = await supabase
      .from('markets_cache')
      .upsert({
        market_address: marketData.market_address,
        poly_id: marketData.poly_id,
        apechain_market_id: marketData.apechain_market_id,
        question: marketData.question,
        category: marketData.category,
        options: marketData.options,
        assets: marketData.assets,
        options_metadata: marketData.options_metadata,
        status: marketData.status || 'Active',
        end_time: marketData.end_time,
        transaction_hash: marketData.transaction_hash,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'poly_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Also insert into main markets table if needed
    try {
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
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (market_address) DO UPDATE SET
          poly_id = EXCLUDED.poly_id,
          apechain_market_id = EXCLUDED.apechain_market_id,
          assets = EXCLUDED.assets,
          options_metadata = EXCLUDED.options_metadata
      `, [
        marketData.market_address,
        marketData.creator || 'system',
        marketData.question,
        marketData.question, // Use question as description
        marketData.category,
        marketData.end_time,
        marketData.status || 'Active',
        marketData.options,
        marketData.poly_id,
        marketData.apechain_market_id,
        JSON.stringify(marketData.assets),
        JSON.stringify(marketData.options_metadata)
      ]);
    } catch (dbError) {
      console.error('Error inserting into main markets table:', dbError);
      // Don't fail the request if main table insert fails
    }
    
    res.json({ 
      success: true, 
      data: data,
      message: 'Market cached successfully' 
    });
  } catch (error) {
    console.error('Error caching market:', error);
    res.status(500).json({ error: 'Failed to cache market' });
  }
});

module.exports = router; 