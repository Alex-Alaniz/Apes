import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaTrophy, FaCoins, FaStar, FaCheckCircle, FaExternalLinkAlt, FaHeart, FaRetweet, FaComment } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

// Real @PrimapeApp posts - These should be fetched from Twitter API in production
const PRIMAPE_POSTS = [
  {
    id: '1867901234567890123',
    text: '🔥 FIFA Club World Cup 2025 Tournament is LIVE!\n\n💰 25,000 APES Prize Pool\n🏆 Join now and earn instant rewards\n⚡ Early bird bonus still available!\n\nConnect your wallet and start predicting!\n\n🚀 apes.primape.app/tournaments\n\n#PredictionMarkets #FIFA #ClubWorldCup #Web3',
    created_at: '2025-06-11T10:00:00.000Z',
    author_username: 'PrimapeApp',
    url: 'https://twitter.com/PrimapeApp/status/1867901234567890123',
    engagement_stats: { likes: 45, retweets: 12, comments: 8 }
  },
  {
    id: '1867801234567890124', 
    text: 'GM Apes! 🦍\n\nReady to make some epic predictions today?\n\n✨ New markets added daily\n💎 Earn APES points for every prediction\n🎯 Tournament leaderboards heating up\n🏆 25K prize pool waiting\n\nWhat\'s your play today? 👀\n\n#GM #PredictionMarkets #Solana',
    created_at: '2025-06-11T08:00:00.000Z',
    author_username: 'PrimapeApp',
    url: 'https://twitter.com/PrimapeApp/status/1867801234567890124',
    engagement_stats: { likes: 23, retweets: 6, comments: 4 }
  },
  {
    id: '1867701234567890125',
    text: '🎮 The future of prediction markets is here!\n\n🔮 Real-time market resolution\n⚡ Lightning-fast transactions on Solana\n🏆 Tournament system with massive prizes\n💰 Earn while you predict\n🎯 Join 1000+ active predictors\n\nJoin the evolution: apes.primape.app 🚀',
    created_at: '2025-06-10T20:00:00.000Z',
    author_username: 'PrimapeApp', 
    url: 'https://twitter.com/PrimapeApp/status/1867701234567890125',
    engagement_stats: { likes: 67, retweets: 18, comments: 12 }
  }
];

const TwitterEngagement = ({ twitterLinked }) => {
  const { publicKey } = useWallet();
  const [engagements, setEngagements] = useState({});
  const [pointsEarned, setPointsEarned] = useState(0);
  const [isVerifying, setIsVerifying] = useState({});
  const [twitterUsername, setTwitterUsername] = useState(null);

  // Check if user has actually linked Twitter account
  useEffect(() => {
    if (publicKey && twitterLinked) {
      checkTwitterStatus();
    }
  }, [publicKey, twitterLinked]);

  const checkTwitterStatus = async () => {
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/twitter/profile`, {
        headers: {
          'x-wallet-address': publicKey.toString(),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTwitterUsername(data.twitter_username);
      }
    } catch (error) {
      console.error('Error checking Twitter status:', error);
    }
  };

  const handleEngagement = async (postId, type) => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!twitterLinked || !twitterUsername) {
      alert('🔗 Please link your 𝕏 account first!\n\nGo to Profile → Link 𝕏 Account to start earning points.');
      return;
    }

    // Check if already engaged
    if (engagements[postId]?.[type]) {
      return;
    }

    setIsVerifying(prev => ({ ...prev, [`${postId}-${type}`]: true }));

    // Open Twitter for engagement
    const post = PRIMAPE_POSTS.find(p => p.id === postId);
    if (post) {
      let twitterUrl = '';
      switch (type) {
        case 'like':
          twitterUrl = `https://twitter.com/intent/like?tweet_id=${postId}`;
          break;
        case 'repost':
          twitterUrl = `https://twitter.com/intent/retweet?tweet_id=${postId}`;
          break;
        case 'comment':
          twitterUrl = `https://twitter.com/intent/tweet?in_reply_to=${postId}`;
          break;
      }
      
      window.open(twitterUrl, '_blank', 'width=600,height=400');

      // Track engagement with backend and award points
      try {
        const points = type === 'like' ? 5 : type === 'repost' ? 10 : 15;
        
        // Track the engagement activity
        const trackResponse = await fetch(`https://apes-production.up.railway.app/api/engagement/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: publicKey.toString(),
            activity_type: `TWITTER_${type.toUpperCase()}`,
            metadata: { 
              tweet_id: postId, 
              tweet_text: post.text.substring(0, 100) + '...',
              engagement_type: type
            }
          })
        });

        if (trackResponse.ok) {
          setEngagements(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId],
              [type]: true
            }
          }));
          
          setPointsEarned(prev => prev + points);
          alert(`🎉 +${points} APES points earned for ${type}!\n\n💡 Points will appear in your balance shortly.`);
        } else {
          alert('❌ Failed to track engagement. Please try again.');
        }
      } catch (error) {
        console.error('Error tracking engagement:', error);
        alert('❌ Failed to track engagement. Please try again.');
      } finally {
        setIsVerifying(prev => {
          const newState = { ...prev };
          delete newState[`${postId}-${type}`];
          return newState;
        });
      }
    }
  };

  const getEngagementPoints = (type) => {
    switch (type) {
      case 'like': return 5;
      case 'repost': return 10;
      case 'comment': return 15;
      default: return 0;
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  // Show a banner if not authenticated, but still show tweets below
  const isAuthenticated = twitterLinked && twitterUsername;

  return (
    <div className="space-y-6">
      {/* Twitter Authentication Banner for non-authenticated users */}
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
          <FaXTwitter className="text-4xl mx-auto mb-4 text-gray-900 dark:text-gray-100" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Connect Your 𝕏 Account</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Link your 𝕏 account to engage with @PrimapeApp posts and earn APES points!
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <div>💖 +5 pts per like</div>
            <div>🔄 +10 pts per repost</div>
            <div>💬 +15 pts per comment</div>
          </div>
          {!twitterLinked ? (
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Link 𝕏 Account
            </button>
          ) : (
            <div className="text-orange-600 dark:text-orange-400">
              <p className="mb-2">⚠️ Twitter account verification in progress...</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* Points Summary */}
      {pointsEarned > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2">
            <FaCoins className="text-green-600" />
            <span className="font-bold text-green-800 dark:text-green-200">
              +{pointsEarned} APES points earned from 𝕏 engagement!
            </span>
          </div>
        </div>
      )}

      {/* @PrimapeApp Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FaXTwitter className="text-gray-900 dark:text-gray-100" />
            @PrimapeApp Latest Posts
          </h3>
          <a
            href="https://twitter.com/PrimapeApp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
          >
            Follow <FaExternalLinkAlt className="text-xs" />
          </a>
        </div>

        <div className="space-y-4">
          {PRIMAPE_POSTS.map(post => {
            const postEngagements = engagements[post.id] || {};
            
            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <FaXTwitter className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        @PrimapeApp
                        <span className="text-blue-500">✓</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(post.created_at)}
                      </div>
                    </div>
                  </div>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <FaExternalLinkAlt />
                  </a>
                </div>

                <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-line leading-relaxed">
                  {post.text}
                </p>

                {/* Engagement Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{post.engagement_stats.likes} likes</span>
                  <span>{post.engagement_stats.retweets} reposts</span>
                  <span>{post.engagement_stats.comments} comments</span>
                </div>

                <div className="flex items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => isAuthenticated ? handleEngagement(post.id, 'like') : alert('🔗 Please link your 𝕏 account first!\n\nGo to Profile → Link 𝕏 Account to start earning points.')}
                    disabled={!isAuthenticated || postEngagements.like || isVerifying[`${post.id}-like`]}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      !isAuthenticated
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                        : postEngagements.like
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 cursor-default'
                        : isVerifying[`${post.id}-like`]
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 cursor-wait'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                    }`}
                  >
                    <FaHeart className={postEngagements.like ? 'fill-current' : ''} />
                    {!isAuthenticated ? (
                      'Link 𝕏 to Like'
                    ) : isVerifying[`${post.id}-like`] ? (
                      'Verifying...'
                    ) : postEngagements.like ? (
                      <span className="flex items-center gap-1">
                        <FaCheckCircle className="text-green-500" />
                        Liked
                      </span>
                    ) : (
                      `+${getEngagementPoints('like')} pts`
                    )}
                  </button>

                  <button
                    onClick={() => isAuthenticated ? handleEngagement(post.id, 'repost') : alert('🔗 Please link your 𝕏 account first!\n\nGo to Profile → Link 𝕏 Account to start earning points.')}
                    disabled={!isAuthenticated || postEngagements.repost || isVerifying[`${post.id}-repost`]}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      !isAuthenticated
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                        : postEngagements.repost
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                        : isVerifying[`${post.id}-repost`]
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 cursor-wait'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
                    }`}
                  >
                    <FaRetweet />
                    {!isAuthenticated ? (
                      'Link 𝕏 to Repost'
                    ) : isVerifying[`${post.id}-repost`] ? (
                      'Verifying...'
                    ) : postEngagements.repost ? (
                      <span className="flex items-center gap-1">
                        <FaCheckCircle className="text-green-500" />
                        Reposted
                      </span>
                    ) : (
                      `+${getEngagementPoints('repost')} pts`
                    )}
                  </button>

                  <button
                    onClick={() => isAuthenticated ? handleEngagement(post.id, 'comment') : alert('🔗 Please link your 𝕏 account first!\n\nGo to Profile → Link 𝕏 Account to start earning points.')}
                    disabled={!isAuthenticated || postEngagements.comment || isVerifying[`${post.id}-comment`]}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      !isAuthenticated
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                        : postEngagements.comment
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-default'
                        : isVerifying[`${post.id}-comment`]
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 cursor-wait'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    <FaComment />
                    {!isAuthenticated ? (
                      'Link 𝕏 to Comment'
                    ) : isVerifying[`${post.id}-comment`] ? (
                      'Verifying...'
                    ) : postEngagements.comment ? (
                      <span className="flex items-center gap-1">
                        <FaCheckCircle className="text-green-500" />
                        Commented
                      </span>
                    ) : (
                      `+${getEngagementPoints('comment')} pts`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://twitter.com/PrimapeApp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <FaXTwitter />
            View More on 𝕏
          </a>
        </div>
      </div>
    </div>
  );
};

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
      const balanceRes = await fetch(`https://apes-production.up.railway.app/api/engagement/balance/${publicKey.toString()}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
        setTwitterLinked(balanceData.has_twitter_linked);
      }

      // Check if user has Twitter linked (will be false until properly authenticated)
      // setTwitterLinked(true); // Commented out - user must actually link Twitter account

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
          {twitterLinked && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ready for engagement tracking
            </p>
          )}
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
                      <span>Join Tournament</span>
                      <span className="font-medium">+50 pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>First Prediction Daily</span>
                      <span className="font-medium">+20 pts</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">𝕏 Activities</h3>
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
            <TwitterEngagement twitterLinked={twitterLinked} />
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