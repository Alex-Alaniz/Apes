import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import MarketList from '../components/MarketList';
import PredictionModal from '../components/PredictionModal';
import Toast from '../components/Toast';
import marketService from '../services/marketService';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [toast, setToast] = useState(null);
  const { wallet, publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (wallet && connected && publicKey) {
      // Create a wallet object that matches what AnchorProvider expects
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction: signTransaction,
        signAllTransactions: signAllTransactions
      };
      marketService.initialize(walletAdapter);
    }
    loadMarkets();
  }, [wallet, connected, publicKey, signTransaction, signAllTransactions]);

  // Restore scroll position after markets update
  useEffect(() => {
    if (!loading && scrollPositionRef.current > 0) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [loading]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const fetchedMarkets = await marketService.fetchMarketsWithStats();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prediction Markets</h1>
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
            All Markets
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'active' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'resolved' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Resolved
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
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'my-bets' 
                ? 'You haven\'t placed any bets yet.' 
                : 'No markets found.'}
            </p>
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