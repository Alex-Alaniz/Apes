import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaTrophy, FaCoins, FaStar, FaCheckCircle, FaExternalLinkAlt, FaHeart, FaRetweet, FaComment, FaSpinner, FaClock } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { formatDistanceToNow } from 'date-fns';

const TwitterEngagement = ({ twitterLinked, posts, postsLoading, postsError, onRefreshPosts, onRefreshAuth, onLoadMorePosts, refreshCache }) => {
  const { publicKey } = useWallet();
  const [engagements, setEngagements] = useState({});
  const [pointsEarned, setPointsEarned] = useState(0);
  const [isVerifying, setIsVerifying] = useState({});
  const [pendingValidations, setPendingValidations] = useState({});

  // Poll for validation status
  useEffect(() => {
    if (!publicKey || !twitterLinked) return;

    const pollValidations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/validation-status/${publicKey.toString()}`, {
          headers: {
            'x-wallet-address': publicKey.toString(),
          }
        });

        if (response.ok) {
          const data = await response.json();
          const validationMap = {};
          let newPoints = 0;

          data.validations.forEach(validation => {
            const key = `${validation.tweet_id}-${validation.engagement_type}`;
            validationMap[key] = validation;
            
            // If newly validated, add to points
            if (validation.status === 'validated' && validation.points_awarded > 0) {
              if (!engagements[validation.tweet_id]?.[validation.engagement_type]) {
                newPoints += validation.points_awarded;
              }
            }
          });

          setPendingValidations(validationMap);
          
          // Update engagements based on validated results
          const newEngagements = { ...engagements };
          Object.values(validationMap).forEach(validation => {
            if (validation.status === 'validated') {
              if (!newEngagements[validation.tweet_id]) {
                newEngagements[validation.tweet_id] = {};
              }
              newEngagements[validation.tweet_id][validation.engagement_type] = true;
            }
          });
          setEngagements(newEngagements);
          
          if (newPoints > 0) {
            setPointsEarned(prev => prev + newPoints);
          }
        }
      } catch (error) {
        console.error('Error polling validation status:', error);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollValidations, 5000);
    pollValidations(); // Initial poll

    return () => clearInterval(interval);
  }, [publicKey, twitterLinked, engagements]);

  const handleEngagement = async (postId, type) => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!twitterLinked) {
      alert('🔗 Please link your 𝕏 account first!\n\nGo to Profile → Link 𝕏 Account to start earning points.');
      return;
    }

    // Check if already engaged or pending
    const validationKey = `${postId}-${type}`;
    if (engagements[postId]?.[type] || pendingValidations[validationKey]?.status === 'pending') {
      return;
    }

    setIsVerifying(prev => ({ ...prev, [`${postId}-${type}`]: true }));

    // Open Twitter for engagement
    const post = posts.find(p => p.id === postId);
    if (post) {
      // Open Twitter in new tab
      window.open(post.url, '_blank');
      
      try {
        // Queue validation instead of awarding points immediately
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/queue-engagement-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': publicKey.toString(),
          },
          body: JSON.stringify({
            tweet_id: postId,
            engagement_type: type,
            tweet_url: post.url
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update pending validations
          setPendingValidations(prev => ({
            ...prev,
            [validationKey]: {
              tweet_id: postId,
              engagement_type: type,
              status: 'pending',
              created_at: new Date().toISOString()
            }
          }));

          // Show success message
          const points = type === 'like' ? 5 : type === 'repost' ? 10 : 15;
          setTimeout(() => {
            alert(`🔄 ${type} queued for validation!\n\nWe'll check your ${type} in a few seconds and award ${points} APES if verified.`);
          }, 1000);
        } else {
          throw new Error('Failed to queue validation');
        }
      } catch (error) {
        console.error('Error queuing validation:', error);
        alert('❌ Failed to queue validation. Please try again.');
      }
    }

    setTimeout(() => {
      setIsVerifying(prev => ({ ...prev, [`${postId}-${type}`]: false }));
    }, 2000);
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
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getValidationStatus = (postId, type) => {
    const key = `${postId}-${type}`;
    const validation = pendingValidations[key];
    
    if (engagements[postId]?.[type]) return 'completed';
    if (validation?.status === 'pending') return 'pending';
    if (validation?.status === 'validated') return 'completed';
    if (validation?.status === 'failed') return 'failed';
    if (validation?.status === 'not_linked') return 'not_linked';
    if (validation?.status === 'auth_expired') return 'auth_expired';
    if (validation?.status === 'error') return 'error';
    return 'none';
  };

  const getValidationMessage = (status, type) => {
    const baseIcon = type === 'like' ? FaHeart : type === 'repost' ? FaRetweet : FaComment;
    
    switch (status) {
      case 'pending':
        return { icon: FaClock, text: 'Validating...', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' };
      case 'completed':
        return { icon: FaCheckCircle, text: 'Done', color: type === 'like' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : type === 'repost' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
      case 'failed':
        return { icon: baseIcon, text: 'Try Again', color: 'text-gray-400 bg-gray-50 dark:bg-gray-800' };
      case 'not_linked':
        return { icon: FaXTwitter, text: 'Link 𝕏', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
      case 'auth_expired':
        return { icon: FaXTwitter, text: 'Re-link 𝕏', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' };
      case 'error':
        return { icon: baseIcon, text: 'Try Again', color: 'text-gray-400 bg-gray-50 dark:bg-gray-800' };
      default:
        return { icon: baseIcon, text: `+${getEngagementPoints(type)}`, color: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800' };
    }
  };

  const handleValidationClick = (postId, type, status) => {
    if (status === 'not_linked' || status === 'auth_expired') {
      // Redirect to profile to link Twitter account
      if (confirm(`You need to link your 𝕏 account to earn points. Go to Profile now?`)) {
        window.location.href = '/profile';
      }
      return;
    }
    
    if (status === 'failed' || status === 'error') {
      // Allow retry
      handleEngagement(postId, type);
      return;
    }
  };

  // Check if user is authenticated but not linked (show different message)
  const isAuthenticated = !!publicKey;
  const isLinked = twitterLinked;

  return (
    <div className="space-y-6">
      {/* Twitter Authentication Banner for non-authenticated users */}
      {!isLinked && (
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Link 𝕏 Account
            </button>
            {isAuthenticated && (
              <button
                onClick={onRefreshAuth}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Refresh Status
              </button>
            )}
          </div>
          {isAuthenticated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Already linked? Click "Refresh Status" to update
            </p>
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

      {/* Twitter Link Info Banner for authenticated but not linked users */}
      {isAuthenticated && !isLinked && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FaXTwitter className="text-2xl text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                🔗 Link your 𝕏 account to validate engagement and earn points
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                Your likes, reposts, and comments will be verified automatically once you link your account
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Link Now
            </button>
          </div>
        </div>
      )}

      {/* @PrimapeApp Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FaXTwitter className="text-gray-900 dark:text-gray-100" />
            @PrimapeApp Latest Posts
            {posts.length > 0 && posts[0].profile_image_url && (
              <span className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full font-normal">
                Live
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshPosts}
              disabled={postsLoading}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
            >
              {postsLoading ? 'Loading...' : 'Refresh'}
            </button>
            {publicKey && (
              <button
                onClick={refreshCache}
                disabled={postsLoading}
                className="text-green-600 dark:text-green-400 hover:underline text-sm flex items-center gap-1"
                title="Manually trigger tweet cache refresh"
              >
                🔄 Force Update
              </button>
            )}
            <a
              href="https://twitter.com/PrimapeApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
            >
              Follow <FaExternalLinkAlt className="text-xs" />
            </a>
          </div>
        </div>

        {postsLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-2xl text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading posts...</span>
          </div>
        ) : postsError ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
            <FaXTwitter className="text-2xl mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Tweet Cache Status</h4>
            <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm">{postsError}</p>
            <div className="space-y-2">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                📡 Tweets are automatically cached every 2-3 hours to avoid API rate limits
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={onRefreshPosts}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Check Cache
                </button>
                {publicKey && (
                  <button
                    onClick={refreshCache}
                    disabled={postsLoading}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                  >
                    Force Refresh
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No posts available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
            const postEngagements = engagements[post.id] || {};
            
            return (
              <div key={post.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer">
                {/* X-like Tweet Header */}
                <div className="flex items-start p-4 space-x-3">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    {post.profile_image_url ? (
                      <img 
                        src={post.profile_image_url} 
                        alt="@PrimapeApp"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center ${post.profile_image_url ? 'hidden' : ''}`}>
                      <FaXTwitter className="text-blue-600 dark:text-blue-400 text-lg" />
                    </div>
                  </div>
                  
                  {/* Tweet Content */}
                  <div className="flex-1 min-w-0">
                    {/* User Info */}
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="font-bold text-gray-900 dark:text-gray-100">PrimapeApp</span>
                      {post.author_verified && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-gray-500 dark:text-gray-400">@PrimapeApp</span>
                      <span className="text-gray-500 dark:text-gray-400">·</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                    
                    {/* Tweet Text */}
                    <div className="text-gray-900 dark:text-gray-100 text-[15px] leading-normal mb-3 whitespace-pre-line">
                      {post.text}
                    </div>
                    
                    {/* Media */}
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        {post.media_urls.map((media, index) => (
                          <img 
                            key={index}
                            src={media.url} 
                            alt="Tweet media"
                            className="w-full max-h-96 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Engagement Stats */}
                    <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400 text-sm mb-3">
                      <span>{post.engagement_stats?.reply_count || post.engagement_stats?.comments || 0}</span>
                      <span>{post.engagement_stats?.retweet_count || post.engagement_stats?.retweets || 0}</span>
                      <span>{post.engagement_stats?.like_count || post.engagement_stats?.likes || 0}</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between max-w-md">
                      {['like', 'repost', 'comment'].map(type => {
                        const status = getValidationStatus(post.id, type);
                        const { icon: Icon, text, color } = getValidationMessage(status, type);
                        
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              if (!isAuthenticated) {
                                alert('🔗 Please link your 𝕏 account first!');
                                return;
                              }
                              if (status === 'none') {
                                handleEngagement(post.id, type);
                              } else {
                                handleValidationClick(post.id, type, status);
                              }
                            }}
                            disabled={status === 'completed' || status === 'pending' || isVerifying[`${post.id}-${type}`]}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all text-sm font-medium group ${
                              !isAuthenticated
                                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : color
                            }`}
                          >
                            <Icon className={`${status === 'completed' && type === 'like' ? 'fill-current' : ''}`} />
                            {!isAuthenticated ? (
                              <span>Link 𝕏</span>
                            ) : isVerifying[`${post.id}-${type}`] ? (
                              <span>Opening...</span>
                            ) : (
                              <span>{text}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* External Link */}
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <FaExternalLinkAlt className="text-sm" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Load More Posts Button - Only show if we have cached tweets */}
        {posts.length > 0 && posts[0].profile_image_url && (
          <div className="mt-6 text-center">
            <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              📅 Cached tweets from the last 48 hours • Updated every 2-3 hours
            </div>
            <button
              onClick={onLoadMorePosts}
              disabled={postsLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {postsLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Loading More...
                </>
              ) : (
                <>
                  <FaXTwitter />
                  Load More Cached Posts
                </>
              )}
            </button>
            <div className="mt-2">
              <a
                href="https://twitter.com/PrimapeApp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 justify-center"
              >
                Follow @PrimapeApp <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EngageToEarnPage = () => {
  const { publicKey, connected } = useWallet();
  const [userProfile, setUserProfile] = useState(null);
  const [isTwitterLinked, setIsTwitterLinked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [engagements, setEngagements] = useState({});
  const [verifying, setVerifying] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [postsOffset, setPostsOffset] = useState(0);

  useEffect(() => {
    if (connected && publicKey) {
      checkTwitterStatus();
      fetchPrimapePosts();
    } else {
      // Show posts even when not connected
      fetchPrimapePosts();
      setLoadingProfile(false);
    }
  }, [connected, publicKey]);

  const checkTwitterStatus = async () => {
    if (!publicKey) return;

    try {
      setLoadingProfile(true);
      console.log('🔍 EngageToEarn: Checking Twitter status for', publicKey.toString());
      
      // Use the same working endpoint as other pages
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/users/${publicKey.toString()}`, {
        headers: { 
          'x-wallet-address': publicKey.toString(),
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 EngageToEarn: API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 EngageToEarn: User data received:', {
          wallet: data.wallet_address,
          hasTwitter: !!data.twitter_username,
          twitterUsername: data.twitter_username
        });
        
        setUserProfile(data);
        const twitterLinked = !!(data.twitter_username && data.twitter_username.trim());
        setIsTwitterLinked(twitterLinked);
        
        if (twitterLinked) {
          console.log('✅ EngageToEarn: Twitter linked detected:', data.twitter_username);
        } else {
          console.log('❌ EngageToEarn: No Twitter linked for this wallet');
        }
      } else {
        console.warn('⚠️ EngageToEarn: User API failed:', response.status);
        // Still try to create user if they don't exist
        if (response.status === 404) {
          await createUserIfNeeded();
        }
      }
    } catch (error) {
      console.error('❌ EngageToEarn: Error checking Twitter status:', error);
      // Fallback: try to create user
      await createUserIfNeeded();
    } finally {
      setLoadingProfile(false);
    }
  };

  const createUserIfNeeded = async () => {
    if (!publicKey) return;
    
    try {
      console.log('🔄 EngageToEarn: Creating/ensuring user exists');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/users/create-or-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString()
        })
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ EngageToEarn: User created/found:', userData);
        setUserProfile(userData);
        setIsTwitterLinked(!!(userData.twitter_username && userData.twitter_username.trim()));
      }
    } catch (error) {
      console.error('❌ EngageToEarn: Error creating user:', error);
    }
  };

  const fetchPrimapePosts = async () => {
    try {
      setPostsLoading(true);
      setPostsError(null);
      
      console.log('🐦 Fetching @PrimapeApp posts from cache...');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/primape-posts?limit=5`);
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🐦 Fetched posts data:', data);
      console.log('🔍 API source:', data.source);
      
      // Handle different cache states
      if (data.source === 'database_cache' && data.tweets.length > 0) {
        // Transform cached tweets to expected format
        const transformedPosts = data.tweets.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          author_username: 'PrimapeApp',
          url: `https://twitter.com/PrimapeApp/status/${tweet.id}`,
          profile_image_url: tweet.profile_image_url,
          author_verified: tweet.author_verified,
          media_urls: tweet.media_urls,
          engagement_stats: tweet.engagement_stats || { 
            like_count: 0, 
            retweet_count: 0, 
            reply_count: 0 
          },
          last_cached: tweet.last_cached
        }));
        
        setPosts(transformedPosts);
        setPostsError(null);
        console.log('✅ Cached tweets loaded successfully!', transformedPosts.length, 'tweets');
      } 
      else if (data.source === 'cache_empty') {
        console.log('📭 No tweets in cache, waiting for next scheduled fetch');
        setPostsError(
          `Tweets are automatically fetched every 2-3 hours. ${
            data.cache_info?.next_scheduled 
              ? `Next update: ${new Date(data.cache_info.next_scheduled).toLocaleTimeString()}`
              : 'Check back soon!'
          }`
        );
        setPosts([]);
      }
      else {
        console.log('⚠️ Unexpected response:', data);
        setPostsError('Unable to load tweets. Our system will retry automatically every 2-3 hours.');
        setPosts([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching @PrimapeApp posts:', error);
      setPostsError('Connection issue. Tweets are cached every 2-3 hours - please try refreshing.');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMorePosts = async () => {
    // Only allow loading more if we have cached tweets
    if (posts.length === 0 || !posts[0].profile_image_url) {
      console.log('❌ Cannot load more - no cached tweets available');
      return;
    }

    try {
      setPostsLoading(true);
      const newOffset = postsOffset + 10;
      
      console.log('🔄 Loading more cached posts with offset:', newOffset);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/primape-posts?limit=10&offset=${newOffset}`);
      
      if (!response.ok) {
        console.error('Failed to load more posts:', response.status);
        return;
      }
      
      const data = await response.json();
      
      // Only accept cached data
      if (data.source !== 'database_cache') {
        console.log('❌ Load more failed - no cached data available');
        return;
      }
      
      const newPosts = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_username: 'PrimapeApp',
        url: `https://twitter.com/PrimapeApp/status/${tweet.id}`,
        profile_image_url: tweet.profile_image_url,
        author_verified: tweet.author_verified,
        media_urls: tweet.media_urls,
        engagement_stats: tweet.engagement_stats || { 
          like_count: 0, 
          retweet_count: 0, 
          reply_count: 0 
        }
      }));
      
      // Only append if we got new cached posts
      if (newPosts.length > 0 && newPosts[0].profile_image_url) {
        setPosts(prev => [...prev, ...newPosts]);
        setPostsOffset(newOffset);
        console.log(`✅ Loaded ${newPosts.length} more cached posts`);
      } else {
        console.log('📭 No more cached posts available');
      }
      
    } catch (error) {
      console.error('❌ Error loading more posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Add manual refresh function for cache
  const refreshCache = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setPostsLoading(true);
      console.log('🔄 Requesting manual cache refresh...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/refresh-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert('🔄 Cache refresh initiated! New tweets will appear in a few minutes.');
        
        // Wait a bit and then refresh the page data
        setTimeout(() => {
          fetchPrimapePosts();
        }, 3000);
      } else {
        throw new Error('Failed to refresh cache');
      }
    } catch (error) {
      console.error('❌ Error refreshing cache:', error);
      alert('❌ Failed to refresh cache. Please try again later.');
    } finally {
      setPostsLoading(false);
    }
  };

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
            {isTwitterLinked ? (
              <>
                Linked <FaCheckCircle className="text-green-500" />
              </>
            ) : (
              'Not Linked'
            )}
          </p>
          {isTwitterLinked && (
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
            <TwitterEngagement 
              twitterLinked={isTwitterLinked} 
              posts={posts}
              postsLoading={postsLoading}
              postsError={postsError}
              onRefreshPosts={fetchPrimapePosts}
              onRefreshAuth={checkTwitterStatus}
              onLoadMorePosts={loadMorePosts}
              refreshCache={refreshCache}
            />
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