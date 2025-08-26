import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiCheck, FiX, FiClock, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Admin Crypto Markets Page - Review and approve oracle-identified opportunities
 */
function AdminCryptoMarketsPage() {
  const { publicKey } = useWallet();
  const [pendingMarkets, setPendingMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (publicKey) {
      loadPendingMarkets();
    }
  }, [publicKey]);

  const loadPendingMarkets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/pending-crypto-markets`);
      const data = await response.json();
      
      if (data.success) {
        setPendingMarkets(data.markets || []);
      } else {
        setError('Failed to load pending crypto markets');
      }
    } catch (err) {
      console.error('Error loading pending crypto markets:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const runOracleScan = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/run-crypto-oracle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Oracle scan complete! Found ${data.opportunities} opportunities, queued ${data.queued} for review.`);
        await loadPendingMarkets();
      } else {
        alert(`❌ Oracle scan failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Error running oracle scan:', err);
      alert('❌ Failed to run oracle scan');
    } finally {
      setLoading(false);
    }
  };

  const approveAndDeploy = async (marketId, cryptoSymbol) => {
    if (!confirm(`Deploy ${cryptoSymbol} prediction market on-chain?`)) return;
    
    try {
      setDeploying(prev => ({ ...prev, [marketId]: true }));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/deploy-crypto-market/${marketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString()
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${cryptoSymbol} market deployed successfully!\\nMarket: ${data.market_address}\\nTransaction: ${data.transaction_signature}`);
        await loadPendingMarkets();
      } else {
        alert(`❌ Deployment failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deploying market:', err);
      alert(`❌ Failed to deploy ${cryptoSymbol} market`);
    } finally {
      setDeploying(prev => ({ ...prev, [marketId]: false }));
    }
  };

  const rejectMarket = async (marketId, cryptoSymbol) => {
    const reason = prompt(`Why are you rejecting the ${cryptoSymbol} market?`);
    if (!reason) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/reject-crypto-market/${marketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString()
        },
        body: JSON.stringify({ reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${cryptoSymbol} market rejected`);
        await loadPendingMarkets();
      } else {
        alert(`❌ Failed to reject market: ${data.error}`);
      }
    } catch (err) {
      console.error('Error rejecting market:', err);
      alert(`❌ Failed to reject ${cryptoSymbol} market`);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'approved': return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
      case 'deployed': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'rejected': return 'text-red-400 bg-red-400/20 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 6) return 'text-green-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-400">Please connect your admin wallet to review crypto market opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🔮 Crypto Market Oracle</h1>
          <p className="text-gray-300">Review AI-identified market opportunities and deploy approved markets on-chain</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadPendingMarkets}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={runOracleScan}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : <FiTrendingUp className="h-4 w-4" />}
            Run Oracle Scan
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Pending Review', 
            count: pendingMarkets.filter(m => m.status === 'pending').length,
            color: 'text-yellow-400',
            icon: FiClock
          },
          { 
            label: 'Approved', 
            count: pendingMarkets.filter(m => m.status === 'approved').length,
            color: 'text-blue-400',
            icon: FiCheck
          },
          { 
            label: 'Deployed', 
            count: pendingMarkets.filter(m => m.status === 'deployed').length,
            color: 'text-green-400',
            icon: FiDollarSign
          },
          { 
            label: 'Rejected', 
            count: pendingMarkets.filter(m => m.status === 'rejected').length,
            color: 'text-red-400',
            icon: FiX
          }
        ].map((stat, index) => (
          <div key={index} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 text-center mb-8">
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Markets</h3>
          <p className="text-red-300">{error}</p>
          <button
            onClick={loadPendingMarkets}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Markets List */}
      {loading && pendingMarkets.length === 0 ? (
        <div className="text-center py-16">
          <LoadingSpinner />
          <p className="mt-4 text-gray-400">Loading market opportunities...</p>
        </div>
      ) : pendingMarkets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Opportunities Found</h2>
          <p className="text-gray-400 mb-8">Run an oracle scan to identify new crypto market opportunities.</p>
          <button
            onClick={runOracleScan}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
          >
            Run Oracle Scan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingMarkets.map((market) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                {/* Market Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{getCryptoIcon(market.crypto_symbol)}</div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{market.crypto_name} ({market.crypto_symbol})</h3>
                      <p className="text-gray-300">${market.current_price.toFixed(2)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(market.status)}`}>
                      {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">24h Change</div>
                      <div className={`text-lg font-medium flex items-center gap-1 ${
                        market.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {market.change_24h >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                        {market.change_24h >= 0 ? '+' : ''}{market.change_24h.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">24h Volume</div>
                      <div className="text-lg font-medium text-white">
                        ${(market.volume_24h / 1000000000).toFixed(2)}B
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Opportunity Score</div>
                      <div className={`text-lg font-medium ${getScoreColor(market.opportunity_score)}`}>
                        {market.opportunity_score}/8
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-2">Oracle Reasoning</div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(market.reasons || '[]').map((reason, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-sm text-blue-300"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Market Question</div>
                    <p className="text-white">{market.market_question}</p>
                  </div>
                </div>

                {/* Actions */}
                {market.status === 'pending' && (
                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      onClick={() => approveAndDeploy(market.id, market.crypto_symbol)}
                      disabled={deploying[market.id]}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {deploying[market.id] ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <FiCheck className="h-4 w-4" />
                          Approve & Deploy
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => rejectMarket(market.id, market.crypto_symbol)}
                      className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FiX className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}

                {market.status === 'deployed' && market.deployed_market_address && (
                  <div className="ml-6 text-right">
                    <div className="text-sm text-gray-400">Market Address</div>
                    <div className="text-sm text-green-400 font-mono">
                      {market.deployed_market_address.slice(0, 8)}...
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-12 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-3">🤖 How the Oracle Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <strong className="text-white">• Market Analysis:</strong> Evaluates price volatility, trading volume, and market conditions
          </div>
          <div>
            <strong className="text-white">• Smart Scoring:</strong> Assigns 0-8 score based on prediction market potential
          </div>
          <div>
            <strong className="text-white">• Quality Control:</strong> Admin approval required before on-chain deployment
          </div>
          <div>
            <strong className="text-white">• Automated Discovery:</strong> Runs daily at 11:30 PM UTC to identify opportunities
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCryptoMarketsPage;