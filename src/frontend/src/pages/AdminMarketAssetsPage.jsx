import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { isWalletAuthorized } from '../config/access';
import { Image, Save, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import Toast from '../components/Toast';
import marketService from '../services/marketService';

const AdminMarketAssetsPage = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [editingAssets, setEditingAssets] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'needs-assets', 'has-assets'
  
  // Check authorization
  const isAuthorized = publicKey && isWalletAuthorized(publicKey.toString());
  
  useEffect(() => {
    if (publicKey && isAuthorized) {
      fetchMarkets();
    }
  }, [publicKey, isAuthorized]);
  
  const fetchMarkets = async () => {
    try {
      setLoading(true);
      
      // First, fetch ALL markets from the blockchain
      const blockchainMarkets = await marketService.fetchMarketsWithStats();
      console.log(`Found ${blockchainMarkets.length} markets on blockchain`);
      
      // Then fetch database markets to get any existing assets
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/markets`);
      let dbMarkets = [];
      if (response.ok) {
        dbMarkets = await response.json();
        console.log(`Found ${dbMarkets.length} markets in database`);
      }
      
      // Create a map of database markets by address for quick lookup
      const dbMarketsMap = new Map();
      dbMarkets.forEach(market => {
        dbMarketsMap.set(market.market_address || market.publicKey, market);
      });
      
      // Merge blockchain markets with database assets (if any)
      const mergedMarkets = blockchainMarkets.map(blockchainMarket => {
        const dbMarket = dbMarketsMap.get(blockchainMarket.publicKey);
        
        return {
          ...blockchainMarket,
          // Use database assets if available, otherwise empty
          assets: dbMarket?.assets || blockchainMarket.assets || {},
          options_metadata: dbMarket?.options_metadata || blockchainMarket.optionsMetadata || [],
          // Ensure we have the market address
          market_address: blockchainMarket.publicKey
        };
      });
      
      // Normalize all markets to ensure proper structure
      const normalizedMarkets = mergedMarkets.map(market => ({
        ...market,
        assets: market.assets || {},
        options_metadata: market.options_metadata || [],
        options: market.options || []
      }));
      
      setMarkets(normalizedMarkets);
      console.log(`Loaded ${normalizedMarkets.length} total markets for asset management`);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setToast({
        message: 'Failed to fetch markets',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditMarket = (market) => {
    setSelectedMarket(market);
    // Parse existing assets
    const assets = market.assets || {};
    const optionsMetadata = market.options_metadata || [];
    
    setEditingAssets({
      banner: assets.banner || '',
      options: market.options.map((opt, idx) => ({
        label: opt,
        icon: optionsMetadata[idx]?.icon || ''
      }))
    });
  };
  
  const handleSaveAssets = async () => {
    if (!selectedMarket || !editingAssets) return;
    
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/admin/update-market-assets/${selectedMarket.market_address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify({
          assets: {
            banner: editingAssets.banner,
            icon: editingAssets.banner // Use banner as fallback icon
          },
          options_metadata: editingAssets.options.map(opt => ({
            label: opt.label,
            icon: opt.icon
          }))
        })
      });
      
      if (response.ok) {
        setToast({
          message: 'Market assets updated successfully!',
          type: 'success'
        });
        
        // Refresh markets
        fetchMarkets();
        
        // Close editor
        setSelectedMarket(null);
        setEditingAssets(null);
      } else {
        throw new Error('Failed to update assets');
      }
    } catch (error) {
      console.error('Error saving assets:', error);
      setToast({
        message: 'Failed to save market assets',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Filter markets based on asset status
  const filteredMarkets = markets.filter(market => {
    const hasAssets = market.assets?.banner || (market.options_metadata && market.options_metadata.some(om => om?.icon));
    
    if (filter === 'needs-assets') return !hasAssets;
    if (filter === 'has-assets') return hasAssets;
    return true; // 'all' filter
  });
  
  if (!publicKey || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access admin features</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Market Assets Manager</h1>
          <p className="text-gray-400">Add or edit banner images and option icons for markets</p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-green-400">✓</span> Assets are saved to your local database only. Polymarket data is never modified.
          </p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Markets ({markets.length})
          </button>
          <button
            onClick={() => setFilter('needs-assets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'needs-assets' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Needs Assets ({markets.filter(m => {
              const hasAssets = m.assets?.banner || (m.options_metadata && m.options_metadata.some(om => om?.icon));
              return !hasAssets;
            }).length})
          </button>
          <button
            onClick={() => setFilter('has-assets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'has-assets' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Has Assets ({markets.filter(m => {
              const hasAssets = m.assets?.banner || (m.options_metadata && m.options_metadata.some(om => om?.icon));
              return hasAssets;
            }).length})
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'needs-assets' 
                ? 'All Markets Have Assets!' 
                : filter === 'has-assets'
                ? 'No Markets With Assets Yet'
                : 'No Markets Found'}
            </h3>
            <p className="text-gray-400">
              {filter === 'needs-assets' 
                ? 'Great job! All your markets have banner images or icons.' 
                : filter === 'has-assets'
                ? 'Start by adding assets to your markets.'
                : 'Create some markets first to manage their assets.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMarkets.map((market) => {
              const hasAssets = market.assets?.banner || (market.options_metadata && market.options_metadata.some(om => om?.icon));
              
              return (
                <div key={market.market_address} className={`bg-gray-800 rounded-lg p-6 border ${hasAssets ? 'border-gray-700' : 'border-yellow-600/50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{market.question}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <span className={`inline-block w-2 h-2 rounded-full ${hasAssets ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          {hasAssets ? 'Has assets' : 'No assets - needs images!'}
                        </span>
                        <span>{market.options.length} options</span>
                        <span className="font-mono text-xs">{market.market_address.slice(0, 8)}...</span>
                      </div>
                      
                      {/* Preview current assets or show placeholder */}
                      <div className="flex items-center gap-3">
                        {market.assets?.banner ? (
                          <div className="group relative">
                            <img 
                              src={market.assets.banner} 
                              alt="Banner" 
                              className="w-20 h-12 object-cover rounded border border-gray-600"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                              <span className="text-xs text-white">Banner</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                            <span className="text-xs text-gray-500">No banner</span>
                          </div>
                        )}
                        
                        {market.options_metadata?.filter(om => om?.icon).length > 0 ? (
                          market.options_metadata.filter(om => om?.icon).map((om, idx) => (
                            <div key={idx} className="group relative">
                              <img 
                                src={om.icon} 
                                alt={om.label} 
                                className="w-10 h-10 object-cover rounded border border-gray-600"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                <span className="text-xs text-white text-center">{idx + 1}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-1">
                            {market.options.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                                <span className="text-xs text-gray-500">{idx + 1}</span>
                              </div>
                            ))}
                            {market.options.length > 3 && (
                              <span className="text-xs text-gray-500 ml-1">+{market.options.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEditMarket(market)}
                      className={`px-4 py-2 ${hasAssets ? 'bg-purple-600 hover:bg-purple-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white rounded-lg font-medium transition-colors flex items-center gap-2`}
                    >
                      <Image className="w-4 h-4" />
                      {hasAssets ? 'Edit Assets' : 'Add Assets'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      {selectedMarket && editingAssets && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Edit Market Assets</h2>
              <p className="text-gray-400 mb-6">{selectedMarket.question}</p>
              
              {/* Banner Image */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Banner Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingAssets.banner}
                    onChange={(e) => setEditingAssets({
                      ...editingAssets,
                      banner: e.target.value
                    })}
                    placeholder="https://example.com/banner.jpg"
                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  {editingAssets.banner && (
                    <a
                      href={editingAssets.banner}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {editingAssets.banner && (
                  <div className="mt-2">
                    <img 
                      src={editingAssets.banner} 
                      alt="Banner preview" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-600"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
              
              {/* Option Icons */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Option Icons</h3>
                {editingAssets.options.map((option, idx) => (
                  <div key={idx} className="bg-gray-700/50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {option.label}
                    </label>
                    <div className="flex gap-2 items-start">
                      <input
                        type="url"
                        value={option.icon}
                        onChange={(e) => {
                          const newOptions = [...editingAssets.options];
                          newOptions[idx] = { ...option, icon: e.target.value };
                          setEditingAssets({ ...editingAssets, options: newOptions });
                        }}
                        placeholder="https://example.com/icon.jpg"
                        className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      {option.icon && (
                        <>
                          <a
                            href={option.icon}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <img 
                            src={option.icon} 
                            alt={`${option.label} icon`} 
                            className="w-10 h-10 object-cover rounded border border-gray-600"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedMarket(null);
                    setEditingAssets(null);
                  }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssets}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Assets
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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

export default AdminMarketAssetsPage; 