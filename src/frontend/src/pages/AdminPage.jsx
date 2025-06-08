import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import marketService from '../services/marketService';
import { isWalletAuthorized } from '../config/access';
import Toast from '../components/Toast';
import { PublicKey } from '@solana/web3.js';

const AdminPage = () => {
  const { publicKey, connected, wallet } = useWallet();
  const walletAdapter = wallet?.adapter;
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingMarket, setResolvingMarket] = useState({});
  const [syncingMarket, setSyncingMarket] = useState({});
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, resolved
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [syncingVolumes, setSyncingVolumes] = useState(false);

  // Initialize market service and check authorization
  useEffect(() => {
    const initService = async () => {
      if (walletAdapter && publicKey) {
        try {
          // Use actual Phantom wallet with signAndSendTransaction method
          const phantomWallet = window.phantom?.solana;
          if (phantomWallet && typeof phantomWallet.signAndSendTransaction === 'function') {
            await marketService.initialize(phantomWallet);
            setServiceInitialized(true);
            
            // Check if wallet is authorized
            const walletAddress = publicKey.toString();
            const authorized = isWalletAuthorized(walletAddress);
            setIsAuthorized(authorized);
            
            if (authorized) {
              loadMarkets();
            }
          } else {
            throw new Error('Please use Phantom wallet for admin features');
          }
        } catch (error) {
          console.error('Failed to initialize market service:', error);
          setToast({
            message: error.message || 'Failed to initialize market service',
            type: 'error'
          });
          setServiceInitialized(false);
        }
      } else {
        setServiceInitialized(false);
        setIsAuthorized(false);
      }
    };

    initService();
  }, [walletAdapter, publicKey]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      // Call admin-specific endpoint to get ALL markets (including resolved)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      // Add cache busting for admin refresh to force fresh data
      const cacheBuster = Date.now();
      
      const response = await fetch(`${apiUrl}/api/admin/markets?t=${cacheBuster}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Force refresh for admin
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        // Handle rate limiting gracefully
        if (response.status === 429) {
          setToast({
            message: 'Rate limit exceeded. Please wait a moment before refreshing.',
            type: 'warning'
          });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const adminMarkets = await response.json();
      
      // Transform admin markets to match the frontend format
      const transformedMarkets = adminMarkets.map(market => ({
        ...market,
        publicKey: market.market_address,
        options: market.options || [],
        totalVolume: parseFloat(market.total_volume || 0),
        optionPools: market.option_volumes || [],
        optionProbabilities: market.option_volumes 
          ? market.option_volumes.map(vol => (vol / market.option_volumes.reduce((a, b) => a + b, 1)) * 100)
          : [],
        winningOption: market.resolved_option,
        resolutionDate: market.resolution_date
      }));
      
      console.log(`🔧 Admin: Loaded ${transformedMarkets.length} markets (including resolved)`);
      setMarkets(transformedMarkets);
    } catch (error) {
      console.error('Error loading admin markets:', error);
      
      // More specific error handling
      if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
        setToast({
          message: 'Rate limit exceeded. Please wait a moment before refreshing.',
          type: 'warning'
        });
      } else {
        setToast({
          message: 'Failed to load markets. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolveMarket = async (marketPubkey, winningOption) => {
    if (!serviceInitialized) {
      setToast({
        message: 'Market service not initialized. Please try reconnecting your wallet.',
        type: 'error'
      });
      return;
    }

    setResolvingMarket(prev => ({ ...prev, [marketPubkey]: true }));
    
    try {
      const result = await marketService.resolveMarket(marketPubkey, winningOption);
      
      if (result.warning) {
        setToast({
          message: `Market resolution submitted! ${result.warning} The database will sync automatically.`,
          type: 'warning'
        });
      } else {
        setToast({
          message: `Market resolved successfully! TX: ${result.transaction.slice(0, 8)}... Database will sync automatically.`,
          type: 'success'
        });
      }
      
      // Reload markets after a longer delay to allow for blockchain confirmation and sync
      setTimeout(loadMarkets, 5000);
    } catch (error) {
      console.error('Error resolving market:', error);
      setToast({
        message: error.message || 'Failed to resolve market',
        type: 'error'
      });
    } finally {
      setResolvingMarket(prev => ({ ...prev, [marketPubkey]: false }));
    }
  };

  const handleManualSync = async (marketPubkey) => {
    setSyncingMarket(prev => ({ ...prev, [marketPubkey]: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/admin/sync-market-resolution/${marketPubkey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.wasResolved) {
        setToast({
          message: `Market synced! Now shows as resolved with winner: Option ${result.winningOption}`,
          type: 'success'
        });
      } else if (result.success && !result.wasResolved) {
        setToast({
          message: 'Market is still active on blockchain - no resolution to sync',
          type: 'info'
        });
      } else {
        setToast({
          message: result.error || 'Failed to sync market resolution',
          type: 'error'
        });
      }
      
      // Reload markets to show updated status
      setTimeout(loadMarkets, 1000);
    } catch (error) {
      console.error('Error syncing market:', error);
      setToast({
        message: error.message || 'Failed to sync market resolution',
        type: 'error'
      });
    } finally {
      setSyncingMarket(prev => ({ ...prev, [marketPubkey]: false }));
    }
  };

  const handleForceSync = async () => {
    setSyncingVolumes(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/markets/force-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setToast({
          message: `Force sync completed! Updated ${result.synced}/${result.total} markets with volume data.`,
          type: 'success'
        });
        
        // Reload markets to show updated data
        setTimeout(loadMarkets, 1000);
      } else {
        throw new Error(result.error || 'Force sync failed');
      }
    } catch (error) {
      console.error('Error force syncing markets:', error);
      setToast({
        message: error.message || 'Failed to force sync markets',
        type: 'error'
      });
    } finally {
      setSyncingVolumes(false);
    }
  };

  const filteredMarkets = markets.filter(market => {
    if (filter === 'active') return market.status === 'Active';
    if (filter === 'resolved') return market.status === 'Resolved';
    return true;
  });

  // Show unauthorized message if wallet is connected but not authorized
  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your wallet <span className="font-mono text-sm">{publicKey.toString()}</span> is not authorized to access admin features.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Only deployer and treasury wallets can manage markets.
              </p>
              <button
                onClick={() => navigate('/markets')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Back to Markets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access admin features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and resolve markets</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Connected as: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => navigate('/create-market')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90"
          >
            Create New Market
          </button>
          <button
            onClick={() => navigate('/admin/deploy-markets')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:opacity-90"
          >
            Deploy from Polymarket
          </button>
          <button
            onClick={() => navigate('/admin/assets')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:opacity-90"
          >
            Manage Assets
          </button>
          <button
            onClick={handleForceSync}
            disabled={syncingVolumes}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {syncingVolumes ? 'Syncing...' : 'Force Sync Volumes'}
          </button>
          <button
            onClick={loadMarkets}
            disabled={loading}
            className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Markets'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Markets ({markets.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'active' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Active ({markets.filter(m => m.status === 'Active').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'resolved' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Resolved ({markets.filter(m => m.status === 'Resolved').length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">
              {filter === 'all' 
                ? "No markets found" 
                : `No ${filter} markets found`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMarkets.map((market) => (
              <div key={market.publicKey} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {market.question}
                    </h3>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Market ID: <span className="font-mono">{market.publicKey.slice(0, 16)}...</span></p>
                      <p>Status: <span className={`font-medium ${
                        market.status === 'Active' ? 'text-green-400' : 
                        market.status === 'Resolved' ? 'text-blue-400' : 'text-gray-400'
                      }`}>{market.status}</span></p>
                      <p>Total Volume: {(market.totalVolume || 0).toFixed(2)} APES</p>
                      <p>Category: {market.category}</p>
                      {market.resolutionDate && (
                        <p>Resolution Date: {new Date(market.resolutionDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Options with current odds */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {market.options.map((option, index) => (
                    <div key={index} className={`rounded-lg p-4 ${
                      market.status === 'Resolved' && market.winningOption === index
                        ? 'bg-green-900/30 border border-green-500/30'
                        : 'bg-gray-700'
                    }`}>
                      <div className="text-sm text-gray-400 mb-1">Option {index + 1}</div>
                      <div className="font-medium text-white mb-2">{option}</div>
                      <div className="text-2xl font-bold text-white">
                        {(market.optionProbabilities?.[index] || 0).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">
                        {(market.optionPools?.[index] || 0).toFixed(2)} APES
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resolution and Sync Section */}
                {market.status === 'Active' && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-400">Resolve Market</h4>
                      <button
                        onClick={() => handleManualSync(market.publicKey)}
                        disabled={syncingMarket[market.publicKey]}
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {syncingMarket[market.publicKey] ? 'Syncing...' : 'Sync Status'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {market.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleResolveMarket(market.publicKey, index)}
                          disabled={resolvingMarket[market.publicKey]}
                          className="py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-700 text-white hover:bg-gray-600"
                        >
                          {resolvingMarket[market.publicKey] 
                            ? 'Resolving...' 
                            : `Resolve: ${option} Wins`}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 After resolving onchain, the status will sync automatically. Use "Sync Status" if needed.
                    </p>
                  </div>
                )}

                {/* Show winner if resolved */}
                {market.status === 'Resolved' && market.winningOption !== null && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <p className="text-green-400 font-medium">
                          ✓ Resolved - Winner: {market.options?.[market.winningOption]}
                        </p>
                        <button
                          onClick={() => handleManualSync(market.publicKey)}
                          disabled={syncingMarket[market.publicKey]}
                          className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                          {syncingMarket[market.publicKey] ? 'Syncing...' : 'Re-sync'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

export default AdminPage; 