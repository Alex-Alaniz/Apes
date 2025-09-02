import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ReferralPage = () => {
  const { referralCode: referralWallet } = useParams(); // referralCode is actually the wallet address
  const navigate = useNavigate();

  useEffect(() => {
    if (referralWallet) {
      // Store referral wallet in localStorage
      localStorage.setItem('primape_referral_code', referralWallet);
      
      // Show success message
      toast.success(`Referral from wallet ${referralWallet.slice(0, 6)}...${referralWallet.slice(-6)} applied! Connect your wallet to activate.`, {
        duration: 5000,
        style: {
          background: '#10B981',
          color: '#FFFFFF',
        },
      });
      
      // Log referral tracking
      console.log('🎯 Referral wallet stored:', referralWallet);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [referralWallet, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Processing Referral...</h2>
          <p className="text-gray-400">
            Referral from <span className="text-purple-400 font-mono">{referralWallet?.slice(0, 6)}...{referralWallet?.slice(-6)}</span> is being applied.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Redirecting to homepage...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;