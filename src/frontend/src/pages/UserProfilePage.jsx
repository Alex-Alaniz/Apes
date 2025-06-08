import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { User, Trophy, TrendingUp, Clock, UserPlus, UserMinus, ArrowLeft } from 'lucide-react';
import Toast from '../components/Toast';

const UserProfilePage = () => {
  const { walletAddress } = useParams();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [toast, setToast] = useState(null);
  
  const isOwnProfile = publicKey && publicKey.toString() === walletAddress;

  useEffect(() => {
    // Redirect to own profile page if viewing own address
    if (isOwnProfile) {
      navigate('/profile');
      return;
    }
    
    loadUserProfile();
  }, [walletAddress, isOwnProfile]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/users/profile/${walletAddress}`
      );
      
      if (!response.ok) {
        throw new Error('User not found');
      }
      
      const data = await response.json();
      setUserData(data.user);
      setPredictions(data.recentPredictions);
      
      // Check if current user is following this user
      if (publicKey) {
        checkFollowStatus();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setToast({
        message: 'Failed to load user profile',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    // In a real implementation, this would check the database
    // For now, we'll use localStorage
    const followKey = `following_${publicKey.toString()}_${walletAddress}`;
    setIsFollowing(localStorage.getItem(followKey) === 'true');
  };

  const handleFollow = async () => {
    if (!publicKey) {
      setToast({
        message: 'Please connect your wallet to follow users',
        type: 'error'
      });
      return;
    }

    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/users/follow`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followerWallet: publicKey.toString(),
            followingWallet: walletAddress,
            action
          })
        }
      );

      if (response.ok) {
        setIsFollowing(!isFollowing);
        const followKey = `following_${publicKey.toString()}_${walletAddress}`;
        localStorage.setItem(followKey, (!isFollowing).toString());
        
        setToast({
          message: isFollowing ? 'Unfollowed successfully' : 'Following successfully',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      setToast({
        message: 'Failed to update follow status',
        type: 'error'
      });
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">User Not Found</h2>
          <p className="text-gray-400 mb-6">This user hasn't created a profile yet.</p>
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Profile Header */}
        <div className="mb-8">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    {userData.avatar_url ? (
                      <img 
                        src={userData.avatar_url} 
                        alt={userData.username || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold ${getRankColor(userData.rank)} bg-gray-900 border border-gray-700`}>
                    {getRankIcon(userData.rank)} {userData.rank}
                  </div>
                </div>
                
                {/* User Info */}
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {userData.username || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  </h1>
                  <p className="text-gray-400 text-sm mb-3">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </p>
                  {userData.bio && (
                    <p className="text-gray-300 mb-3 max-w-md">{userData.bio}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-gray-400">
                      <span className="font-semibold text-white">{userData.followers_count || 0}</span> followers
                    </div>
                    <div className="text-gray-400">
                      <span className="font-semibold text-white">{userData.following_count || 0}</span> following
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Follow Button */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    isFollowing 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-5 h-5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Predictions</h3>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{userData.total_predictions || 0}</p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Win Rate</h3>
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {(userData.win_rate || 0).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Invested</h3>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {(userData.total_invested || 0).toFixed(0)} <span className="text-sm text-gray-400">APES</span>
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Profit</h3>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className={`text-2xl font-bold ${(userData.total_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(userData.total_profit || 0) >= 0 ? '+' : ''}{(userData.total_profit || 0).toFixed(0)} <span className="text-sm text-gray-400">APES</span>
            </p>
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Predictions</h2>
          
          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No predictions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/markets/${prediction.market_pubkey}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">
                        {prediction.market_question}
                      </h4>
                      <div className="text-sm text-gray-400">
                        Predicted: <span className="text-white">{prediction.option_text}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        prediction.market_status === 'Active' 
                          ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                          : prediction.is_winner 
                            ? 'bg-green-900/50 text-green-400 border border-green-800'
                            : prediction.is_winner === false
                              ? 'bg-red-900/50 text-red-400 border border-red-800'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {prediction.market_status === 'Active' 
                          ? 'Pending' 
                          : prediction.is_winner 
                            ? 'Won' 
                            : prediction.is_winner === false
                              ? 'Lost'
                              : prediction.market_status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-400">
                      Amount: <span className="text-white font-medium">{prediction.amount.toFixed(2)} APES</span>
                    </div>
                    <div className="text-gray-400">
                      {format(new Date(prediction.predicted_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  
                  {prediction.is_winner && prediction.payout_amount && (
                    <div className="mt-2 text-sm text-green-400">
                      Payout: +{prediction.payout_amount.toFixed(2)} APES
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

export default UserProfilePage; 