import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import MarketList from '../components/MarketList';
import PredictionModal from '../components/PredictionModal';
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
      
      console.log('🔄 Loading markets...');
      const fetchedMarkets = await blockchainMarketsService.fetchMarketsWithFallback();
      
      console.log(`✅ Loaded ${fetchedMarkets.length} markets`);
      setMarkets(fetchedMarkets);
      
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

    // Reload markets to update the data
    await loadMarkets();
  };

  const filteredMarkets = markets.filter(market => {
    if (filter === 'all') return true;
    if (filter === 'active') return market.status === 'Active';
    if (filter === 'resolved') return market.status === 'Resolved';
    if (filter === 'my-bets' && publicKey) {
      // This would need to check user's predictions
      return false; // Implement later
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prediction Markets</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active markets: {markets.length}
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
            Active ({markets.filter(m => m.status === 'Active').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'resolved' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Resolved ({markets.filter(m => m.status === 'Resolved').length})
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading markets...</p>
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
          <MarketList markets={filteredMarkets} onPredict={handlePredictClick} />
        )}

        {/* Prediction Modal */}
        <PredictionModal
          market={selectedMarket}
          isOpen={showPredictionModal}
          onClose={() => setShowPredictionModal(false)}
          onSuccess={handlePredictionSuccess}
        />

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