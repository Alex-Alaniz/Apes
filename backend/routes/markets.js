const express = require('express');
const router = express.Router();
const db = require('../database/db');
const supabase = require('../config/supabase');

// GET /api/markets - Fetch all markets with enhanced data including assets
router.get('/', async (req, res) => {
  try {
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
        created_at,
        updated_at
      FROM markets 
      WHERE status = 'Active'
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    
    console.log(`📊 Found ${result.rows.length} markets in database`);
    
    // Transform the data to include calculated fields
    const markets = result.rows.map(market => {
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
        apechainMarketId: market.apechain_market_id
      };

      // Log first market for debugging
      if (result.rows.indexOf(market) === 0) {
        console.log('📋 First market data:', {
          question: market.question?.substring(0, 50),
          poly_id: market.poly_id,
          market_address: market.market_address,
          total_volume: market.total_volume,
          participant_count: market.participant_count,
          assets: Object.keys(parsedAssets),
          options_count: market.options?.length
        });
      }

      return transformedMarket;
    });

    res.json(markets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    
    // If participant_count column doesn't exist, try without it
    if (error.message && error.message.includes('participant_count')) {
      console.log('⚠️  participant_count column missing, falling back to query without it');
      
      try {
        const fallbackQuery = `
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
            created_at,
            updated_at
          FROM markets 
          WHERE status = 'Active'
          ORDER BY created_at DESC
        `;
        
        const fallbackResult = await db.query(fallbackQuery);
        console.log(`📊 Fallback query found ${fallbackResult.rows.length} markets`);
        
        // Transform the data with participantCount defaulted to 0
        const markets = fallbackResult.rows.map(market => {
          // Same transformation logic but with participantCount: 0
          const optionPercentages = [];
          if (market.total_volume > 0 && market.option_volumes) {
            market.option_volumes.forEach(volume => {
              optionPercentages.push((volume / market.total_volume) * 100);
            });
          } else {
            market.options.forEach(() => optionPercentages.push(50));
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
            apechainMarketId: market.apechain_market_id
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

// GET /api/markets/:address - Get single market with assets
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
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
        created_at
      FROM markets 
      WHERE market_address = $1
    `;

    const result = await db.query(query, [address]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const market = result.rows[0];
    
    // Calculate option percentages
    const optionPercentages = [];
    if (market.total_volume > 0 && market.option_volumes) {
      market.option_volumes.forEach(volume => {
        optionPercentages.push((volume / market.total_volume) * 100);
      });
    } else {
      market.options.forEach(() => optionPercentages.push(50));
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
      apechainMarketId: market.apechain_market_id
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
    const query = `
      SELECT * FROM market_metadata 
      WHERE status = 'pending_creation' 
      ORDER BY created_at ASC
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
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

// Get all cached markets
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

// Save market data (for caching)
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
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

module.exports = router; 