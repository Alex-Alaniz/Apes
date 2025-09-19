import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import QuickBetInterface from '../components/QuickBetInterface';
import StreamPredictionModal from '../components/StreamPredictionModal';

const StreamDetailPage = () => {
  const { tokenAddress } = useParams();
  const { publicKey } = useWallet();
  const [stream, setStream] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);

  useEffect(() => {
    if (tokenAddress) {
      fetchStreamDetails();
      fetchMarkets();
      
      // Refresh every 10 seconds
      const interval = setInterval(() => {
        fetchStreamDetails();
        fetchMarkets();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [tokenAddress]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams/${tokenAddress}`);
      if (!response.ok) throw new Error('Failed to fetch stream');
      
      const data = await response.json();
      setStream(data.stream);
      setError(null);
    } catch (err) {
      console.error('Error fetching stream:', err);
      setError('Failed to load stream details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/livestreams/${tokenAddress}/markets?status=all`
      );
      if (!response.ok) throw new Error('Failed to fetch markets');
      
      const data = await response.json();
      setMarkets(data.markets || []);
      
      // Auto-select the first active market
      const activeMarkets = data.markets.filter(m => m.status === 'active');
      if (activeMarkets.length > 0 && !selectedMarket) {
        setSelectedMarket(activeMarkets[0]);
      }
    } catch (err) {
      console.error('Error fetching markets:', err);
    }
  };

  const handleMarketCreated = (newMarket) => {
    // Refresh markets
    fetchMarkets();
    // Select the new market
    setSelectedMarket(newMarket);
  };

  const handleBetPlaced = (bet) => {
    // Refresh markets to update volumes
    fetchMarkets();
    // Show success message
    console.log('Bet placed:', bet);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <p className="text-red-200">{error || 'Stream not found'}</p>
        </div>
      </div>
    );
  }

  const activeMarkets = markets.filter(m => m.status === 'active');
  const resolvedMarkets = markets.filter(m => m.status === 'resolved');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Stream Header */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                {stream.title}
                {stream.is_live && (
                  <span className="text-red-500 text-lg animate-pulse">● LIVE</span>
                )}
              </h1>
              <p className="text-gray-400">
                {stream.symbol} • {stream.viewer_count || 0} viewers
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Token: {tokenAddress}
              </p>
            </div>
            
            <div className="flex gap-3">
              <a
                href={stream.stream_url || `https://pump.fun/coin/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Watch Stream →
              </a>
              {stream.is_live && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Prediction
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Active Markets */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold mb-4">
              Active Markets ({activeMarkets.length})
            </h2>

            {activeMarkets.length > 0 ? (
              activeMarkets.map(market => (
                <div
                  key={market.id}
                  className={`cursor-pointer ${
                    selectedMarket?.id === market.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => setSelectedMarket(market)}
                >
                  <QuickBetInterface 
                    market={market} 
                    onBetPlaced={handleBetPlaced}
                  />
                </div>
              ))
            ) : (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">No active markets</p>
                {stream.is_live ? (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Create First Market
                  </button>
                ) : (
                  <p className="text-gray-500">Stream must be live to create markets</p>
                )}
              </div>
            )}

            {/* Resolved Markets */}
            {resolvedMarkets.length > 0 && (
              <>
                <h2 className="text-2xl font-bold mb-4 mt-8">
                  Recent Results ({resolvedMarkets.slice(0, 5).length})
                </h2>
                <div className="space-y-4">
                  {resolvedMarkets.slice(0, 5).map(market => (
                    <div key={market.id} className="bg-gray-900 rounded-lg p-4">
                      <p className="text-gray-300 mb-2">{market.question}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">
                          Winner: <span className={
                            market.winning_option === 0 ? 'text-green-400' : 'text-red-400'
                          }>
                            {market.winning_option === 0 ? 'YES' : 'NO'}
                          </span>
                        </span>
                        <span className="text-sm text-gray-400">
                          Volume: {(parseFloat(market.total_volume) / 1e9).toFixed(2)} SOL
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Column - Stream Stats */}
          <div className="space-y-6">
            {/* Live Embed */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Stream Preview</h3>
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                <iframe
                  src={`https://pump.fun/coin/${tokenAddress}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${stream.title} Stream`}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </div>

            {/* Stream Stats */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Stream Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Markets</span>
                  <span className="font-bold">{markets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Now</span>
                  <span className="font-bold text-green-400">{activeMarkets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Volume</span>
                  <span className="font-bold">
                    {markets.reduce((sum, m) => sum + parseFloat(m.total_volume || 0), 0).toFixed(2)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unique Bettors</span>
                  <span className="font-bold">
                    {markets.reduce((sum, m) => sum + (m.unique_bettors || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
              <p className="mb-2">📊 Markets auto-resolve after 5 minutes</p>
              <p className="mb-2">💰 0.5% of volume goes to creators</p>
              <p>🎮 0.5% of volume goes to streamers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Prediction Modal */}
      <StreamPredictionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        streamToken={tokenAddress}
        streamTitle={stream.title}
        onMarketCreated={handleMarketCreated}
      />
    </div>
  );
};

export default StreamDetailPage;