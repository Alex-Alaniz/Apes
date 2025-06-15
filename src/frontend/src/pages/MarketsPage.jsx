import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import MarketList from '../components/MarketList';
import SportFilter from '../components/SportFilter';
import PredictionModal from '../components/PredictionModal';
import ClaimRewardModal from '../components/ClaimRewardModal';
import Toast from '../components/Toast';
import marketService from '../services/marketService';
import blockchainMarketsService from '../services/blockchainMarketsService';
import { format, parseISO } from 'date-fns';
import { 
  Filter, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Trophy,
  SortAsc,
  SortDesc,
  CalendarDays,
  Shield,
  Search,
  X,
  DollarSign,
  Users
} from 'lucide-react';

const MarketsPage = () => {
  // 📊 DEPLOYMENT TRIGGER v2: Force Vercel auto-deployment - June 12, 2025 @ 1:45 PM
  // Backend optimization complete: 23 active markets ready, testing auto-deploy from master
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
  // Enhanced filtering state
  const [sportFilters, setSportFilters] = useState({
    sport: 'all',
    league: 'all',
    tournamentType: 'all',
    status: 'all',
    search: ''
  });
  // New sorting state
  const [sortBy, setSortBy] = useState('date'); // 'date', 'volume', 'participants'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  
  const { wallet, publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const scrollPositionRef = useRef(0);
  const navigate = useNavigate();

  const INITIAL_DISPLAY_COUNT = 12;
  const LOAD_MORE_COUNT = 12;

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
    
    // DISABLED: Initialize blockchain service (was causing rate limit issues)
    // blockchainMarketsService.initialize();
    
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
      
      console.log('🔄 Loading markets with escrow checking enabled...');
      
      // Use direct API call with escrow checking parameter
      try {
        // According to a memory from a past conversation...
        // For APES prediction markets, the accurate market volume must be fetched from the escrow account, not the market account pools. 
        // For the markets list (GET /api/markets), add ?check_escrow=true to fetch escrow volumes.
        const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
        const response = await fetch(`${apiUrl}/api/markets?check_escrow=true`);
        
        if (response.ok) {
          const fetchedMarkets = await response.json();
          console.log(`✅ Loaded ${fetchedMarkets.length} active markets with escrow volumes`);
          setMarkets(fetchedMarkets);
          
          // Log any markets that have escrow volumes
          const marketsWithEscrow = fetchedMarkets.filter(m => m.volumeSource === 'escrow');
          if (marketsWithEscrow.length > 0) {
            console.log(`💰 ${marketsWithEscrow.length} markets have real escrow volumes:`, 
              marketsWithEscrow.map(m => ({ address: m.address || m.publicKey, volume: m.totalVolume }))
            );
          }
        } else {
          console.error('Failed to fetch markets:', response.status);
          setMarkets([]);
        }
        
        // Also fetch resolved markets separately for filtering
        try {
          const resolvedData = await marketService.fetchResolvedMarkets();
          setResolvedMarkets(resolvedData.markets || []);
          console.log(`🏆 Loaded ${resolvedData.markets?.length || 0} resolved markets`);
        } catch (resolvedError) {
          console.warn('Could not fetch resolved markets:', resolvedError);
          setResolvedMarkets([]);
        }
        
      } catch (error) {
        console.error('Market fetching failed:', error);
        
        // Only try blockchain fallback if not rate limited
        if (!error.message?.includes('Rate limit')) {
          try {
            console.log('🔄 Trying blockchain fallback...');
            const fetchedMarkets = await blockchainMarketsService.fetchMarketsWithFallback();
            console.log(`✅ Fallback: Loaded ${fetchedMarkets.length} markets`);
            setMarkets(fetchedMarkets);
          } catch (fallbackError) {
            console.error('Blockchain fallback also failed:', fallbackError);
            setMarkets([]);
          }
        } else {
          console.warn('⚠️ Rate limited - not attempting fallback');
          setMarkets([]);
        }
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
    
    // Try both market.publicKey and market.address to handle different data sources
    const marketKey = market.publicKey || market.address;
    const marketPositions = userPositions[marketKey] || [];
    
    return marketPositions.some(position => {
      // For backend positions, check market.status from the position data
      const marketData = position.market || market;
      const isResolved = marketData.status === 'Resolved';
      const winningOption = marketData.winningOption !== null ? marketData.winningOption : market.winningOption;
      
      return isResolved && 
             winningOption !== null && 
             position.optionIndex === winningOption && 
             !position.claimed;
    });
  };

  // Combine active and resolved markets for filtering
  const allMarkets = [...markets, ...resolvedMarkets];
  
  // Enhanced filtering with SportFilter only
  const filteredMarkets = allMarkets.filter(market => {
    // Search filter
    if (sportFilters.search) {
      const searchTerm = sportFilters.search.toLowerCase();
      if (!market.question?.toLowerCase().includes(searchTerm) &&
          !market.description?.toLowerCase().includes(searchTerm) &&
          !market.category?.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Sport category filter
    if (sportFilters.sport !== 'all') {
      const marketCategory = market.category?.toLowerCase() || 'other';
      if (sportFilters.sport === 'football' && marketCategory !== 'sports') return false;
      if (sportFilters.sport === 'basketball' && marketCategory !== 'sports') return false;
      if (sportFilters.sport === 'american_football' && marketCategory !== 'sports') return false;
      if (sportFilters.sport === 'crypto' && marketCategory !== 'crypto') return false;
      if (sportFilters.sport === 'politics' && marketCategory !== 'politics') return false;
      if (sportFilters.sport === 'entertainment' && marketCategory !== 'entertainment') return false;
      if (sportFilters.sport === 'other' && ['sports', 'crypto', 'politics', 'entertainment'].includes(marketCategory)) return false;
    }

    // Status filter from SportFilter
    if (sportFilters.status !== 'all') {
      const marketStatus = market.status?.toLowerCase();
      if (sportFilters.status === 'active' && marketStatus !== 'active') return false;
      if (sportFilters.status === 'resolved' && marketStatus !== 'resolved') return false;
      if (sportFilters.status === 'upcoming' && marketStatus !== 'upcoming') return false;
      if (sportFilters.status === 'pending' && marketStatus !== 'pending resolution') return false;
    }

    // Tournament type filter
    if (sportFilters.tournamentType !== 'all') {
      const tournamentType = market.tournament_type || 'league';
      if (tournamentType !== sportFilters.tournamentType) return false;
    }

    return true;
  });

  // Sort markets based on selected criteria
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        // Sort by resolution date/end time
        const dateA = a.resolution_date || a.resolutionDate || a.endTime || '';
        const dateB = b.resolution_date || b.resolutionDate || b.endTime || '';
        comparison = new Date(dateA) - new Date(dateB);
        break;
        
      case 'volume':
        // Sort by total volume
        const volA = a.totalVolume || a.total_volume || 0;
        const volB = b.totalVolume || b.total_volume || 0;
        comparison = volA - volB;
        break;
        
      case 'participants':
        // Sort by number of bets/participants
        const betsA = a.totalBets || a.total_bets || 0;
        const betsB = b.totalBets || b.total_bets || 0;
        comparison = betsA - betsB;
        break;
        
      default:
        comparison = 0;
    }
    
    // Apply sort order
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const activeCount = allMarkets.filter(m => m.status === 'Active' || m.status === 'active').length;
  const resolvedCount = allMarkets.filter(m => m.status === 'Resolved' || m.status === 'resolved').length;
  const pendingCount = allMarkets.filter(m => m.status === 'Pending Resolution').length;

  // Handler for SportFilter changes
  const handleSportFilterChange = (newFilters) => {
    setSportFilters(newFilters);
  };

  // Sort button component
  const SortButton = ({ value, label, icon: Icon }) => (
    <button
      onClick={() => {
        if (sortBy === value) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortBy(value);
          setSortOrder('asc');
        }
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        sortBy === value
          ? 'bg-purple-600 text-white'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {sortBy === value && (
        sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PRIMAPE Markets</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active markets: {activeCount} | Resolved: {resolvedCount}
              {pendingCount > 0 && ` | Pending: ${pendingCount}`}
              {markets.some(m => m.isBlockchainResolved) && (
                <span className="ml-2 text-green-600 dark:text-green-400">🔴 Live blockchain data</span>
              )}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/create-market')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
            >
              Create Market
            </button>
          </div>
        </div>

        {/* Enhanced Sports and Tournament Filtering */}
        <div className="mb-6">
          <SportFilter 
            markets={allMarkets}
            onFilterChange={handleSportFilterChange}
            selectedFilters={sportFilters}
          />
        </div>

        {/* Sorting Options */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Filter className="w-4 h-4" />
              Sort by:
            </div>
            <div className="flex flex-wrap gap-2">
              <SortButton value="date" label="Date" icon={Calendar} />
              <SortButton value="volume" label="Volume" icon={TrendingUp} />
              <SortButton value="participants" label="Participants" icon={Shield} />
            </div>
            {sportFilters.tournamentType === 'tournament' && (
              <div className="ml-auto">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                  <Trophy className="w-4 h-4" />
                  Tournament Markets
                </span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading markets with blockchain verification...</p>
          </div>
        ) : sortedMarkets.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
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
          <>
            {/* Markets grouped by date for tournament markets */}
            {sportFilters.tournamentType === 'tournament' && sortBy === 'date' ? (
              <div className="space-y-8">
                {Object.entries(
                  sortedMarkets.reduce((groups, market) => {
                    const date = market.resolution_date || market.resolutionDate || market.endTime || 'No Date';
                    let dateKey = 'No Date';
                    
                    if (date !== 'No Date') {
                      const dateObj = new Date(date);
                      
                      // For tournament markets, group by ET date
                      if (market.tournament_id) {
                        // Convert UTC to EDT (UTC-4) for June 2025
                        const etDate = new Date(dateObj.getTime() - (4 * 60 * 60 * 1000));
                        dateKey = format(etDate, 'yyyy-MM-dd');
                      } else {
                        dateKey = format(dateObj, 'yyyy-MM-dd');
                      }
                    }
                    
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(market);
                    return groups;
                  }, {})
                )
                  .sort((a, b) => {
                    if (a[0] === 'No Date') return 1;
                    if (b[0] === 'No Date') return -1;
                    return sortOrder === 'asc' 
                      ? new Date(a[0]) - new Date(b[0])
                      : new Date(b[0]) - new Date(a[0]);
                  })
                  .map(([date, dateMarkets]) => (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-4">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {date === 'No Date' ? 'Unscheduled' : format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({dateMarkets.length} markets)
                        </span>
                        {dateMarkets.some(m => m.tournament_id) && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            EDT
                          </span>
                        )}
                      </div>
                      <MarketList 
                        markets={dateMarkets} 
                        onPredict={handlePredictClick}
                        onClaim={handleClaimClick}
                        canClaimReward={canClaimReward}
                        userPositions={userPositions}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <MarketList 
                markets={sortedMarkets} 
                onPredict={handlePredictClick}
                onClaim={handleClaimClick}
                canClaimReward={canClaimReward}
                userPositions={userPositions}
              />
            )}
          </>
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