import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaXTwitter } from 'react-icons/fa6';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';

const TwitterCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('OAuth 2.0 callback received:', { code: !!code, state: !!state, error });
    console.log('Session storage:', {
      wallet: sessionStorage.getItem('twitter_linking_wallet')
    });

    if (error) {
      // User denied authorization or error occurred
      setTimeout(() => {
        setStatus('error');
        setError('𝕏 authorization was cancelled or failed');
      }, 500);
      return;
    }

    if (!code || !state) {
      setTimeout(() => {
        setStatus('error');
        setError('OAuth verification failed. Please try again.');
      }, 500);
      return;
    }

    try {
      const walletAddress = sessionStorage.getItem('twitter_linking_wallet');

      if (!walletAddress) {
        console.error('Missing wallet address in session storage');
        throw new Error('Wallet information missing. Please try linking again.');
      }

      // Exchange authorization code for access token
              const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/twitter/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': sessionStorage.getItem('twitter_linking_wallet'),
        },
        body: JSON.stringify({
          code: code,
          state: state,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link 𝕏 account');
      }

      const data = await response.json();
      console.log('Twitter link response:', data);

      // Clear session storage
      sessionStorage.removeItem('twitter_linking_wallet');

      // Set success status with a small delay to ensure smooth transition
      setTimeout(() => {
        setStatus('success');
      }, 300);
      
      // Redirect to profile page after success
      setTimeout(() => {
        navigate('/profile');
      }, 2500);

    } catch (error) {
      console.error('Error in 𝕏 callback:', error);
      
      // Add delay before showing error to prevent flash
      setTimeout(() => {
        setStatus('error');
        
        // More specific error messages
        if (error.message.includes('duplicate key')) {
          setError('This 𝕏 account is already linked to another wallet');
        } else if (error.message.includes('invalid_request')) {
          setError('Authorization expired. Please try linking again');
        } else {
          setError(error.message);
        }
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <FaSpinner className="animate-spin text-4xl text-gray-900 dark:text-gray-100 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Linking your 𝕏 account...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we complete the process
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                𝕏 Account Linked Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You can now earn points for your 𝕏 engagement
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to Profile page...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <FaXTwitter className="text-4xl text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Failed to Link 𝕏 Account
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">
                {error}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  Back to Profile
                </button>
                {(error?.includes('expired') || error?.includes('Authorization')) && (
                  <button
                    onClick={() => {
                      // Clear any stale session data and retry
                      sessionStorage.removeItem('twitter_linking_wallet');
                      navigate('/profile');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Try Linking Again
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwitterCallback; 