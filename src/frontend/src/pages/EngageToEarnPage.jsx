import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaTrophy, FaCoins, FaStar, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import TwitterFeed from '../components/TwitterFeed';

const EngageToEarnPage = () => {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [twitterLinked, setTwitterLinked] = useState(false);
  const [twitterStats, setTwitterStats] = useState(null);

  useEffect(() => {
    if (publicKey) {
      fetchData();
    }
  }, [publicKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch balance
      const balanceRes = await fetch(`${import.meta.env.VITE_API_URL}/api/engagement/balance/${publicKey.toString()}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
        setTwitterLinked(balanceData.has_twitter_linked);
      }

      // Fetch Twitter stats if linked
      if (twitterLinked && publicKey) {
        const twitterRes = await fetch(`${import.meta.env.VITE_API_URL}/api/twitter/engagement-summary`, {
          headers: {
            'x-wallet-address': publicKey.toString(),
          },
        });
        if (twitterRes.ok) {
          const twitterData = await twitterRes.json();
          setTwitterStats(twitterData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Bronze': return 'text-orange-600';
      case 'Silver': return 'text-gray-500';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatActivityType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-6 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p>Please connect your wallet to access the Engage-to-Earn dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Engage to Earn</h1>
        <p className="text-gray-600 dark:text-gray-400">Validate your social engagement and earn points for interacting with our posts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <div className="flex items-center justify-between mb-2">
            <FaCoins className="text-yellow-500 text-2xl" />
            <span className={`font-bold ${getTierColor(balance?.tier || 'Bronze')}`}>
              {balance?.tier || 'Bronze'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{balance?.total_points || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <FaStar className="text-purple-500 text-2xl mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Available Points</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{balance?.available_points || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <FaTrophy className="text-green-500 text-2xl mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Multiplier</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{balance?.multiplier?.toFixed(2) || '1.00'}x</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <FaXTwitter className="text-gray-900 dark:text-gray-100 text-2xl mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">𝕏 Status</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {twitterLinked ? (
              <>
                Linked <FaCheckCircle className="text-green-500" />
              </>
            ) : (
              'Not Linked'
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'twitter'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('twitter')}
            >
              𝕏 Engagement
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">How to Earn Points</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">Platform Activities</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Place a Prediction</span>
                      <span className="font-medium">+10 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Win a Prediction</span>
                      <span className="font-medium">+50 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>First Prediction Daily</span>
                      <span className="font-medium">+20 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Complete Profile</span>
                      <span className="font-medium">+50 pts</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-900">𝕏 Activities</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Link 𝕏 Account</span>
                      <span className="font-medium">+100 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Follow @PrimapeApp</span>
                      <span className="font-medium">+50 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Like Post</span>
                      <span className="font-medium">+5 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Repost</span>
                      <span className="font-medium">+10 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Comment on Post</span>
                      <span className="font-medium">+15 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Activities</h3>
                <div className="space-y-2">
                  {balance?.recent_activities?.map((activity, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatActivityType(activity.activity_type)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">+{activity.points_earned}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'twitter' && (
            <div>
              {twitterLinked ? (
                <div className="space-y-6">
                  {/* Twitter Stats */}
                  {twitterStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{twitterStats.summary.find(s => s.engagement_type === 'like')?.count || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Likes</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{twitterStats.summary.find(s => s.engagement_type === 'repost')?.count || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reposts</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{twitterStats.summary.find(s => s.engagement_type === 'comment')?.count || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Comments</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {twitterStats.summary.reduce((sum, s) => sum + parseInt(s.total_points || 0), 0)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">𝕏 Points</p>
                      </div>
                    </div>
                  )}

                  {/* Twitter Feed */}
                  <TwitterFeed twitterLinked={twitterLinked} />
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-6 rounded-lg text-center">
                  <FaXTwitter className="text-4xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Link Your 𝕏 Account</h3>
                  <p className="mb-4">You need to link your 𝕏 account to validate social engagement and earn points.</p>
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Go to Profile to Link 𝕏
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress to Next Tier */}
      {balance?.next_milestone && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Progress to Next Tier</h3>
          <div className="mb-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
            <span>{balance.tier}</span>
            <span>{balance.next_milestone - balance.total_points} points to next tier</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(balance.total_points / balance.next_milestone) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EngageToEarnPage; 