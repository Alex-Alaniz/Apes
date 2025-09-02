import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { isWalletAuthorized } from '../config/access';
import Toast from '../components/Toast';
import { 
  Search, Filter, CheckCircle, XCircle, Clock, TrendingUp, 
  AlertCircle, RefreshCw, Play, Settings, BarChart3, 
  Globe, Target, Timer, Calendar, Award
} from 'lucide-react';

const AdminMarketApprovalPage = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  
  // State
  const [markets, setMarkets] = useState([]);
  const [selectedMarkets, setSelectedMarkets] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState([]);
  const [sources, setSources] = useState([]);
  const [scraperStats, setScraperStats] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    source: '',
    category: '',
    sport_type: '',
    time_category: '',
    min_quality_score: 0.5,
    sort_by: 'quality_score',
    sort_order: 'DESC'
  });
  
  // View modes
  const [viewMode, setViewMode] = useState('pending'); // pending, high-quality, stats
  const [autoApprovalSettings, setAutoApprovalSettings] = useState({
    enabled: false,
    min_score: 0.8,
    max_markets: 20,
    sources: []
  });

  // Check authorization
  useEffect(() => {
    if (publicKey) {
      const checkAuth = async () => {
        const authorized = await isWalletAuthorized(publicKey.toString());
        setIsAuthorized(authorized);
        
        if (authorized) {
          loadMarkets();
          loadSources();
          loadScraperStats();
        }
      };
      checkAuth();
    }
  }, [publicKey]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      
      let endpoint = '/api/mobile/scraped/pending';
      if (viewMode === 'high-quality') {
        endpoint = '/api/mobile/scraped/high-quality';
      }
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${apiUrl}${endpoint}?${params}`, {
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      setMarkets(data.markets || []);
      setStats(data.stats || []);
    } catch (error) {
      console.error('Error loading markets:', error);
      setToast({
        message: 'Failed to load markets',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/sources`, {
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadScraperStats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/scrapers/stats`, {
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScraperStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error loading scraper stats:', error);
    }
  };

  const handleApproveSelected = async (autoDeploy = false) => {
    if (selectedMarkets.size === 0) {
      setToast({
        message: 'Please select markets to approve',
        type: 'warning'
      });
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/scraped/approve-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify({
          market_ids: Array.from(selectedMarkets),
          auto_deploy: autoDeploy
        })
      });
      
      if (!response.ok) throw new Error('Failed to approve markets');
      
      const result = await response.json();
      setToast({
        message: `Approved ${result.approved_count} markets${autoDeploy ? ' for deployment' : ''}`,
        type: 'success'
      });
      
      setSelectedMarkets(new Set());
      loadMarkets();
    } catch (error) {
      console.error('Error approving markets:', error);
      setToast({
        message: 'Failed to approve markets',
        type: 'error'
      });
    }
  };

  const handleRejectSelected = async () => {
    if (selectedMarkets.size === 0) {
      setToast({
        message: 'Please select markets to reject',
        type: 'warning'
      });
      return;
    }
    
    const reason = prompt('Rejection reason (optional):');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/scraped/reject-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify({
          market_ids: Array.from(selectedMarkets),
          reason
        })
      });
      
      if (!response.ok) throw new Error('Failed to reject markets');
      
      const result = await response.json();
      setToast({
        message: `Rejected ${result.rejected_count} markets`,
        type: 'success'
      });
      
      setSelectedMarkets(new Set());
      loadMarkets();
    } catch (error) {
      console.error('Error rejecting markets:', error);
      setToast({
        message: 'Failed to reject markets',
        type: 'error'
      });
    }
  };

  const handleAutoApprove = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/scraped/auto-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify(autoApprovalSettings)
      });
      
      if (!response.ok) throw new Error('Failed to auto-approve');
      
      const result = await response.json();
      setToast({
        message: `Auto-approved ${result.approved_count} high-quality markets`,
        type: 'success'
      });
      
      loadMarkets();
    } catch (error) {
      console.error('Error auto-approving:', error);
      setToast({
        message: 'Failed to auto-approve markets',
        type: 'error'
      });
    }
  };

  const runScraper = async (source) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/mobile/scrapers/run/${source}`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) throw new Error('Failed to run scraper');
      
      setToast({
        message: `Started ${source} scraper`,
        type: 'success'
      });
      
      // Reload stats after a delay
      setTimeout(() => {
        loadScraperStats();
        loadMarkets();
      }, 5000);
    } catch (error) {
      console.error('Error running scraper:', error);
      setToast({
        message: `Failed to run ${source} scraper`,
        type: 'error'
      });
    }
  };

  const getQualityBadge = (score) => {
    if (score >= 0.8) return { color: 'bg-green-500', label: 'Excellent' };
    if (score >= 0.7) return { color: 'bg-blue-500', label: 'Good' };
    if (score >= 0.6) return { color: 'bg-yellow-500', label: 'Fair' };
    return { color: 'bg-gray-500', label: 'Low' };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Sports: '⚽',
      Crypto: '₿',
      Politics: '🏛️',
      Entertainment: '🎬',
      Finance: '💰',
      Technology: '💻',
      Science: '🔬'
    };
    return icons[category] || '📊';
  };

  const getTimeCategoryIcon = (timeCategory) => {
    const icons = {
      hourly: <Timer className="w-4 h-4" />,
      daily: <Calendar className="w-4 h-4" />,
      weekly: <Calendar className="w-4 h-4" />,
      monthly: <Calendar className="w-4 h-4" />
    };
    return icons[timeCategory] || <Clock className="w-4 h-4" />;
  };

  // Render loading state
  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access market approval</p>
        </div>
      </div>
    );
  }

  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
          <p className="text-gray-600 dark:text-gray-300">Your wallet is not authorized for admin access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Market Approval Pipeline</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage scraped markets from multiple sources
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              ← Back to Admin
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'pending' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setViewMode('high-quality')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'high-quality' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              High Quality
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'stats' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>

        {/* Stats View */}
        {viewMode === 'stats' && (
          <div className="space-y-6">
            {/* Scraper Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Scraper Performance (24h)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scraperStats.map(stat => (
                  <div key={stat.source} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white capitalize">{stat.source}</h3>
                      <button
                        onClick={() => runScraper(stat.source)}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="Run scraper now"
                      >
                        <Play className="w-4 h-4 text-green-400" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-400">
                        Runs: <span className="text-white">{stat.total_runs}</span>
                      </p>
                      <p className="text-gray-400">
                        Success Rate: <span className="text-green-400">
                          {((stat.successful_runs / stat.total_runs) * 100).toFixed(0)}%
                        </span>
                      </p>
                      <p className="text-gray-400">
                        Markets Saved: <span className="text-white">{stat.total_saved}</span>
                      </p>
                      <p className="text-gray-400">
                        Avg Duration: <span className="text-white">
                          {(stat.avg_duration_ms / 1000).toFixed(1)}s
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Market Sources</h2>
              <div className="space-y-3">
                {sources.map(source => (
                  <div key={source.name} className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white capitalize">{source.name}</h3>
                      <p className="text-sm text-gray-400">
                        Pending: {source.pending_count} | Approved: {source.approved_count}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        source.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {source.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray-400">
                        Every {source.scrape_interval_minutes}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Pending Markets by Source</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map(stat => (
                  <div key={stat.source} className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{stat.count}</div>
                    <div className="text-sm text-gray-400 capitalize">{stat.source}</div>
                    <div className="text-xs text-purple-400">
                      Avg Quality: {(stat.avg_quality * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Markets View */}
        {viewMode !== 'stats' && (
          <>
            {/* Filters and Actions */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters({...filters, source: e.target.value})}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">All Sources</option>
                    <option value="polymarket">Polymarket</option>
                    <option value="kalshi">Kalshi</option>
                    <option value="fanduel">FanDuel</option>
                  </select>
                  
                  <select
                    value={filters.time_category}
                    onChange={(e) => setFilters({...filters, time_category: e.target.value})}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">All Timeframes</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="">All Categories</option>
                    <option value="Sports">Sports</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Politics">Politics</option>
                    <option value="Finance">Finance</option>
                  </select>
                  
                  <button
                    onClick={loadMarkets}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveSelected(false)}
                    disabled={selectedMarkets.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Selected ({selectedMarkets.size})
                  </button>
                  <button
                    onClick={() => handleApproveSelected(true)}
                    disabled={selectedMarkets.size === 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Approve & Deploy
                  </button>
                  <button
                    onClick={() => handleRejectSelected()}
                    disabled={selectedMarkets.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Auto-approval settings */}
              {viewMode === 'high-quality' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={autoApprovalSettings.enabled}
                        onChange={(e) => setAutoApprovalSettings({
                          ...autoApprovalSettings,
                          enabled: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      Enable Auto-Approval
                    </label>
                    
                    {autoApprovalSettings.enabled && (
                      <>
                        <input
                          type="number"
                          value={autoApprovalSettings.min_score}
                          onChange={(e) => setAutoApprovalSettings({
                            ...autoApprovalSettings,
                            min_score: parseFloat(e.target.value)
                          })}
                          className="w-20 px-2 py-1 bg-gray-700 text-white rounded"
                          step="0.05"
                          min="0.5"
                          max="1"
                        />
                        <span className="text-gray-400">Min Score</span>
                        
                        <input
                          type="number"
                          value={autoApprovalSettings.max_markets}
                          onChange={(e) => setAutoApprovalSettings({
                            ...autoApprovalSettings,
                            max_markets: parseInt(e.target.value)
                          })}
                          className="w-20 px-2 py-1 bg-gray-700 text-white rounded"
                          min="1"
                          max="100"
                        />
                        <span className="text-gray-400">Max Markets</span>
                        
                        <button
                          onClick={handleAutoApprove}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                        >
                          Run Auto-Approval
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Select All */}
            {markets.length > 0 && (
              <div className="mb-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMarkets.size === markets.length && markets.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMarkets(new Set(markets.map(m => m.id)));
                      } else {
                        setSelectedMarkets(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span>Select all {markets.length} markets</span>
                </label>
              </div>
            )}

            {/* Markets Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : markets.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400">No markets found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {markets.map((market) => {
                  const qualityBadge = getQualityBadge(market.quality_score);
                  const isSelected = selectedMarkets.has(market.id);
                  
                  return (
                    <div 
                      key={market.id}
                      className={`bg-gray-800 rounded-lg p-6 border-2 transition-all ${
                        isSelected ? 'border-purple-500' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Selection */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedMarkets);
                            if (e.target.checked) {
                              newSet.add(market.id);
                            } else {
                              newSet.delete(market.id);
                            }
                            setSelectedMarkets(newSet);
                          }}
                          className="mt-1 w-4 h-4"
                        />

                        {/* Market Content */}
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-semibold text-white mb-1">
                                {market.question}
                              </h3>
                              <p className="text-sm text-gray-400">{market.description}</p>
                            </div>
                            
                            {/* Quality Score */}
                            <div className="text-center">
                              <div className={`px-3 py-1 rounded-lg ${qualityBadge.color} text-white`}>
                                <div className="text-lg font-bold">
                                  {(market.quality_score * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs">{qualityBadge.label}</div>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-3 mb-3 text-sm">
                            <span className="flex items-center gap-1 text-gray-400">
                              <Globe className="w-4 h-4" />
                              {market.source}
                            </span>
                            
                            <span className="flex items-center gap-1 text-gray-400">
                              {getCategoryIcon(market.category)}
                              {market.category}
                            </span>
                            
                            {market.sport_type && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                {market.sport_type.toUpperCase()}
                              </span>
                            )}
                            
                            <span className="flex items-center gap-1 text-gray-400">
                              {getTimeCategoryIcon(market.time_category)}
                              {market.time_category}
                            </span>
                            
                            {market.event_date && (
                              <span className="text-gray-400">
                                Event: {new Date(market.event_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Options */}
                          <div className="flex gap-2 mb-3">
                            {market.options?.map((option, i) => (
                              <div key={i} className="px-3 py-1 bg-gray-700 rounded-lg">
                                <span className="text-white">{option}</span>
                                {market.options_metadata?.[i]?.price && (
                                  <span className="text-gray-400 text-sm ml-2">
                                    {(market.options_metadata[i].price * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <a
                              href={market.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              View on {market.source}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
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

export default AdminMarketApprovalPage;