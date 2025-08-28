import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { isWalletAuthorized } from '../config/access';
import Toast from '../components/Toast';

const AdminMobileMarketsPage = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // all, approved, pending
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [updatingMarkets, setUpdatingMarkets] = useState({});
  const [bulkAction, setBulkAction] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState(new Set());

  // Check authorization
  useEffect(() => {
    if (publicKey) {
      const walletAddress = publicKey.toString();
      const authorized = isWalletAuthorized(walletAddress);
      setIsAuthorized(authorized);
      
      if (authorized) {
        loadMarkets();
      }
    }
  }, [publicKey]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      
      // Fetch all active markets with mobile approval status
      const response = await fetch(`${apiUrl}/api/admin/markets/mobile-status`, {
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📱 Loaded ${data.length} markets for mobile approval management`);
      setMarkets(data);
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

  const handleApprovalToggle = async (marketAddress, currentStatus) => {
    setUpdatingMarkets(prev => ({ ...prev, [marketAddress]: true }));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const newStatus = !currentStatus;
      
      const response = await fetch(`${apiUrl}/api/mobile/markets/${marketAddress}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify({ approved: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setToast({
          message: `Market ${newStatus ? 'approved' : 'removed'} for mobile!`,
          type: 'success'
        });
        
        // Update local state
        setMarkets(prev => prev.map(m => 
          m.market_address === marketAddress 
            ? { ...m, mobile_approved: newStatus }
            : m
        ));
      }
    } catch (error) {
      console.error('Error updating market approval:', error);
      setToast({
        message: 'Failed to update market approval',
        type: 'error'
      });
    } finally {
      setUpdatingMarkets(prev => ({ ...prev, [marketAddress]: false }));
    }
  };

  const handleBulkAction = async () => {
    if (selectedMarkets.size === 0) {
      setToast({
        message: 'Please select markets first',
        type: 'warning'
      });
      return;
    }

    const action = bulkAction === 'approve';
    const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
    
    try {
      // Process each selected market
      const promises = Array.from(selectedMarkets).map(marketAddress => 
        fetch(`${apiUrl}/api/mobile/markets/${marketAddress}/approval`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': publicKey.toString()
          },
          body: JSON.stringify({ approved: action })
        })
      );

      await Promise.all(promises);
      
      setToast({
        message: `${selectedMarkets.size} markets ${action ? 'approved' : 'removed'} for mobile!`,
        type: 'success'
      });

      // Clear selections and reload
      setSelectedMarkets(new Set());
      setBulkAction('');
      loadMarkets();
    } catch (error) {
      console.error('Error in bulk action:', error);
      setToast({
        message: 'Failed to complete bulk action',
        type: 'error'
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedMarkets.size === filteredMarkets.length) {
      setSelectedMarkets(new Set());
    } else {
      setSelectedMarkets(new Set(filteredMarkets.map(m => m.market_address)));
    }
  };

  const toggleMarketSelection = (marketAddress) => {
    const newSet = new Set(selectedMarkets);
    if (newSet.has(marketAddress)) {
      newSet.delete(marketAddress);
    } else {
      newSet.add(marketAddress);
    }
    setSelectedMarkets(newSet);
  };

  const filteredMarkets = markets.filter(market => {
    if (filter === 'approved') return market.mobile_approved === true;
    if (filter === 'pending') return !market.mobile_approved;
    return true;
  });

  // Show unauthorized message
  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your wallet is not authorized to manage mobile markets.
              </p>
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
              >
                Back to Admin
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
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to manage mobile markets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mobile Market Approval</h1>
            <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
              📱 Mobile App Control
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Control which markets appear in the PRIMAPE mobile app
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                ← Back to Admin
              </button>
              <button
                onClick={loadMarkets}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2 items-center">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="">Bulk Actions</option>
                <option value="approve">Approve Selected</option>
                <option value="remove">Remove Selected</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || selectedMarkets.size === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Apply ({selectedMarkets.size})
              </button>
            </div>
          </div>
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
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'approved' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📱 Mobile Approved ({markets.filter(m => m.mobile_approved).length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Pending ({markets.filter(m => !m.mobile_approved).length})
          </button>
        </div>

        {/* Select All */}
        {filteredMarkets.length > 0 && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMarkets.size === filteredMarkets.length && filteredMarkets.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <span>Select all {filteredMarkets.length} markets</span>
            </label>
          </div>
        )}

        {/* Markets List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No markets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMarkets.map((market) => (
              <div 
                key={market.market_address} 
                className={`bg-gray-800 rounded-lg p-6 border-2 transition-all ${
                  selectedMarkets.has(market.market_address) 
                    ? 'border-purple-500' 
                    : 'border-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedMarkets.has(market.market_address)}
                    onChange={() => toggleMarketSelection(market.market_address)}
                    className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />

                  {/* Market Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {market.question}
                    </h3>
                    <div className="text-sm text-gray-400 space-y-1 mb-3">
                      <p>Category: <span className="text-gray-300">{market.category}</span></p>
                      <p>Created: {new Date(market.created_at).toLocaleDateString()}</p>
                      <p>Participants: <span className="text-gray-300">{market.participant_count || 0}</span></p>
                      <p>Volume: <span className="text-gray-300">{(market.total_volume || 0).toFixed(2)} APES</span></p>
                    </div>

                    {/* Options Display */}
                    <div className="flex gap-2 mb-3">
                      {market.options?.map((option, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Approval Toggle */}
                  <div className="text-center">
                    <div className={`mb-2 text-sm font-medium ${
                      market.mobile_approved ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {market.mobile_approved ? '📱 Mobile' : 'Not on Mobile'}
                    </div>
                    <button
                      onClick={() => handleApprovalToggle(market.market_address, market.mobile_approved)}
                      disabled={updatingMarkets[market.market_address]}
                      className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                        market.mobile_approved
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {updatingMarkets[market.market_address] 
                        ? 'Updating...' 
                        : market.mobile_approved ? 'Remove' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{markets.length}</div>
            <div className="text-gray-400">Total Markets</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {markets.filter(m => m.mobile_approved).length}
            </div>
            <div className="text-gray-400">Mobile Approved</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {Math.round((markets.filter(m => m.mobile_approved).length / markets.length) * 100) || 0}%
            </div>
            <div className="text-gray-400">Approval Rate</div>
          </div>
        </div>
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

export default AdminMobileMarketsPage;