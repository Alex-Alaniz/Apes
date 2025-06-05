const marketController = require('../controllers/marketController');
const believeAppService = require('../utils/believeAppService');
const db = require('../../config/database');

// Market controller implementation
module.exports = {
  // Get all markets
  async getAllMarkets(req, res) {
    try {
      // Fetch markets from database instead of mock data
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
          created_at,
          updated_at
        FROM markets 
        WHERE status = 'Active'
        ORDER BY created_at DESC
      `;

      const result = await db.query(query);
      
      console.error(`📊 MarketController: Found ${result.rows.length} markets in database`);
      
      // Transform the data to match expected format
      const markets = result.rows.map(market => {
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

        // Determine dynamic banner icon based on market status
        let dynamicIcon = parsedAssets.icon; // Default to current icon
        
        if (market.status === 'Resolved' && market.resolved_option !== null && parsedOptionsMetadata.length > 0) {
          // For resolved markets: Show winning option's icon
          const winningOptionMeta = parsedOptionsMetadata[market.resolved_option];
          if (winningOptionMeta && winningOptionMeta.icon) {
            dynamicIcon = winningOptionMeta.icon;
            console.error(`🏆 Resolved market ${market.market_address}: Using winning option icon`);
          }
        } else if (market.status === 'Active' && optionPercentages.length > 0 && parsedOptionsMetadata.length > 0) {
          // For active markets: Show leading option's icon
          const leadingOptionIndex = optionPercentages.indexOf(Math.max(...optionPercentages));
          const leadingOptionMeta = parsedOptionsMetadata[leadingOptionIndex];
          if (leadingOptionMeta && leadingOptionMeta.icon) {
            dynamicIcon = leadingOptionMeta.icon;
            console.error(`📊 Active market ${market.market_address}: Using leading option (${market.options[leadingOptionIndex]}) icon`);
          }
        }
        
        // Update assets with dynamic icon
        const finalAssets = {
          ...parsedAssets,
          icon: dynamicIcon,
          banner: parsedAssets.banner // Keep original banner
        };

        return {
          id: market.market_address,
          publicKey: market.market_address,
          question: market.question,
          description: market.description,
          options: market.options || [],
          optionPools: market.option_volumes || [],
          optionPercentages,
          endDate: market.resolution_date,
          endTime: market.resolution_date,
          totalPool: market.total_volume || 0,
          category: market.category,
          createdBy: market.creator,
          createdAt: market.created_at,
          status: market.status,
          winningOption: market.resolved_option,
          // Add Polymarket specific fields
          polyId: market.poly_id,
          apechainMarketId: market.apechain_market_id,
          assets: finalAssets, // Use updated assets with dynamic icon
          optionsMetadata: parsedOptionsMetadata,
          options_metadata: parsedOptionsMetadata
        };
      });
      
      return res.status(200).json({
        status: 'success',
        data: markets
      });
    } catch (error) {
      console.error('Error fetching markets:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching markets'
      });
    }
  },
  
  // Get market by ID
  async getMarketById(req, res) {
    try {
      const { id } = req.params;
      
      // Fetch market from database
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
        WHERE market_address = $1
      `;

      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Market not found'
        });
      }

      const market = result.rows[0];
      
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

      const formattedMarket = {
        id: market.market_address,
        publicKey: market.market_address,
        question: market.question,
        description: market.description,
        options: market.options || [],
        optionPools: market.option_volumes || [],
        optionPercentages,
        endDate: market.resolution_date,
        endTime: market.resolution_date,
        totalPool: market.total_volume || 0,
        category: market.category,
        createdBy: market.creator,
        createdAt: market.created_at,
        status: market.status,
        winningOption: market.resolved_option,
        // Add Polymarket specific fields
        polyId: market.poly_id,
        apechainMarketId: market.apechain_market_id,
        assets: parsedAssets,
        optionsMetadata: parsedOptionsMetadata,
        options_metadata: parsedOptionsMetadata,
        minBetAmount: parseFloat(market.min_bet || 10),
        totalVolume: parseFloat(market.total_volume || 0),
        participantCount: market.participant_count || 0,
        resolutionDate: market.resolution_date,
        creator: market.creator,
        creatorFeeRate: 2.5,
        marketType: market.market_type || 'binary',
        optionCount: market.options?.length || 0
      };
      
      return res.status(200).json(formattedMarket);
    } catch (error) {
      console.error('Error fetching market:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching market'
      });
    }
  },
  
  // Create new market
  async createMarket(req, res) {
    try {
      const { 
        question, 
        description, 
        options, 
        endDate, 
        category, 
        creatorAddress,
        stakeAmount,
        transactionId
      } = req.body;
      
      // Validate required fields
      if (!question || !options || !endDate || !category || !creatorAddress || !stakeAmount || !transactionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      // Generate market ID
      const marketId = 'market_' + Math.random().toString(36).substring(2, 15);
      
      // Process token burn for market creation (0.5% of stake)
      await believeAppService.processMarketCreationBurn(
        creatorAddress,
        marketId,
        question,
        parseFloat(stakeAmount),
        transactionId
      );
      
      // In a real implementation, we would save to database
      // For now, we'll return mock data
      const newMarket = {
        id: marketId,
        question,
        description,
        options,
        optionPools: options.map(() => 0), // Initialize with zeros
        endDate: new Date(endDate),
        totalPool: parseFloat(stakeAmount) * 0.995, // After 0.5% burn
        category,
        createdBy: creatorAddress,
        createdAt: new Date(),
        status: 'Active'
      };
      
      return res.status(201).json({
        status: 'success',
        data: newMarket
      });
    } catch (error) {
      console.error('Error creating market:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error creating market'
      });
    }
  },
  
  // Resolve market
  async resolveMarket(req, res) {
    try {
      const { id } = req.params;
      const { winningOption, resolverAddress } = req.body;
      
      // Validate required fields
      if (winningOption === undefined || !resolverAddress) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required parameters'
        });
      }
      
      // In a real implementation, we would update the database
      // For now, we'll return mock data
      const resolvedMarket = {
        id,
        status: 'Resolved',
        winningOption,
        resolvedBy: resolverAddress,
        resolvedAt: new Date()
      };
      
      return res.status(200).json({
        status: 'success',
        data: resolvedMarket
      });
    } catch (error) {
      console.error('Error resolving market:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error resolving market'
      });
    }
  },
  
  // Get markets by category
  async getMarketsByCategory(req, res) {
    try {
      const { category } = req.params;
      
      // In a real implementation, we would fetch from database
      // For now, we'll return mock data filtered by category
      const markets = [
        {
          id: '1',
          question: 'Will BTC reach $100,000 by end of 2025?',
          options: ['Yes', 'No'],
          optionPools: [16250, 8750],
          endDate: new Date('2025-12-31'),
          totalPool: 25000,
          category: 'Crypto',
          createdAt: new Date('2025-01-15'),
          status: 'Active',
        },
        {
          id: '4',
          question: 'Will Ethereum 2.0 fully launch by Q3 2025?',
          options: ['Yes', 'No'],
          optionPools: [21600, 8400],
          endDate: new Date('2025-09-30'),
          totalPool: 30000,
          category: 'Crypto',
          createdAt: new Date('2025-01-18'),
          status: 'Active',
        },
      ].filter(market => market.category.toLowerCase() === category.toLowerCase());
      
      return res.status(200).json({
        status: 'success',
        data: markets
      });
    } catch (error) {
      console.error('Error fetching markets by category:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error fetching markets by category'
      });
    }
  }
};
