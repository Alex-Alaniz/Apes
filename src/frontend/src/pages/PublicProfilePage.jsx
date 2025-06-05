import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaXTwitter } from 'react-icons/fa6';
import { Trophy, Target, DollarSign, Calendar } from 'lucide-react';

const PublicProfilePage = () => {
  const { walletAddress } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [walletAddress]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile and stats
      const [profileRes, statsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/users/${walletAddress}/profile`),
        fetch(`${import.meta.env.VITE_API_URL}/api/users/${walletAddress}/stats`)
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserProfile(profile);
      } else {
        setError('User not found');
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{error}</h2>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            ← Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  const rank = userStats ? 
    (userStats.totalBets >= 50 && userStats.winRate >= 70) ? 'Master' :
    (userStats.totalBets >= 30 && userStats.winRate >= 60) ? 'Expert' :
    (userStats.totalBets >= 20 && userStats.winRate >= 50) ? 'Advanced' :
    (userStats.totalBets >= 10) ? 'Intermediate' : 'Beginner'
    : 'Beginner';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/leaderboard')}
          className="mb-6 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-2"
        >
          ← Back to Leaderboard
        </button>

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {userProfile?.username ? userProfile.username[0].toUpperCase() : walletAddress[0]}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {userProfile?.username ? `@${userProfile.username}` : 'Anonymous Trader'}
              </h1>
              
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </p>
              </div>

              {/* Rank */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRankColor(rank)} bg-gray-100 dark:bg-gray-700`}>
                <span>{getRankIcon(rank)}</span>
                <span>{rank}</span>
              </div>

              {/* Twitter */}
              {userProfile?.twitter_username && (
                <div className="flex items-center gap-2 mt-3">
                  <FaXTwitter className="text-gray-600 dark:text-gray-400" />
                  <a
                    href={`https://twitter.com/${userProfile.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    @{userProfile.twitter_username}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Bets</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.totalBets || 0}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(userStats.winRate || 0).toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Volume</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(userStats.totalVolume || 0).toFixed(0)} APES
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Profit/Loss</span>
              </div>
              <p className={`text-2xl font-bold ${
                (userStats.profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {(userStats.profit || 0) >= 0 ? '+' : ''}{(userStats.profit || 0).toFixed(0)} APES
              </p>
            </div>
          </div>
        )}

        {/* Performance Chart Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Overview</h3>
          
          {userStats && userStats.totalBets > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {(userStats.winRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(userStats.winRate || 0, 100)}%` }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Total Winnings</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{Math.max(0, userStats.profit || 0).toFixed(0)} APES
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Successful Predictions</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {userStats.wonBets || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No trading activity yet</p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready to Start Trading?</h3>
          <p className="text-gray-100 mb-4">Join the prediction market and compete with the best traders</p>
          <button
            onClick={() => navigate('/markets')}
            className="px-6 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Explore Markets
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage; 