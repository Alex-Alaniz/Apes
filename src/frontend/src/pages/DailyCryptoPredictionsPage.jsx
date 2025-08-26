import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiCalendar, FiClock } from 'react-icons/fi';
import MarketCard from '../components/MarketCard';
import LoadingSpinner from '../components/LoadingSpinner';
import marketService from '../services/marketService';

/**
 * Daily Crypto Predictions Page
 * Shows Bitcoin, Ethereum, and Solana price prediction markets
 */
function DailyCryptoPredictionsPage() {
  const { publicKey } = useWallet();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDailyCryptoMarkets();
  }, []);

  const loadDailyCryptoMarkets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/markets/daily-crypto`);
      const data = await response.json();
      
      if (data.success) {
        setMarkets(data.markets || []);
      } else {
        setError('Failed to load daily crypto markets');
      }
    } catch (err) {
      console.error('Error loading daily crypto markets:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const createDailyMarkets = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setCreating(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/markets/daily-crypto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadDailyCryptoMarkets(); // Reload markets
        alert(`✅ Successfully created ${data.markets.length} daily crypto prediction markets!`);
      } else {
        alert(`❌ Failed to create markets: ${data.error}`);
      }
    } catch (err) {
      console.error('Error creating daily markets:', err);
      alert('❌ Failed to create daily crypto markets');
    } finally {
      setCreating(false);
    }
  };

  const getCryptoIcon = (symbol) => {
    const icons = {
      'BTC': '₿',
      'ETH': 'Ξ', 
      'SOL': '◎'
    };
    return icons[symbol] || '🪙';
  };

  const extractCryptoSymbol = (question) => {
    if (question.includes('Bitcoin')) return 'BTC';
    if (question.includes('Ethereum')) return 'ETH';
    if (question.includes('Solana')) return 'SOL';
    return 'CRYPTO';
  };

  const formatTimeRemaining = (resolutionDate) => {
    const now = new Date();
    const resolution = new Date(resolutionDate);
    const diff = resolution.getTime() - now.getTime();
    
    if (diff <= 0) return 'Market closed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-400">Loading daily crypto predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <span className="text-5xl">🔮</span>
            Daily Crypto Predictions
            <span className="text-5xl">📈</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Predict tomorrow's closing prices for Bitcoin, Ethereum, and Solana. 
            New markets created daily at midnight UTC.
          </p>
        </motion.div>
      </div>

      {/* Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30 p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-400">{markets.length}</div>
            <div className="text-sm text-gray-300">Active Markets Today</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">
              {markets.reduce((sum, market) => sum + (market.total_volume || 0), 0).toFixed(0)}
            </div>
            <div className="text-sm text-gray-300">Total Volume (APES)</div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <FiClock className="h-5 w-5 text-yellow-400" />
            <span className="text-yellow-400 font-medium">
              {markets.length > 0 ? formatTimeRemaining(markets[0].resolution_date) : 'No active markets'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Markets Grid */}
      {markets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {markets.map((market, index) => (
            <motion.div
              key={market.market_address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className="relative"
            >
              {/* Crypto Symbol Badge */}
              <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 border border-gray-600">
                <span className="text-2xl">
                  {getCryptoIcon(extractCryptoSymbol(market.question))}
                </span>
                <span className="ml-2 text-sm font-medium text-white">
                  {extractCryptoSymbol(market.question)}
                </span>
              </div>

              <MarketCard 
                market={market}
                showCategory={false}
                className="hover:shadow-2xl transition-all duration-300"
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* No Markets State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Daily Markets Yet</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Daily crypto prediction markets haven't been created yet. 
            {publicKey ? ' Create them now to start predicting!' : ' Connect your wallet to create markets.'}
          </p>
          
          {publicKey && (
            <button
              onClick={createDailyMarkets}
              disabled={creating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {creating ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating Markets...
                </>
              ) : (
                <>
                  <FiCalendar className="h-5 w-5" />
                  Create Today's Markets
                </>
              )}
            </button>
          )}
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 text-center"
        >
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Markets</h3>
          <p className="text-red-300">{error}</p>
          <button
            onClick={loadDailyCryptoMarkets}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12 bg-gray-800/50 rounded-xl border border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-xl">ℹ️</span>
          How Daily Crypto Predictions Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <strong className="text-white">• Market Creation:</strong> New markets created daily at midnight UTC
          </div>
          <div>
            <strong className="text-white">• Resolution:</strong> Markets resolve at 11:59 PM UTC the next day
          </div>
          <div>
            <strong className="text-white">• Price Source:</strong> Closing prices from CoinGecko API
          </div>
          <div>
            <strong className="text-white">• Betting Token:</strong> APES tokens with 2.5% burn on bets
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default DailyCryptoPredictionsPage;