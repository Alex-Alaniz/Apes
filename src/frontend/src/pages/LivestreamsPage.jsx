import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import LivestreamCard from '../components/LivestreamCard';

const LivestreamsPage = () => {
  const { publicKey } = useWallet();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch featured streams
  useEffect(() => {
    fetchStreams();
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStreams();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStreams = async () => {
    try {
      console.log('Fetching from:', `${import.meta.env.VITE_API_URL}/api/livestreams`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to fetch streams: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stream data:', data);
      setStreams(data.streams || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching streams:', err);
      setError(`Failed to load livestreams: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams/stats/overview`);
      if (!response.ok) return;
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            PumpFun Livestream Markets
          </h1>
          <p className="text-gray-400 text-lg">
            Create and bet on 5-minute predictions for live streams
          </p>
        </div>

        {/* Platform Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{stats.live_streams || 0}</p>
              <p className="text-sm text-gray-400">Live Streams</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.active_markets || 0}</p>
              <p className="text-sm text-gray-400">Active Markets</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">
                {stats.total_volume ? (parseFloat(stats.total_volume) / 1e9).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-gray-400">Total SOL</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.unique_bettors || 0}</p>
              <p className="text-sm text-gray-400">Total Bettors</p>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🎯 How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="font-bold text-purple-400 mb-1">1. Pick a Stream</p>
              <p className="text-sm text-gray-400">Choose from featured PumpFun livestreams</p>
            </div>
            <div>
              <p className="font-bold text-green-400 mb-1">2. Create Markets</p>
              <p className="text-sm text-gray-400">5-minute YES/NO predictions</p>
            </div>
            <div>
              <p className="font-bold text-yellow-400 mb-1">3. Place Bets</p>
              <p className="text-sm text-gray-400">Bet SOL on outcomes</p>
            </div>
            <div>
              <p className="font-bold text-blue-400 mb-1">4. Win Together</p>
              <p className="text-sm text-gray-400">Winners share the pool</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading livestreams...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Streams Grid */}
        {!loading && streams.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map(stream => (
              <LivestreamCard key={stream.tokenAddress} stream={stream} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && streams.length === 0 && (
          <div className="text-center py-12 bg-gray-900 rounded-xl">
            <p className="text-gray-400 text-lg mb-4">No livestreams available</p>
            <p className="text-gray-500">Check back soon for featured streams!</p>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>🎥 Creators earn 0.5% • 🎮 Streamers earn 0.5% • ⚡ Markets resolve in 5 minutes</p>
          <p className="mt-2">Built on APES • Inspired by actions.fun</p>
        </div>
      </div>
    </div>
  );
};

export default LivestreamsPage;