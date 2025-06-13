import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import marketService from '../services/marketService';
import Toast from '../components/Toast';
import PredictionModal from '../components/PredictionModal';

const MarketDetailPage = ({ marketId }) => {
  const { id, marketId: urlMarketId } = useParams();
  const navigate = useNavigate();
  const { publicKey, wallet } = useWallet();
  const walletAdapter = wallet?.adapter;
  const [market, setMarket] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedOption, setSelectedOption] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [error, setError] = useState(null);

  // Get market ID from multiple sources to handle different routing scenarios
  const actualMarketId = marketId || urlMarketId || id;
  const marketPubkey = actualMarketId;

  console.log('MarketDetailPage: Route params debug', {
    marketId,
    urlMarketId, 
    id,
    actualMarketId,
    marketPubkey
  });

  useEffect(() => {
    const loadMarket = async () => {
      if (!actualMarketId) {
        console.error('MarketDetailPage: No market ID provided');
        setError('No market ID provided in URL');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('MarketDetailPage: Loading market with ID:', actualMarketId);
        
        // First try to fetch from backend API (we know this works)
        let foundMarket = null;
        
        try {
          console.log('MarketDetailPage: Fetching from backend API...');
          // Use proper API URL configuration
          const backendUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
          const apiUrl = `${backendUrl}/api/markets/${actualMarketId}`;
          
          console.log('MarketDetailPage: API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            timeout: 8000 // 8 second timeout for API
          });
          
          console.log('MarketDetailPage: API response status:', response.status);
          
          if (response.ok) {
            const responseData = await response.json();
            console.log('MarketDetailPage: Raw backend response:', responseData);
            
            // Handle the response format - extract from wrapper if needed
            foundMarket = responseData.data || responseData;
            
            if (foundMarket && foundMarket.question) {
              console.log('MarketDetailPage: Successfully fetched from backend:', foundMarket);
            
              // The backend API returns properly formatted data, just ensure compatibility
            foundMarket = {
              ...foundMarket,
                publicKey: foundMarket.id || foundMarket.publicKey || actualMarketId,  // Use id field as publicKey
                optionCount: foundMarket.optionCount || foundMarket.options?.length || 0,
                totalVolume: parseFloat(foundMarket.totalVolume || foundMarket.totalPool || 0),
                minBetAmount: parseFloat(foundMarket.minBetAmount || foundMarket.min_bet || 10),
              creatorFeeRate: foundMarket.creatorFeeRate || 2.5,
                resolutionDate: foundMarket.resolutionDate || foundMarket.resolution_date || foundMarket.endTime || foundMarket.endDate,
                creator: foundMarket.creator || foundMarket.createdBy || 'Unknown',
                // Ensure proper option percentages and pools with safe defaults
              optionPercentages: foundMarket.optionPercentages || foundMarket.option_percentages || [],
              optionPools: foundMarket.optionPools || foundMarket.option_volumes || []
            };
              
              // Calculate percentages if not provided or invalid
              if ((!foundMarket.optionPercentages || foundMarket.optionPercentages.length === 0) && foundMarket.optionPools && foundMarket.totalVolume > 0) {
                foundMarket.optionPercentages = foundMarket.optionPools.map(pool => (pool / foundMarket.totalVolume) * 100);
              }
              
              // Ensure we have arrays even if empty
              if (!foundMarket.optionPercentages || !Array.isArray(foundMarket.optionPercentages)) {
                foundMarket.optionPercentages = [];
              }
              if (!foundMarket.optionPools || !Array.isArray(foundMarket.optionPools)) {
                foundMarket.optionPools = [];
              }
              
              // Fill missing array values with defaults
              const optionCount = foundMarket.optionCount || foundMarket.options?.length || 0;
              while (foundMarket.optionPercentages.length < optionCount) {
                foundMarket.optionPercentages.push(100 / optionCount);
              }
              while (foundMarket.optionPools.length < optionCount) {
                foundMarket.optionPools.push(0);
              }
              
              console.log('MarketDetailPage: Final processed market:', foundMarket);
            } else {
              console.error('MarketDetailPage: Invalid market data structure:', responseData);
              foundMarket = null;
            }
          } else {
            console.error('MarketDetailPage: Backend API response not ok:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('MarketDetailPage: Error response body:', errorText);
          }
        } catch (apiError) {
          console.error('MarketDetailPage: Error fetching from backend API:', apiError);
        }
        
        // If backend didn't work, try blockchain data (with shorter timeout)
        if (!foundMarket) {
          console.log('MarketDetailPage: Backend fetch failed, trying blockchain with timeout...');
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Blockchain fetch timeout after 5 seconds')), 5000)
            );
            
            const marketsPromise = marketService.fetchMarketsWithStats();
            const markets = await Promise.race([marketsPromise, timeoutPromise]);
            
            foundMarket = markets.find(m => m.publicKey === actualMarketId);
            if (foundMarket) {
              console.log('MarketDetailPage: Successfully fetched from blockchain:', foundMarket);
            } else {
              console.log('MarketDetailPage: Market not found in blockchain data');
            }
          } catch (blockchainError) {
            console.error('MarketDetailPage: Blockchain fetch failed:', blockchainError.message);
          }
        }
        
        if (foundMarket) {
          console.log('MarketDetailPage: Setting market state:', foundMarket);
          setMarket(foundMarket);
        } else {
          console.error('MarketDetailPage: Market not found in any source');
          setError(`Market not found with ID: ${actualMarketId}. Please check the URL or try refreshing the page.`);
        }
      } catch (err) {
        console.error('MarketDetailPage: Error loading market:', err);
        setError('Failed to load market details. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    
    loadMarket();
  }, [actualMarketId]);

  const handlePlaceBet = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }
    
    setIsPlacingBet(true);
    try {
      const prediction = await marketService.placeBet(marketPubkey, selectedOption, parseFloat(betAmount));
      
      setToast({
        message: prediction.warning || `Successfully placed ${parseFloat(betAmount)} APES on "${getOptionLabel(market.options?.[selectedOption], selectedOption)}"!`,
        type: prediction.warning ? 'warning' : 'success'
      });
      
      // Reload market data to get updated stats
      const markets = await marketService.fetchMarketsWithStats();
      const updatedMarket = markets.find(m => m.publicKey === marketPubkey);
      if (updatedMarket) {
        setMarket(updatedMarket);
      }
      
      // Reset form
      setBetAmount('');
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place prediction: ' + error.message);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handlePredictionSuccess = async (prediction) => {
    setShowPredictionModal(false);
    
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
    
    // Reload market data to get updated status
    const markets = await marketService.fetchMarketsWithStats();
    const updatedMarket = markets.find(m => m.publicKey === marketPubkey);
    if (updatedMarket) {
      setMarket(updatedMarket);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to place predictions</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading market details...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Market ID: {actualMarketId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Market</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-500">Debug Info:</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">Market ID: {actualMarketId}</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">URL: {window.location.pathname}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/markets')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Markets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Market Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">This market doesn't exist or has been removed.</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-500">Debug Info:</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">Market ID: {actualMarketId}</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">URL: {window.location.pathname}</p>
          </div>
          <button
            onClick={() => navigate('/markets')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Markets
          </button>
        </div>
      </div>
    );
  }

  const platformFeeAmount = betAmount ? (parseFloat(betAmount) * 0.025).toFixed(2) : '0';
  const effectiveBet = betAmount ? (parseFloat(betAmount) - parseFloat(platformFeeAmount)).toFixed(2) : '0';

  // Get options metadata - handle both camelCase and snake_case
  const optionsMetadata = market.optionsMetadata || market.options_metadata || [];

  // Fix options display - use metadata labels if available
  const getOptionLabel = (option, index) => {
    // If we have metadata with proper labels, use those
    if (optionsMetadata[index] && optionsMetadata[index].label) {
      return optionsMetadata[index].label;
    }
    // Otherwise use the blockchain option
    return option;
  };
  
  // Filter out empty options and use actual option count
  const actualOptions = [];
  for (let i = 0; i < market.optionCount && i < market.options.length; i++) {
            const option = market.options?.[i];
    const label = getOptionLabel(option, i);
    // Only include non-empty options
    if (label && label.trim() !== '') {
      // Add safe defaults for percentage and pool to prevent undefined errors
      const percentage = market.optionPercentages?.[i] ?? (100 / market.optionCount);
      const pool = market.optionPools?.[i] ?? 0;
      
      actualOptions.push({ 
        label, 
        index: i, 
        icon: optionsMetadata[i]?.icon,
        percentage: percentage,
        pool: pool
      });
    }
  }

  // Check if this is a binary market (Yes/No)
  const isBinaryMarket = actualOptions.length === 2 && 
    actualOptions.some(opt => opt.label.toLowerCase() === 'yes') &&
    actualOptions.some(opt => opt.label.toLowerCase() === 'no');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/markets')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Markets
          </button>
        </div>

        {/* Banner Section */}
        {market.assets?.banner && (
          <div className="mb-8 relative rounded-lg overflow-hidden">
            {/* Use aspect ratio container for consistent height */}
            <div className="relative w-full pb-[40%] md:pb-[30%] lg:pb-[25%]">
              <img 
                src={market.assets.banner} 
                alt={market.question}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: 'center 20%' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent" />
              
              {/* Market title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                  <div className="max-w-3xl">
                    <span className="inline-block px-3 py-1 bg-gray-900/80 backdrop-blur-sm rounded text-sm text-gray-300 mb-3">
                      {market.category}
                    </span>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
                      {market.question}
                    </h1>
                  </div>
                  <span className={`px-4 py-2 rounded text-sm font-medium self-start md:self-auto ${
                    market.status === 'Active' ? 'bg-green-600' : 
                    market.status === 'Resolved' ? 'bg-blue-600' : 'bg-gray-600'
                  } text-white shadow-lg`}>
                    {market.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* If no banner, show title here */}
            {!market.assets?.banner && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-700 rounded text-sm text-gray-300">
                    {market.category}
                  </span>
                  <span className={`px-3 py-1 rounded text-sm ${
                    market.status === 'Active' ? 'bg-green-600' : 
                    market.status === 'Resolved' ? 'bg-blue-600' : 'bg-gray-600'
                  } text-white`}>
                    {market.status}
                  </span>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {market.question}
                </h1>
              </div>
            )}

            {/* Market Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-gray-400 space-y-1">
                <p>Created by: <span className="font-mono">{market.creator.slice(0, 8)}...{market.creator.slice(-8)}</span></p>
                {market.resolutionDate && (
                  <p>
                    Ends: {(() => {
                      const date = new Date(market.resolutionDate);
                      // For tournament markets, show the actual match time in ET
                      if (market.tournament_id || market.matchMetadata) {
                        // Convert UTC to ET (EDT in June is UTC-4)
                        const etTime = new Date(date.getTime() - (4 * 60 * 60 * 1000));
                        return format(etTime, 'MMMM d, yyyy h:mm a') + ' ET';
                      }
                      // For other markets, show local time with timezone
                      return format(date, 'MMMM d, yyyy h:mm a zzz');
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* Market Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Market Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Total Volume</div>
                  <div className="text-xl font-bold text-white">{(market.totalVolume || 0).toFixed(2)} APES</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Min Bet</div>
                  <div className="text-xl font-bold text-white">{market.minBetAmount} APES</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Creator Fee</div>
                  <div className="text-xl font-bold text-white">{market.creatorFeeRate}%</div>
                </div>
              </div>
            </div>

            {/* Current Odds with Icons */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Current Odds</h2>
              <div className="space-y-4">
                {actualOptions.map((option, index) => {
                  return (
                    <div key={index} className="relative">
                      <div className="flex justify-between items-center text-white mb-2">
                        <div className="flex items-center gap-3">
                          {!isBinaryMarket && option.icon && (
                            <img 
                              src={option.icon} 
                              alt={option.label}
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <span className="font-bold">
                          {option.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-8">
                        <div 
                          className={`h-8 rounded-full flex items-center justify-end pr-3 text-sm font-medium text-white transition-all duration-300 ${
                            index === 0 ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 
                            index === 1 ? 'bg-gradient-to-r from-pink-600 to-red-600' :
                            index === 2 ? 'bg-gradient-to-r from-green-600 to-teal-600' :
                            'bg-gradient-to-r from-orange-600 to-yellow-600'
                          }`}
                          style={{ width: `${Math.max(option.percentage, 5)}%` }}
                        >
                          {option.pool.toFixed(2)} APES
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Trading Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-white mb-4">Market Actions</h2>

              {market.status === 'Active' ? (
                <>
                  <button
                    onClick={() => setShowPredictionModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90"
                  >
                    Place Prediction
                  </button>

                  {!publicKey && (
                    <p className="text-center text-yellow-400 text-sm mt-4">
                      Connect your wallet to place predictions
                    </p>
                  )}

                  {/* Info */}
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                    <p className="text-xs text-blue-400">
                      ℹ️ Platform fee (1%) goes to community treasury. Contract fee (2.5%) goes to PRIMAPE treasury.
                    </p>
                  </div>
                </>
              ) : market.status === 'Resolved' ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="mb-4">This market has been resolved</p>
                  {market.winningOption !== null && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <p className="text-green-400 font-semibold">
                        ✓ Winner: {getOptionLabel(market.options?.[market.winningOption], market.winningOption)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p>This market is {market.status.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Modal */}
      {showPredictionModal && (
        <PredictionModal
          market={market}
          isOpen={showPredictionModal}
          onClose={() => setShowPredictionModal(false)}
          onSuccess={handlePredictionSuccess}
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
  );
};

export default MarketDetailPage;
