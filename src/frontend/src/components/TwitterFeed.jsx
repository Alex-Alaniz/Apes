import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaXTwitter } from 'react-icons/fa6';
import { FaHeart, FaRetweet, FaComment, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const TwitterFeed = ({ twitterLinked }) => {
  const { publicKey } = useWallet();
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState({});
  const [verifying, setVerifying] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (twitterLinked) {
      fetchTweets();
      fetchEngagementStatus();
    }
  }, [twitterLinked]);

  const fetchTweets = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/primape-posts?limit=5`);
      if (!response.ok) throw new Error('Failed to fetch tweets');
      
      const data = await response.json();
      setTweets(data.tweets || []);
    } catch (error) {
      console.error('Error fetching tweets:', error);
      setError('Failed to load tweets');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagementStatus = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/engagement-summary`, {
        headers: {
          'x-wallet-address': publicKey.toString(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Convert to engagement map
        const engagementMap = {};
        data.recent_engagements.forEach(eng => {
          if (!engagementMap[eng.tweet_id]) {
            engagementMap[eng.tweet_id] = {};
          }
          engagementMap[eng.tweet_id][eng.engagement_type] = true;
        });
        setEngagements(engagementMap);
      }
    } catch (error) {
      console.error('Error fetching engagement status:', error);
    }
  };

  const handleEngagement = async (tweetId, engagementType) => {
    if (!publicKey || !twitterLinked) return;

    // Check if already engaged
    if (engagements[tweetId]?.[engagementType]) {
      return;
    }

    setVerifying({ ...verifying, [`${tweetId}-${engagementType}`]: true });

    try {
      // Open 𝕏 in new tab for the action
      let twitterUrl = '';
      switch (engagementType) {
        case 'like':
          twitterUrl = `https://twitter.com/intent/like?tweet_id=${tweetId}`;
          break;
        case 'repost':
          twitterUrl = `https://twitter.com/intent/retweet?tweet_id=${tweetId}`;
          break;
        case 'comment':
          twitterUrl = `https://twitter.com/intent/tweet?in_reply_to=${tweetId}`;
          break;
      }

      window.open(twitterUrl, '_blank', 'width=600,height=400');

      // Wait a bit then verify engagement
      setTimeout(async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/validate-engagement`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': publicKey.toString(),
            },
            body: JSON.stringify({
              tweet_id: tweetId,
              engagement_type: engagementType,
            }),
          });

          const result = await response.json();
          
          if (result.valid && result.points_awarded > 0) {
            // Update local state
            setEngagements(prev => ({
              ...prev,
              [tweetId]: {
                ...prev[tweetId],
                [engagementType]: true,
              },
            }));
            
            // Show success message
            alert(`+${result.points_awarded} points earned!`);
          } else if (result.valid) {
            alert('Already engaged with this post');
          } else {
            alert('Engagement not detected. Please try again.');
          }
        } catch (error) {
          console.error('Error validating engagement:', error);
          alert('Failed to verify engagement');
        } finally {
          setVerifying(prev => {
            const newState = { ...prev };
            delete newState[`${tweetId}-${engagementType}`];
            return newState;
          });
        }
      }, 5000); // Wait 5 seconds before checking
    } catch (error) {
      console.error('Error handling engagement:', error);
      setVerifying(prev => {
        const newState = { ...prev };
        delete newState[`${tweetId}-${engagementType}`];
        return newState;
      });
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

  if (!twitterLinked) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-center">
        <FaXTwitter className="text-3xl mx-auto mb-2" />
        <p className="font-medium">Link your 𝕏 account to see engagement opportunities</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg p-4 h-32"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">@PrimapeApp Latest Posts</h3>
        <button
          onClick={fetchTweets}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {tweets.map(tweet => {
        const tweetEngagements = engagements[tweet.id] || {};
        const isVerifying = (type) => verifying[`${tweet.id}-${type}`];

        return (
          <div key={tweet.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaXTwitter className="text-gray-900 dark:text-gray-100" />
                <span className="font-medium text-gray-900 dark:text-gray-100">@PrimapeApp</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  · {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
                </span>
              </div>
              <a
                href={`https://twitter.com/PrimapeApp/status/${tweet.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
              >
                <FaExternalLinkAlt className="text-sm" />
              </a>
            </div>

            <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{tweet.text}</p>

            <div className="flex items-center space-x-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => handleEngagement(tweet.id, 'like')}
                disabled={tweetEngagements.like || isVerifying('like')}
                className={`flex items-center space-x-1 transition-colors ${
                  tweetEngagements.like
                    ? 'text-red-500 cursor-default'
                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                } ${isVerifying('like') ? 'opacity-50' : ''}`}
              >
                <FaHeart className={tweetEngagements.like ? 'fill-current' : ''} />
                <span className="text-sm">
                  {tweetEngagements.like ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    `+${getEngagementPoints('like')} pts`
                  )}
                </span>
              </button>

              <button
                onClick={() => handleEngagement(tweet.id, 'repost')}
                disabled={tweetEngagements.repost || isVerifying('repost')}
                className={`flex items-center space-x-1 transition-colors ${
                  tweetEngagements.repost
                    ? 'text-green-500 cursor-default'
                    : 'text-gray-500 dark:text-gray-400 hover:text-green-500'
                } ${isVerifying('repost') ? 'opacity-50' : ''}`}
              >
                <FaRetweet />
                <span className="text-sm">
                  {tweetEngagements.repost ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    `+${getEngagementPoints('repost')} pts`
                  )}
                </span>
              </button>

              <button
                onClick={() => handleEngagement(tweet.id, 'comment')}
                disabled={tweetEngagements.comment || isVerifying('comment')}
                className={`flex items-center space-x-1 transition-colors ${
                  tweetEngagements.comment
                    ? 'text-blue-500 cursor-default'
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'
                } ${isVerifying('comment') ? 'opacity-50' : ''}`}
              >
                <FaComment />
                <span className="text-sm">
                  {tweetEngagements.comment ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    `+${getEngagementPoints('comment')} pts`
                  )}
                </span>
              </button>
            </div>

            {Object.keys(tweetEngagements).length > 0 && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                ✓ Engaged with this post
              </div>
            )}
          </div>
        );
      })}

      {tweets.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No posts available</p>
        </div>
      )}
    </div>
  );
};

export default TwitterFeed; 