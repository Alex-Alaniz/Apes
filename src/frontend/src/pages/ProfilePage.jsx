import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import marketService from '../services/marketService';
import Toast from '../components/Toast';
import ClaimRewardModal from '../components/ClaimRewardModal';
import TwitterLink from '../components/TwitterLink';
import { Edit2 } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { FaCheckCircle } from 'react-icons/fa';

const ProfilePage = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState({
    totalBets: 0,
    wonBets: 0,
    totalVolume: 0,
    profit: 0,
    winRate: 0
  });
  const [betHistory, setBetHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPositionsByMarket, setUserPositionsByMarket] = useState({});
  const [markets, setMarkets] = useState({});
  const [claimingReward, setClaimingReward] = useState({});
  const [toast, setToast] = useState(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  
  // Twitter state
  const [twitterLinked, setTwitterLinked] = useState(false);

  // State for claim modal
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedClaimData, setSelectedClaimData] = useState(null);

  // Safe number conversion helper
  const safeNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Calculate performance metrics from actual user data
  const calculatePerformanceMetrics = () => {
    let bestWin = { amount: 0, marketName: 'No wins yet' };
    let biggestLoss = { amount: 0, marketName: 'No losses yet' };

    // Check resolved positions for wins/losses
    Object.entries(userPositionsByMarket).forEach(([marketPubkey, positions]) => {
      const market = markets.get(marketPubkey);
      if (!market || market.status !== 'Resolved' || market.winningOption === null) return;

      positions.forEach(position => {
        const isWinner = market.winningOption === position.optionIndex;
        const betAmount = safeNumber(position.amount);
        
        if (isWinner) {
          // Calculate actual winnings
          const potentialWinnings = calculatePotentialWinnings(position, market);
          const netProfit = potentialWinnings - betAmount;
          
          if (netProfit > bestWin.amount) {
            bestWin = {
              amount: netProfit,
              marketName: market.question?.slice(0, 30) + '...' || 'Market'
            };
          }
        } else {
          // This is a loss
          if (betAmount > biggestLoss.amount) {
            biggestLoss = {
              amount: betAmount,
              marketName: market.question?.slice(0, 30) + '...' || 'Market'
            };
          }
        }
      });
    });

    return { bestWin, biggestLoss };
  };

  const { bestWin, biggestLoss } = calculatePerformanceMetrics();

  useEffect(() => {
    if (connected && publicKey) {
      ensureUserExists();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const ensureUserExists = async () => {
    try {
      console.log('🔄 Profile: Ensuring user exists for', publicKey?.toString());
      
      // Create or get user - with better error handling
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/users/create-or-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        },
      });

      if (response.ok) {
        const user = await response.json();
        console.log('✅ Profile: User data loaded successfully');
        setUserProfile(user);
        setUsername(user.username || '');
        setTwitterLinked(!!user.twitter_username);
        // Force immediate reload of user data to show latest points
        setTimeout(async () => {
          await loadUserData();
        }, 100);
      } else {
        console.warn('⚠️  Profile: Backend API failed, loading with defaults');
        setUserProfile({ wallet_address: publicKey.toString() });
        await loadUserDataWithFallback();
      }
    } catch (error) {
      console.error('❌ Profile: Error ensuring user exists:', error);
      console.log('🔄 Profile: Loading with fallback data');
      setUserProfile({ wallet_address: publicKey.toString() });
      await loadUserDataWithFallback();
    }
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Profile: Loading user data...');
      
      // Fetch user stats with error handling
      try {
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/users/${publicKey.toString()}/stats`);
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setUserStats({
            totalBets: stats.totalBets || 0,
            wonBets: stats.wonBets || 0,
            totalVolume: stats.totalVolume || 0,
            profit: stats.profit || 0,
            winRate: stats.winRate || 0
          });
          console.log('✅ Profile: User stats loaded');
        } else {
          console.warn('⚠️  Profile: Stats API failed, using defaults');
        }
      } catch (error) {
        console.warn('⚠️  Profile: Stats fetch failed:', error.message);
      }

      // Fetch bet history with error handling
      try {
        const historyRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/users/${publicKey.toString()}/bets`);
        if (historyRes.ok) {
          const history = await historyRes.json();
          setBetHistory(history.bets || []);
          console.log('✅ Profile: Bet history loaded');
        } else {
          console.warn('⚠️  Profile: Bet history API failed, using empty array');
        }
      } catch (error) {
        console.warn('⚠️  Profile: Bet history fetch failed:', error.message);
      }

      // Fetch markets with timeout to prevent hanging
      try {
        console.log('🔄 Profile: Fetching markets with timeout...');
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Market fetch timeout')), 10000); // 10 second timeout
        });
        
        // Race between market fetch and timeout
        const allMarkets = await Promise.race([
          marketService.fetchMarketsWithStats(),
          timeoutPromise
        ]);
        
        console.log(`✅ Profile: Found ${allMarkets.length} markets`);
        
        const marketMap = new Map();
        allMarkets.forEach(market => {
          marketMap.set(market.publicKey, market);
        });
        setMarkets(marketMap);
        
        // Only fetch user positions if we have markets (skip for now to prevent hanging)
        const positionsByMarket = {};
        if (allMarkets.length > 0) {
          console.log('🔄 Profile: Skipping position fetch for now (performance)');
          // Skip position fetching to prevent hanging
          // TODO: Implement position fetching with timeout later
        } else {
          console.log('📭 Profile: No markets available, skipping position fetch');
        }
        
        setUserPositionsByMarket(positionsByMarket);
      } catch (error) {
        console.warn('⚠️  Profile: Market fetch failed or timed out:', error.message);
        console.log('📭 Profile: Using empty markets to prevent hang');
        setMarkets(new Map());
        setUserPositionsByMarket({});
      }
      
      console.log('✅ Profile: Data loading completed');
    } catch (error) {
      console.error('❌ Profile: Error loading user data:', error);
      setToast({
        message: 'Some data failed to load, but you can still use your profile',
        type: 'warning'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserDataWithFallback = async () => {
    setLoading(true);
    try {
      console.log('🔄 Profile: Loading with fallback (fast mode)...');
      
      // Set default user stats immediately
      setUserStats({
        totalBets: 0,
        wonBets: 0,
        totalVolume: 0,
        profit: 0,
        winRate: 0
      });
      
      // Set empty bet history immediately
      setBetHistory([]);
      
      // Skip market fetching in fallback to prevent hanging
      console.log('📭 Profile: Skipping market fetch in fallback mode for speed');
      setMarkets(new Map());
      setUserPositionsByMarket({});
      
      setToast({
        message: 'Profile loaded in offline mode - limited data available',
        type: 'info'
      });
      
      console.log('✅ Profile: Fast fallback loading completed');
    } catch (error) {
      console.error('❌ Profile: Even fallback failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey?.toString() || '');
    setToast({
      message: 'Wallet address copied!',
      type: 'success'
    });
  };

  const handleSaveUsername = async () => {
    if (!username || username.length < 3 || username.length > 20) {
      setToast({
        message: 'Username must be 3-20 characters',
        type: 'error'
      });
      return;
    }

    setSavingUsername(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const endpoint = `${apiUrl}/api/users/${publicKey.toString()}/username`;
      
      console.log('Making username update request to:', endpoint);
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'x-wallet-address': publicKey.toString(),
      });
      console.log('Request body:', { username });

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        },
        body: JSON.stringify({ username }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const updatedUser = await response.json();
        setUserProfile(updatedUser);
        setEditingUsername(false);
        setToast({
          message: 'Username updated successfully!',
          type: 'success'
        });
      } else {
        // Get response as text first to see if it's HTML
        const responseText = await response.text();
        console.error('Error response text:', responseText);
        
        // Try to parse as JSON if it looks like JSON
        let errorMessage = 'Failed to update username';
        if (responseText.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response as JSON:', parseError);
          }
        } else {
          // If it's HTML, it means we're hitting the wrong endpoint or server
          console.error('Received HTML response instead of JSON. Check API URL and server status.');
          errorMessage = `Server configuration error: received HTML instead of JSON. API URL: ${apiUrl}`;
        }
        
        setToast({
          message: errorMessage,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating username:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update username';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please try again.';
      }
      
      setToast({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleTwitterLinked = (twitterUsername) => {
    setTwitterLinked(true);
    setUserProfile(prev => ({ ...prev, twitter_username: twitterUsername }));
    setToast({
      message: '𝕏 account linked successfully!',
      type: 'success'
    });
    // Reload user data to get updated profile
    ensureUserExists();
  };

  const handleClaimClick = (marketPubkey, position, market) => {
    const potentialWinnings = calculatePotentialWinnings(position, market);
    setSelectedClaimData({
      position,
      market,
      potentialWinnings
    });
    setClaimModalOpen(true);
  };

  const handleClaimSuccess = async (message) => {
    // Check if the message is a warning about timeout
    if (message && message.includes('confirmation timed out')) {
      setToast({
        message: `Claim submitted! ${message}`,
        type: 'warning'
      });
    } else {
      setToast({
        message: message || 'Rewards claimed successfully!',
        type: 'success'
      });
    }
    
    // Reload user data
    await loadUserData();
  };

  const canClaimReward = (position, market) => {
    console.log('canClaimReward check:', {
      marketPubkey: market?.publicKey,
      marketWinningOption: market?.winningOption,
      marketWinningOptionType: typeof market?.winningOption,
      positionOptionIndex: position.optionIndex,
      positionOptionIndexType: typeof position.optionIndex,
      isWinner: market?.winningOption === position.optionIndex,
      strictEquality: market?.winningOption === position.optionIndex,
      looseEquality: market?.winningOption == position.optionIndex,
      status: market?.status,
      claimed: position.claimed
    });
    
    return market && 
           market.status === 'Resolved' && 
           market.winningOption !== null &&
           market.winningOption === position.optionIndex &&
           !position.claimed;
  };

  const calculatePotentialWinnings = (position, market) => {
    if (!market || market.status !== 'Resolved' || market.winningOption !== position.optionIndex) {
      return 0;
    }
    
    const totalPool = market.actualTotalPool || market.totalVolume || 0;
    const winningPool = market.optionPools[market.winningOption] || 0;
    
    if (winningPool === 0) return 0;
    
    // User's share of the winning pool
    const userShare = position.amount / winningPool;
    
    // Calculate gross winnings (user's share of total pool)
    const grossWinnings = userShare * totalPool;
    
    // Calculate fees (3.5% total - 1% platform, 2.5% contract)
    const platformFee = grossWinnings * 0.01;
    const contractFee = grossWinnings * 0.025;
    const creatorFee = grossWinnings * (market.creatorFeeRate / 100);
    
    const totalFees = platformFee + contractFee + creatorFee;
    const netWinnings = grossWinnings - totalFees;
    
    return Math.max(0, netWinnings);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {userProfile?.username ? `@${userProfile.username}` : 'My Profile'}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                  {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                </p>
                <button
                  onClick={copyAddress}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {userProfile?.twitter_username && (
                <div className="flex items-center gap-2 mt-2">
                  <FaXTwitter className="text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">@{userProfile.twitter_username}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/engage-to-earn')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Validate Engagement
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeNumber(userStats.totalBets)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Won</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{safeNumber(userStats.wonBets)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeNumber(userStats.totalVolume).toFixed(0)} APES</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Profit/Loss</p>
              <p className={`text-2xl font-bold ${safeNumber(userStats.profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {safeNumber(userStats.profit) >= 0 ? '+' : ''}{safeNumber(userStats.profit).toFixed(0)} APES
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{safeNumber(userStats.winRate).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('history')}
              >
                Betting History
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Overview</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                      <span className="text-gray-900 dark:text-white font-medium">{safeNumber(userStats.winRate).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${safeNumber(userStats.winRate)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Best Win</h4>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {bestWin.amount > 0 ? `+${bestWin.amount.toFixed(0)} APES` : 'No wins yet'}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">{bestWin.marketName}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Biggest Loss</h4>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {biggestLoss.amount > 0 ? `-${biggestLoss.amount.toFixed(0)} APES` : 'No losses yet'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">{biggestLoss.marketName}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bets</h3>
                {betHistory.length > 0 ? (
                  <div className="space-y-3">
                    {betHistory.map((bet, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{bet.marketTitle}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Position: <span className="font-medium">{bet.position}</span> • 
                              Amount: <span className="font-medium">{safeNumber(bet.amount).toFixed(0)} APES</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              bet.status === 'won' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              bet.status === 'lost' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {bet.status || 'Pending'}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(bet.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No betting history yet</p>
                    <button
                      onClick={() => navigate('/markets')}
                      className="mt-4 text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Explore Markets →
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Display Name</h4>
                    {editingUsername ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter username"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          maxLength={20}
                        />
                        <button
                          onClick={handleSaveUsername}
                          disabled={savingUsername}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {savingUsername ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingUsername(false);
                            setUsername(userProfile?.username || '');
                          }}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700 dark:text-gray-300">
                          {userProfile?.username ? `@${userProfile.username}` : 'No username set'}
                        </p>
                        <button
                          onClick={() => setEditingUsername(true)}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Your username will be displayed publicly on leaderboards and comments
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Social Connections</h4>
                    {twitterLinked ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FaXTwitter className="text-gray-900 dark:text-gray-100 text-xl" />
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">𝕏 Connected</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">@{userProfile?.twitter_username}</p>
                            </div>
                          </div>
                          <FaCheckCircle className="text-green-500 text-xl" />
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          You can now earn points for social engagement
                        </p>
                      </div>
                    ) : (
                      <TwitterLink onLinked={handleTwitterLinked} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Positions by Market */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">My Positions</h2>
          
          {Object.keys(userPositionsByMarket).length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              You haven't placed any predictions yet.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(userPositionsByMarket).map(([marketPubkey, positions]) => {
                const market = markets.get(marketPubkey);
                const totalMarketPosition = positions.reduce((sum, pos) => sum + safeNumber(pos.amount), 0);
                
                return (
                  <div key={marketPubkey} className="border border-gray-700 rounded-lg p-4">
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
                      
                      <div className="ml-4 text-right">
                        {market && (
                          <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                            market.status === 'Active' ? 'bg-green-900 text-green-300' :
                            market.status === 'Resolved' ? 'bg-blue-900 text-blue-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {market.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Individual positions */}
                    <div className="space-y-3">
                      {positions.map((position, idx) => {
                        const canClaim = canClaimReward(position, market);
                        const potentialWinnings = calculatePotentialWinnings(position, market);
                        const claimKey = `${marketPubkey}-${position.optionIndex}`;
                        
                        // Debug log for each position
                        console.log('Rendering position:', {
                          marketQuestion: market?.question,
                          optionIndex: position.optionIndex,
                          optionText: market?.options[position.optionIndex],
                          marketWinningOption: market?.winningOption,
                          marketWinningOptionType: typeof market?.winningOption,
                          positionOptionIndexType: typeof position.optionIndex,
                          isWinner: market?.winningOption === position.optionIndex,
                          strictEquality: market?.winningOption === position.optionIndex,
                          looseEquality: market?.winningOption == position.optionIndex,
                          canClaim
                        });
                        
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${
                            market?.status === 'Resolved' && market.winningOption !== null
                              ? market.winningOption === position.optionIndex
                                ? 'bg-green-900/20 border-green-500/30'
                                : 'bg-red-900/20 border-red-500/30'
                              : 'bg-gray-800/50 border-gray-700'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm">
                                  <span className="text-gray-300">Option: </span>
                                  <span className="text-white font-medium">
                                    {market?.options[position.optionIndex] || `Option ${position.optionIndex + 1}`}
                                  </span>
                                </div>
                                <div className="text-sm mt-1">
                                  <span className="text-gray-300">Amount: </span>
                                  <span className="text-white font-medium">
                                    {safeNumber(position.amount).toFixed(2)} APES
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Placed on {format(position.timestamp, 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                              
                              <div className="text-right">
                                {market?.status === 'Resolved' && market.winningOption !== null && (
                                  <div className="text-sm mb-2">
                                    {market.winningOption === position.optionIndex ? (
                                      <>
                                        <span className="text-green-400 font-medium">✓ Won</span>
                                        {position.claimed ? (
                                          <div className="text-xs text-gray-400 mt-1">Claimed</div>
                                        ) : (
                                          <div className="text-xs text-white mt-1">
                                            +{safeNumber(potentialWinnings).toFixed(2)} APES
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-red-400 font-medium">✗ Lost</span>
                                    )}
                                  </div>
                                )}
                                
                                {canClaim && (
                                  <button
                                    onClick={() => handleClaimClick(marketPubkey, position, market)}
                                    disabled={claimingReward[claimKey]}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {claimingReward[claimKey] ? 'Claiming...' : 'Claim'}
                                  </button>
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
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        View Market Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Claim Reward Modal */}
      {selectedClaimData && (
        <ClaimRewardModal
          isOpen={claimModalOpen}
          onClose={() => {
            setClaimModalOpen(false);
            setSelectedClaimData(null);
          }}
          position={selectedClaimData.position}
          market={selectedClaimData.market}
          potentialWinnings={selectedClaimData.potentialWinnings}
          onSuccess={handleClaimSuccess}
        />
      )}

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

export default ProfilePage; 