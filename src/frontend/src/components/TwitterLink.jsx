import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaXTwitter } from 'react-icons/fa6';
import { FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';

// Temporary flag to disable X features for launch
const TWITTER_FEATURES_ENABLED = import.meta.env.VITE_TWITTER_ENABLED !== 'false';

const TwitterLink = ({ onLinked }) => {
  const { publicKey } = useWallet();
  const [isLinked, setIsLinked] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (publicKey && TWITTER_FEATURES_ENABLED) {
      checkTwitterStatus();
    }
  }, [publicKey]);

  const checkTwitterStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/users/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.twitter_username) {
          setIsLinked(true);
          setTwitterUsername(data.twitter_username);
        }
      }
    } catch (error) {
      console.error('Error checking 𝕏 status:', error);
    }
  };

  const initiateTwitterLink = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      // Get auth URL from backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/auth/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const { auth_url, oauth_token, debug_mode, message } = await response.json();

      if (!auth_url) {
        if (debug_mode) {
          // Handle Twitter OAuth not configured gracefully
          setError(`Twitter integration is not configured on this deployment. ${message || 'OAuth credentials missing'}`);
          return;
        } else {
          throw new Error('Invalid response from server - missing auth URL');
        }
      }

      // Store wallet address in sessionStorage for callback handling
      sessionStorage.setItem('twitter_linking_wallet', publicKey.toString());

      console.log('OAuth 1.0a auth initiated:', {
        oauth_token: !!oauth_token,
        wallet: sessionStorage.getItem('twitter_linking_wallet')
      });

      // Navigate to Twitter auth in same window (instead of popup)
      window.location.href = auth_url;

      // Note: The rest of this function won't execute since we're navigating away

    } catch (error) {
      console.error('Error initiating 𝕏 link:', error);
      setError(error.message || 'Failed to link 𝕏 account');
      setIsLinking(false);
    }
  };

  if (!TWITTER_FEATURES_ENABLED) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <FaXTwitter className="text-gray-900 dark:text-gray-100 text-xl" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">𝕏 Integration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Coming soon! Link your 𝕏 account to earn points for social engagement.</p>
          </div>
        </div>
        
        <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <p>• Earn points for likes, reposts & comments</p>
          <p>• Exclusive rewards for social engagement</p>
          <p>• Multi-wallet 𝕏 account linking</p>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
        <p className="text-sm">Connect your wallet to link 𝕏 account</p>
      </div>
    );
  }

  if (isLinked) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaXTwitter className="text-gray-900 dark:text-gray-100 text-xl" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">𝕏 Linked</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">@{twitterUsername}</p>
            </div>
          </div>
          <FaCheckCircle className="text-green-500 text-xl" />
        </div>
        {onLinked && (
          <button
            onClick={() => onLinked(twitterUsername)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View engagement stats <FaExternalLinkAlt className="text-xs" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
      <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Link 𝕏 Account</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Link your 𝕏 account to earn points for social engagement
      </p>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-2 rounded mb-3">
          {error}
        </div>
      )}

      <button
        onClick={initiateTwitterLink}
        disabled={isLinking}
        className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
          isLinking 
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
        }`}
      >
        <FaXTwitter />
        <span>{isLinking ? 'Linking...' : 'Link 𝕏 Account'}</span>
      </button>

      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
        <p><strong>Important:</strong> Complete the 𝕏 authorization quickly (within 5 minutes) to avoid timeout errors.</p>
      </div>

      <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <p>✓ One-time 100 points bonus</p>
        <p>✓ Earn points for likes, reposts & comments</p>
        <p>✓ Required for claiming APES rewards</p>
      </div>
    </div>
  );
};

export default TwitterLink; 