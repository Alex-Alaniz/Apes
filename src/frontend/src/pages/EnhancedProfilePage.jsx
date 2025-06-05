import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit2, Check, X, Trophy, TrendingUp, Clock, Copy } from 'lucide-react';
import marketService from '../services/marketService';
import Toast from '../components/Toast';

const EnhancedProfilePage = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  
  // State for user data
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [userStats, setUserStats] = useState({
    totalBets: 0,
    wonBets: 0,
    totalProfit: 0,
    winRate: 0,
    rank: 'Novice'
  });
  
  // Existing states
  const [userPositionsByMarket, setUserPositionsByMarket] = useState({});
  const [markets, setMarkets] = useState({});
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState({});
  const [toast, setToast] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadUserData();
      loadUsername();
    } else {
      setUserPositionsByMarket({});
      setMarkets({});
      setLoading(false);
    }
  }, [connected, publicKey]);

  const loadUsername = () => {
    // Load username from localStorage (in production, this would be from blockchain)
    const savedUsername = localStorage.getItem(`username_${publicKey?.toString()}`);
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      setUsername(`Player${publicKey?.toString().slice(-4)}`);
    }
  };

  const handleEditUsername = () => {
    setTempUsername(username);
    setEditingUsername(true);
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim().length >= 3 && tempUsername.trim().length <= 20) {
      setUsername(tempUsername.trim());
      localStorage.setItem(`username_${publicKey?.toString()}`, tempUsername.trim());
      setEditingUsername(false);
      setToast({
        message: 'Username updated successfully!',
        type: 'success'
      });
    } else {
      setToast({
        message: 'Username must be 3-20 characters',
        type: 'error'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingUsername(false);
    setTempUsername('');
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey?.toString() || '');
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch all markets
      const allMarkets = await marketService.fetchAllMarkets();
      
      // Create a map of market pubkey to market data
      const marketMap = {};
      allMarkets.forEach(market => {
        marketMap[market.publicKey] = market;
      });
      setMarkets(marketMap);
      
      // Fetch user positions for each market
      const positionsByMarket = {};
      let totalBets = 0;
      let wonBets = 0;
      let totalInvested = 0;
      let totalReturns = 0;
      
      for (const market of allMarkets) {
        const positions = await marketService.getUserPositionsForMarket(publicKey, market.publicKey);
        if (positions.length > 0) {
          positionsByMarket[market.publicKey] = positions;
          totalBets += positions.length;
          
          // Calculate stats for resolved markets
          if (market.status === 'Resolved' && market.winningOption !== null) {
            positions.forEach(pos => {
              totalInvested += pos.amount;
              if (market.winningOption === pos.optionIndex) {
                wonBets++;
                const winnings = calculatePotentialWinnings(pos, market);
                totalReturns += winnings;
              }
            });
          }
        }
      }
      
      setUserPositionsByMarket(positionsByMarket);
      
      // Calculate user stats
      const profit = totalReturns - totalInvested;
      const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;
      
      // Determine rank based on total bets and win rate
      let rank = 'Novice';
      if (totalBets >= 100 && winRate >= 60) rank = 'Master';
      else if (totalBets >= 50 && winRate >= 55) rank = 'Expert';
      else if (totalBets >= 20 && winRate >= 50) rank = 'Advanced';
      else if (totalBets >= 5) rank = 'Intermediate';
      
      setUserStats({
        totalBets,
        wonBets,
        totalProfit: profit,
        winRate,
        rank
      });
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setToast({
        message: 'Failed to load user data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (marketPubkey, optionIndex) => {
    const claimKey = `${marketPubkey}-${optionIndex}`;
    setClaimingReward(prev => ({ ...prev, [claimKey]: true }));
    
    try {
      await marketService.claimReward(marketPubkey, optionIndex);
      
      setToast({
        message: 'Rewards claimed successfully!',
        type: 'success'
      });
      
      // Reload user data
      await loadUserData();
    } catch (error) {
      console.error('Error claiming reward:', error);
      setToast({
        message: `Failed to claim reward: ${error.message}`,
        type: 'error'
      });
    } finally {
      setClaimingReward(prev => ({ ...prev, [claimKey]: false }));
    }
  };

  const canClaimReward = (position, market) => {
    return market && 
           market.status === 'Resolved' && 
           market.winningOption !== null &&
           market.winningOption === position.optionIndex &&
           !position.claimed;
  };

  const calculatePotentialWinnings = (position, market) => {
    if (!market || market.winningOption !== position.optionIndex) return 0;
    
    const winningPool = market.optionPools[market.winningOption];
    const totalPool = market.totalVolume;
    
    if (winningPool === 0) return 0;
    
    const userShare = position.amount / winningPool;
    const grossWinnings = userShare * totalPool;
    const platformFee = grossWinnings * 0.025;
    const creatorFee = grossWinnings * (market.creatorFeeRate / 10000);
    
    return grossWinnings - platformFee - creatorFee;
  };

  // Calculate totals
  const totalPositions = Object.values(userPositionsByMarket).reduce((sum, positions) => sum + positions.length, 0);
  const totalInvested = Object.values(userPositionsByMarket).reduce((sum, positions) => 
    sum + positions.reduce((posSum, pos) => posSum + pos.amount, 0), 0
  );
  const totalClaimable = Object.entries(userPositionsByMarket).reduce((sum, [marketPubkey, positions]) => {
    const market = markets[marketPubkey];
    return sum + positions
      .filter(pos => canClaimReward(pos, market))
      .reduce((posSum, pos) => posSum + calculatePotentialWinnings(pos, market), 0);
  }, 0);

  const getRankColor = (rank) => {
    switch(rank) {
      case 'Master': return 'text-purple-400';
      case 'Expert': return 'text-blue-400';
      case 'Advanced': return 'text-green-400';
      case 'Intermediate': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your profile</p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold ${getRankColor(userStats.rank)} bg-gray-900 border border-gray-700`}>
                    {userStats.rank}
                  </div>
                </div>
                
                {/* User Info */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {editingUsername ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          placeholder="Enter username"
                          maxLength={20}
                        />
                        <button
                          onClick={handleSaveUsername}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-white">{username}</h1>
                        <button
                          onClick={handleEditUsername}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm">
                      {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {copiedAddress && (
                      <span className="text-xs text-green-400">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats.totalBets}</div>
                  <div className="text-sm text-gray-400">Total Bets</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Positions</h3>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalPositions}</p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Invested</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {totalInvested.toFixed(0)} <span className="text-sm text-gray-400">APES</span>
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Profit</h3>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className={`text-2xl font-bold ${userStats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {userStats.totalProfit >= 0 ? '+' : ''}{userStats.totalProfit.toFixed(0)} <span className="text-sm text-gray-400">APES</span>
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Claimable</h3>
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {totalClaimable.toFixed(0)} <span className="text-sm text-gray-400">APES</span>
            </p>
          </div>
        </motion.div>

        {/* Positions Section */}
        <motion.div 
          className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">My Positions</h2>
          
          {Object.keys(userPositionsByMarket).length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">You haven't placed any predictions yet.</p>
              <button
                onClick={() => navigate('/markets')}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Explore Markets
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {Object.entries(userPositionsByMarket).map(([marketPubkey, positions], marketIdx) => {
                  const market = markets[marketPubkey];
                  const totalMarketPosition = positions.reduce((sum, pos) => sum + pos.amount, 0);
                  
                  return (
                    <motion.div 
                      key={marketPubkey}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: marketIdx * 0.1 }}
                      className="border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-white text-lg mb-2">
                            {market?.question || 'Loading...'}
                          </h4>
                          <div className="text-sm text-gray-400">
                            Total position: <span className="text-white font-medium">
                              {totalMarketPosition.toFixed(2)} APES
                            </span> across {positions.length} option{positions.length > 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            market?.status === 'Active' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                            market?.status === 'Resolved' ? 'bg-blue-900/50 text-blue-400 border border-blue-800' :
                            'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}>
                            {market?.status}
                          </span>
                        </div>
                      </div>

                      {/* Individual positions */}
                      <div className="space-y-3">
                        {positions.map((position, idx) => {
                          const canClaim = canClaimReward(position, market);
                          const potentialWinnings = calculatePotentialWinnings(position, market);
                          const claimKey = `${marketPubkey}-${position.optionIndex}`;
                          
                          return (
                            <div key={idx} className={`p-4 rounded-lg ${
                              market?.status === 'Resolved' && market.winningOption !== null
                                ? market.winningOption === position.optionIndex
                                  ? 'bg-green-900/20 border border-green-800/50'
                                  : 'bg-red-900/20 border border-red-800/50'
                                : 'bg-gray-800/30 border border-gray-700/50'
                            }`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-medium">
                                      {market?.options[position.optionIndex] || `Option ${position.optionIndex + 1}`}
                                    </span>
                                    {market?.status === 'Resolved' && market.winningOption === position.optionIndex && (
                                      <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">
                                        Winner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {position.amount.toFixed(2)} APES • {format(position.timestamp, 'MMM d, h:mm a')}
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  {market?.status === 'Resolved' && market.winningOption !== null && (
                                    <div className="mb-2">
                                      {market.winningOption === position.optionIndex ? (
                                        <>
                                          {!position.claimed && (
                                            <div className="text-emerald-400 font-medium">
                                              +{potentialWinnings.toFixed(2)} APES
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-red-400 text-sm">-{position.amount.toFixed(2)} APES</div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {canClaim && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleClaimReward(marketPubkey, position.optionIndex)}
                                      disabled={claimingReward[claimKey]}
                                      className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {claimingReward[claimKey] ? 'Claiming...' : 'Claim Reward'}
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Market action button */}
                      <div className="mt-4">
                        <button
                          onClick={() => navigate(`/markets/${marketPubkey}`)}
                          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View Market Details →
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
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

export default EnhancedProfilePage; 