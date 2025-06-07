import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import MarketList from '../components/MarketList';
import PredictionModal from '../components/PredictionModal';
import ClaimRewardModal from '../components/ClaimRewardModal';
import Toast from '../components/Toast';
import marketService from '../services/marketService';
import blockchainMarketsService from '../services/blockchainMarketsService';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [resolvedMarkets, setResolvedMarkets] = useState([]);
  // Claim functionality state
  const [selectedClaimData, setSelectedClaimData] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [userPositions, setUserPositions] = useState({});
  const { wallet, publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const scrollPositionRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet && connected && publicKey) {
      // Use actual Phantom wallet with signAndSendTransaction method
      const phantomWallet = window.phantom?.solana;
      if (phantomWallet && typeof phantomWallet.signAndSendTransaction === 'function') {
        marketService.initialize(phantomWallet);
      }
      
      // Load user positions for claim functionality
      loadUserPositions();
    }
    
    // Initialize blockchain service
    blockchainMarketsService.initialize();
    
    loadMarkets();
  }, [wallet, connected, publicKey]);

  // Restore scroll position after markets update
  useEffect(() => {
    if (!loading && scrollPositionRef.current > 0) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [loading]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading markets with real-time blockchain resolution checking...');
      
      // 🔴 NEW: Use enhanced endpoint with blockchain resolution checking
      try {
        // Try to fetch from our enhanced local endpoint with blockchain resolution checking
        const fetchedMarkets = await marketService.fetchMarkets(false); // Active markets only
        console.log(`✅ Loaded ${fetchedMarkets.length} active markets with blockchain verification`);
        setMarkets(fetchedMarkets);
        
        // Also fetch resolved markets separately for filtering
        try {
          const resolvedData = await marketService.fetchResolvedMarkets();
          setResolvedMarkets(resolvedData.markets || []);
          console.log(`🏆 Loaded ${resolvedData.markets?.length || 0} resolved markets`);
        } catch (resolvedError) {
          console.warn('Could not fetch resolved markets:', resolvedError);
          setResolvedMarkets([]);
        }
        
      } catch (enhancedError) {
        console.warn('Enhanced endpoint failed, falling back to blockchain service:', enhancedError);
        
        // Fallback to blockchain service if local backend isn't available
        const fetchedMarkets = await blockchainMarketsService.fetchMarketsWithFallback();
        console.log(`✅ Fallback: Loaded ${fetchedMarkets.length} markets`);
        setMarkets(fetchedMarkets);
      }
      
    } catch (error) {
      console.error('Error loading markets:', error);
      setToast({
        message: 'Failed to load markets. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePredictClick = (market) => {
    // Save scroll position before opening modal
    scrollPositionRef.current = window.scrollY;
    setSelectedMarket(market);
    setShowPredictionModal(true);
  };

  const handlePredictionSuccess = async (prediction) => {
    setShowPredictionModal(false);
    
    // Clear blockchain cache to get fresh data
    blockchainMarketsService.clearCache();
    
    // Check if there's a warning about timeout
    if (prediction.warning) {
      setToast({
        message: `Prediction submitted! ${prediction.warning}`,
        type: 'warning'
      });
    } else {
      setToast({
        message: `Successfully placed ${prediction.amount} APES on "${prediction.option}"!`,
        type: 'success'
      });
    }

    // Reload markets to update the data and check for any newly resolved markets
    await loadMarkets();
  };

  // Add a function to manually sync market resolution
  const syncMarketResolution = async (marketAddress) => {
    try {
      console.log(`🔄 Manually syncing resolution for market: ${marketAddress}`);
      
      const result = await marketService.syncMarketResolutionStatus(marketAddress);
      
      if (result.success && result.wasResolved) {
        setToast({
          message: `Market resolved! Winner: Option ${result.winningOption}`,
          type: 'success'
        });
        
        // Reload markets to show updated status
        await loadMarkets();
      } else if (result.success && !result.wasResolved) {
        setToast({
          message: 'Market is still active on blockchain',
          type: 'info'
        });
      } else {
        setToast({
          message: 'Failed to sync market resolution',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error syncing market resolution:', error);
      setToast({
        message: 'Error syncing market resolution',
        type: 'error'
      });
    }
  };

  // Load user positions for claim functionality
  const loadUserPositions = async () => {
    if (!publicKey) return;
    
    try {
      const positions = await marketService.getUserPositions(publicKey.toString());
      console.log('📊 Loaded user positions:', positions);
      setUserPositions(positions);
    } catch (error) {
      console.error('Error loading user positions:', error);
    }
  };

  // Calculate potential winnings for a resolved market
  const calculatePotentialWinnings = (market, optionIndex) => {
    if (!market || market.status !== 'Resolved' || market.winningOption !== optionIndex) return 0;
    
    const userPosition = userPositions[market.publicKey]?.find(p => p.optionIndex === optionIndex);
    if (!userPosition) return 0;
    
    const winningPool = market.optionPools?.[market.winningOption] || 0;
    const totalPool = market.totalVolume || 0;
    
    if (winningPool === 0) return 0;
    
    const userShare = userPosition.amount / winningPool;
    const grossWinnings = userShare * totalPool;
    const platformFee = grossWinnings * 0.025;
    const creatorFee = grossWinnings * (market.creatorFeeRate || 25) / 10000;
    
    return grossWinnings - platformFee - creatorFee;
  };

  // Handle claim reward click
  const handleClaimClick = (market, optionIndex) => {
    const userPosition = userPositions[market.publicKey]?.find(p => p.optionIndex === optionIndex);
    if (!userPosition) return;
    
    const potentialWinnings = calculatePotentialWinnings(market, optionIndex);
    setSelectedClaimData({
      position: userPosition,
      market,
      potentialWinnings
    });
    setClaimModalOpen(true);
  };

  // Handle successful claim
  const handleClaimSuccess = async (message) => {
    if (message && message.includes('confirmation timed out')) {
      setToast({
        message: `Claim submitted! ${message}`,
        type: 'warning'
      });
    } else {
      setToast({
        message: message || 'Rewards claimed successfully!',
        type: 'success'
      });
    }
    
    // Reload user positions and markets
    await Promise.all([loadUserPositions(), loadMarkets()]);
  };

  // Check if user can claim reward for a market
  const canClaimReward = (market) => {
    if (!publicKey || !market || market.status !== 'Resolved' || market.winningOption === null) {
      return false;
    }
    
    const marketPositions = userPositions[market.publicKey] || [];
    return marketPositions.some(position => 
      position.optionIndex === market.winningOption && !position.claimed
    );
  };

  // Combine active and resolved markets for filtering
  const allMarkets = [...markets, ...resolvedMarkets];
  
  const filteredMarkets = allMarkets.filter(market => {
    if (filter === 'all') return true;
    if (filter === 'active') return market.status === 'Active' || market.status === 'active';
    if (filter === 'resolved') return market.status === 'Resolved' || market.status === 'resolved';
    if (filter === 'my-bets' && publicKey) {
      // This would need to check user's predictions
      return false; // Implement later
    }
    return true;
  });

  const activeCount = allMarkets.filter(m => m.status === 'Active' || m.status === 'active').length;
  const resolvedCount = allMarkets.filter(m => m.status === 'Resolved' || m.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prediction Markets</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active markets: {activeCount} | Resolved: {resolvedCount}
              {markets.some(m => m.isBlockchainResolved) && (
                <span className="ml-2 text-green-600 dark:text-green-400">🔴 Live blockchain data</span>
              )}
            </p>
          </div>
          
          <button
            onClick={() => navigate('/create-market')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
          >
            Create Market
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Markets ({filteredMarkets.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'active' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'resolved' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          {publicKey && (
            <button
              onClick={() => setFilter('my-bets')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'my-bets' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              My Bets
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading markets with blockchain verification...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {filter === 'all' ? 'No Markets Available' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Markets`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === 'my-bets' 
                ? 'You haven\'t placed any bets yet.' 
                : filter === 'all'
                ? 'Be the first to create a prediction market!'
                : `No ${filter} markets found.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/create-market')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
              >
                Create First Market
              </button>
            )}
          </div>
        ) : (
          <MarketList 
            markets={filteredMarkets} 
            onPredict={handlePredictClick}
            onClaim={handleClaimClick}
            canClaimReward={canClaimReward}
            userPositions={userPositions}
          />
        )}

        {/* Prediction Modal */}
        <PredictionModal
          market={selectedMarket}
          isOpen={showPredictionModal}
          onClose={() => setShowPredictionModal(false)}
          onSuccess={handlePredictionSuccess}
        />

        {/* Claim Reward Modal */}
        {selectedClaimData && (
          <ClaimRewardModal
            isOpen={claimModalOpen}
            onClose={() => {
              setClaimModalOpen(false);
              setSelectedClaimData(null);
            }}
            position={selectedClaimData.position}
            market={selectedClaimData.market}
            potentialWinnings={selectedClaimData.potentialWinnings}
            onSuccess={handleClaimSuccess}
          />
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MarketsPage; 