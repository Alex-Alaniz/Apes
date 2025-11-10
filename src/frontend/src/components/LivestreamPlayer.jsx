import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Users, TrendingUp, Activity, MessageCircle, DollarSign, Share2, Heart, Bell, ChevronLeft } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import StreamPredictionModal from './StreamPredictionModal';
import QuickBetInterface from './QuickBetInterface';

const LivestreamPlayer = () => {
  const { tokenAddress } = useParams();
  const { publicKey } = useWallet();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    fetchStreamDetails();
    fetchMarkets();
    setupWebSocket();
    
    const interval = setInterval(() => {
      fetchStreamDetails();
      fetchMarkets();
    }, 5000); // Update every 5 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [tokenAddress]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/livestreams/${tokenAddress}`);
      const data = await response.json();
      if (data.success) {
        setStream(data.stream);
        // Simulate recent trades
        generateRecentTrades();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stream:', error);
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/livestreams/${tokenAddress}/markets?status=all`
      );
      const data = await response.json();
      if (data.success) {
        setMarkets(data.markets || []);
        // Auto-select first active market
        const activeMarkets = (data.markets || []).filter(m => m.status === 'active');
        if (activeMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(activeMarkets[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const setupWebSocket = () => {
    // Simulate real-time messages
    const sampleMessages = [
      { user: 'CryptoKing', text: 'TO THE MOON! 🚀' },
      { user: 'DiamondHands', text: 'Never selling!' },
      { user: 'Web3Dev', text: 'Great project!' },
      { user: 'SOLTrader', text: 'Buying more!' },
      { user: 'DeFiDegen', text: 'LFG!!!' }
    ];
    
    const interval = setInterval(() => {
      const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const newMsg = {
        id: Date.now(),
        ...randomMsg,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev.slice(-50), newMsg]);
      // Auto-scroll chat to bottom
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 8000 + Math.random() * 10000);
    
    return () => clearInterval(interval);
  };

  const generateRecentTrades = () => {
    // Simulate recent trading activity
    const trades = [];
    const actions = ['bought', 'sold'];
    const amounts = [100, 250, 500, 1000, 2500, 5000, 10000];
    
    for (let i = 0; i < 5; i++) {
      trades.push({
        id: Date.now() + i,
        action: actions[Math.floor(Math.random() * actions.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        user: `User${Math.floor(Math.random() * 9999)}`,
        timestamp: new Date(Date.now() - Math.random() * 300000).toLocaleTimeString()
      });
    }
    
    setRecentTrades(trades);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        user: 'You',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Stream Not Found</h2>
          <p className="text-gray-600">This livestream is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stream View */}
          <div className="lg:col-span-2 space-y-4">
            {/* Back Button */}
            <Link 
              to="/livestreams" 
              className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Livestreams
            </Link>
            
            {/* Stream Player */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative aspect-video bg-gray-900">
                {/* Pump.fun Token Page Embed or Trading View */}
                <iframe
                  src={`https://pump.fun/coin/${tokenAddress}`}
                  className="w-full h-full"
                  title={stream.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                
                {/* Live Indicator Overlay */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center text-sm font-semibold">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    LIVE
                  </div>
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full flex items-center text-sm">
                    <Users className="w-4 h-4 mr-1" />
                    {stream.viewer_count || stream.viewerCount || 0}
                  </div>
                </div>
              </div>
              
              {/* Stream Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{stream.title}</h1>
                    <div className="flex items-center space-x-4 mt-2 text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Live for 15m
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        ${stream.symbol}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setLiked(!liked)}
                      className={`p-2 rounded-lg transition-colors ${
                        liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`p-2 rounded-lg transition-colors ${
                        isFollowing ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Creator Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <div>
                      <p className="font-semibold text-gray-800">Creator</p>
                      <p className="text-sm text-gray-600">
                        {stream.creator_wallet?.slice(0, 4)}...{stream.creator_wallet?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <button 
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            </div>

            {/* Active Prediction Markets */}
            {markets.filter(m => m.status === 'active').length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                    Active Predictions
                  </span>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Create New
                  </button>
                </h3>
                <div className="space-y-4">
                  {markets.filter(m => m.status === 'active').map(market => (
                    <QuickBetInterface 
                      key={market.id}
                      market={market}
                      onBetPlaced={() => fetchMarkets()}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-600" />
                Recent Trading Activity
              </h3>
              <div className="space-y-2">
                {recentTrades.map(trade => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${trade.action === 'bought' ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.user}
                      </span>
                      <span className="text-gray-600">{trade.action}</span>
                      <span className="font-bold">{trade.amount} {stream.symbol}</span>
                    </div>
                    <span className="text-sm text-gray-500">{trade.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Token Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                Token Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Cap</span>
                  <span className="font-semibold">${((stream.marketCap || 0) / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Volume</span>
                  <span className="font-semibold">${((stream.volume24h || 0) / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Change</span>
                  <span className={`font-semibold ${stream.priceChange24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stream.priceChange24h > 0 ? '+' : ''}{stream.priceChange24h?.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holders</span>
                  <span className="font-semibold">{Math.floor(Math.random() * 5000) + 1000}</span>
                </div>
              </div>
            </div>

            {/* Live Chat */}
            <div className="bg-white rounded-lg shadow-lg h-96 flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                  Live Chat
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={chatRef}>
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center">No messages yet. Be the first!</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-semibold text-purple-600">{msg.user}:</span>
                      <span className="ml-2">{msg.text}</span>
                      <span className="text-xs text-gray-500 ml-2">{msg.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={sendMessage} className="p-4 border-t">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </form>
            </div>

            {/* Create Market Button */}
            {stream.is_live && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Create Prediction Market
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Prediction Modal */}
      <StreamPredictionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        streamToken={tokenAddress}
        streamTitle={stream?.title || ''}
        onMarketCreated={(market) => {
          fetchMarkets();
          setSelectedMarket(market);
        }}
      />
    </div>
  );
};

export default LivestreamPlayer;