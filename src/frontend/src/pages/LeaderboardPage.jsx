import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, TrendingUp, Target, DollarSign, Medal, ChevronDown } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [topPerformers, setTopPerformers] = useState(null);
  const [sortBy, setSortBy] = useState('profit');
  const [timeframe, setTimeframe] = useState('all');
  const [userRank, setUserRank] = useState(null);
  const [engagementLeaderboard, setEngagementLeaderboard] = useState([]);
  const [topEngagers, setTopEngagers] = useState([]);

  useEffect(() => {
    loadLeaderboardData();
    loadTopPerformers();
    loadEngagementLeaderboard();
    loadTopEngagers();
    if (publicKey) {
      loadUserRank();
    }
  }, [sortBy, timeframe, publicKey]);

  const loadLeaderboardData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/leaderboard?sortBy=${sortBy}&timeframe=${timeframe}`
      );
      const data = await response.json();
      setLeaderboardData(data.leaderboard);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopPerformers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/leaderboard/top-performers`
      );
      const data = await response.json();
      setTopPerformers(data);
    } catch (error) {
      console.error('Error loading top performers:', error);
    }
  };

  const loadUserRank = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/leaderboard/rank/${publicKey.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserRank(data.userRank);
      }
    } catch (error) {
      console.error('Error loading user rank:', error);
    }
  };

  const loadEngagementLeaderboard = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/engagement/leaderboard`
      );
      if (response.ok) {
        const data = await response.json();
        setEngagementLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading engagement leaderboard:', error);
    }
  };

  const loadTopEngagers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/engagement/leaderboard`
      );
      if (response.ok) {
        const data = await response.json();
        setTopEngagers(data.leaderboard.slice(0, 3)); // Get top 3 engagers
      }
    } catch (error) {
      console.error('Error loading top engagers:', error);
    }
  };

  const navigateToProfile = (walletAddress) => {
    navigate(`/profile/${walletAddress}`);
  };

  const getRankIcon = (rank) => {
    switch(rank) {
      case 'Master': return '👑';
      case 'Expert': return '🏆';
      case 'Advanced': return '🥇';
      case 'Intermediate': return '🥈';
      default: return '🥉';
    }
  };

  const getRankColor = (rank) => {
    switch(rank) {
      case 'Master': return 'text-purple-400';
      case 'Expert': return 'text-blue-400';
      case 'Advanced': return 'text-green-400';
      case 'Intermediate': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-gray-400">Compete with the best predictors on Solana</p>
        </div>

        {/* User's Current Rank (if connected) */}
        {userRank && (
          <div className="mb-8 p-6 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl border border-indigo-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Your Rankings</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Profit Rank</div>
                <div className="text-2xl font-bold text-white">#{userRank.profit_rank || 'N/A'}</div>
                <div className="text-sm text-green-400">+{(userRank.total_profit || 0).toFixed(2)} APES</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Accuracy Rank</div>
                <div className="text-2xl font-bold text-white">#{userRank.accuracy_rank || 'N/A'}</div>
                <div className="text-sm text-blue-400">{(userRank.win_rate || 0).toFixed(1)}% Win Rate</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Volume Rank</div>
                <div className="text-2xl font-bold text-white">#{userRank.volume_rank || 'N/A'}</div>
                <div className="text-sm text-purple-400">{(userRank.total_invested || 0).toFixed(0)} APES</div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Engagement Rank</div>
                <div className="text-2xl font-bold text-white">#{userRank.engagement_rank || 'N/A'}</div>
                <div className="text-sm text-blue-400">{(userRank.engagement_points || 0).toLocaleString()} Points</div>
                {!userRank.airdrop_eligible && (
                  <div className="text-xs text-yellow-400 mt-1">⚠️ Need predictions for airdrops</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Performers Cards */}
        {topPerformers && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Top Profit */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Top Profit Makers
              </h3>
              <div className="space-y-3">
                {topPerformers.topProfit.slice(0, 3).map((user, index) => (
                  <div
                    key={user.wallet_address}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => navigateToProfile(user.wallet_address)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                      <div>
                        <div className="font-medium text-white">
                          {user.username || `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`}
                        </div>
                        <div className={`text-xs ${getRankColor(user.rank)}`}>
                          {getRankIcon(user.rank)} {user.rank}
                        </div>
                        {user.twitter_username && (
                          <div className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                            <FaXTwitter className="w-3 h-3" />
                            @{user.twitter_username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-semibold">
                        +{(user.total_profit || 0).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">APES</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Accurate */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Most Accurate
              </h3>
              <div className="space-y-3">
                {topPerformers.topAccuracy.slice(0, 3).map((user, index) => (
                  <div
                    key={user.wallet_address}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => navigateToProfile(user.wallet_address)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                      <div>
                        <div className="font-medium text-white">
                          {user.username || `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user.total_predictions} predictions
                        </div>
                        {user.twitter_username && (
                          <div className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                            <FaXTwitter className="w-3 h-3" />
                            @{user.twitter_username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-semibold">
                        {(user.win_rate || 0).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highest Volume */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                Highest Volume
              </h3>
              <div className="space-y-3">
                {topPerformers.topVolume.slice(0, 3).map((user, index) => (
                  <div
                    key={user.wallet_address}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => navigateToProfile(user.wallet_address)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                      <div>
                        <div className="font-medium text-white">
                          {user.username || `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`}
                        </div>
                        <div className={`text-xs ${getRankColor(user.rank)}`}>
                          {getRankIcon(user.rank)} {user.rank}
                        </div>
                        {user.twitter_username && (
                          <div className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                            <FaXTwitter className="w-3 h-3" />
                            @{user.twitter_username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-semibold">
                        {((user.total_invested || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-xs text-gray-500">APES</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Engager */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaXTwitter className="w-5 h-5 text-blue-400" />
                Top Engagers
              </h3>
              <div className="space-y-3">
                {(topPerformers.topEngagement || []).slice(0, 3).map((user, index) => (
                  <div
                    key={user.wallet_address}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => navigateToProfile(user.wallet_address)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                      <div>
                        <div className="font-medium text-white">
                          {user.username || `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`}
                        </div>
                        <div className="text-xs text-blue-400 flex items-center gap-1">
                          {user.twitter_username ? (
                            <>
                              <FaXTwitter className="w-3 h-3" />
                              @{user.twitter_username}
                            </>
                          ) : (
                            <span className="text-gray-500">No 𝕏 linked</span>
                          )}
                        </div>
                        {!user.airdrop_eligible && (
                          <div className="text-xs text-yellow-400 mt-1">⚠️ Engagement only</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-semibold">
                        {(user.engagement_points || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter/Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="profit">Total Profit</option>
                <option value="accuracy">Win Rate</option>
                <option value="volume">Volume</option>
                <option value="engagement">Engagement Points</option>
                <option value="recent">Recent Connections</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Timeframe:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Showing {(sortBy === 'engagement' ? engagementLeaderboard : leaderboardData).length} users
          </div>
        </div>

        {/* Main Leaderboard Table */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    𝕏 Profile
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Predictions
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Invested
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Profit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Engagement Points
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Airdrop Eligible
                  </th>
                </tr>
              </thead>
              <tbody>
                {(sortBy === 'engagement' ? engagementLeaderboard : leaderboardData).map((user, index) => (
                  <tr
                    key={user.wallet_address || user.user_address}
                    className="border-t border-gray-800 hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => navigateToProfile(user.wallet_address || user.user_address)}
                  >
                    <td className="px-6 py-4 text-white font-medium">
                      <div className="flex items-center gap-2">
                        {(user.position || index + 1) <= 3 && (
                          <span className="text-2xl">
                            {(user.position || index + 1) === 1 ? '🥇' : (user.position || index + 1) === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                        #{user.position || index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username ? user.username[0].toUpperCase() : (user.wallet_address || user.user_address)[0]}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {user.username || `${(user.wallet_address || user.user_address).slice(0, 6)}...${(user.wallet_address || user.user_address).slice(-4)}`}
                          </div>
                          <div className={`text-xs flex items-center gap-1 ${getRankColor(user.rank || user.tier)}`}>
                            <span>{getRankIcon(user.rank || user.tier)}</span>
                            <span>{user.rank || user.tier}</span>
                          </div>
                          {user.activity_status && (
                            <div className={`text-xs mt-1 ${
                              user.activity_status === 'active' ? 'text-green-400' :
                              user.activity_status === 'new' ? 'text-blue-400' :
                              'text-gray-500'
                            }`}>
                              {user.activity_status === 'active' ? '🟢 Active' :
                               user.activity_status === 'new' ? '🆕 New User' :
                               '👀 Tourist'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      {user.twitter_username ? (
                        <a
                          href={`https://twitter.com/${user.twitter_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          @{user.twitter_username}
                        </a>
                      ) : (
                        <span className="text-gray-500">No 𝕏 linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {user.total_predictions || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        (user.win_rate || 0) >= 60 ? 'text-green-400' :
                        (user.win_rate || 0) >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(user.win_rate || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-purple-400">
                      {(user.total_invested || 0).toFixed(0)} APES
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        (user.total_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(user.total_profit || 0) >= 0 ? '+' : ''}{(user.total_profit || 0).toFixed(0)} APES
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-blue-400">
                        {(user.engagement_points || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {user.airdrop_eligible ? (
                          <div 
                            className="flex items-center gap-1 text-green-400"
                            title="Eligible for airdrops (has placed predictions)"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">Yes</span>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 text-yellow-400"
                            title="Not eligible for airdrops (needs to place predictions)"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">No</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {(sortBy === 'engagement' ? engagementLeaderboard : leaderboardData).length === 0 && (
          <div className="text-center py-12">
            <Medal className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">No users qualify for the leaderboard yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              {sortBy === 'engagement' 
                ? 'Users need engagement points to appear on the engagement leaderboard.'
                : sortBy === 'recent'
                ? 'No recent connections found.'
                : 'Users need either predictions or engagement points to appear on the leaderboard.'
              }
            </p>
            <p className="text-xs text-yellow-400 mt-2">
              💡 Tip: {sortBy === 'recent' 
                ? 'Connect your wallet to appear in recent connections!'
                : 'Users with only engagement points can appear on leaderboard but need predictions to claim airdrops'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage; 