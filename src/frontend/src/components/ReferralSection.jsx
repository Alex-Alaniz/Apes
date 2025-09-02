import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { FiCopy, FiShare2, FiGift } from 'react-icons/fi';
import ReferralService from '../services/referralService';

const ReferralSection = () => {
  const { publicKey } = useWallet();
  const wallet = useWallet();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (publicKey) {
      loadReferralStats();
    }
  }, [publicKey]);

  const loadReferralStats = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://apes-production.up.railway.app';
      const referralStats = await ReferralService.getReferralStats(publicKey.toString(), backendUrl, wallet);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareReferral = async () => {
    if (!publicKey) return;
    
    try {
      setCopying(true);
      const success = await ReferralService.shareReferralLink(
        publicKey.toString(),
        stats?.username
      );
      
      if (success) {
        toast.success('Referral link copied to clipboard!', {
          duration: 3000,
          style: {
            background: '#10B981',
            color: '#FFFFFF',
          },
        });
      } else {
        toast.error('Failed to share referral link');
      }
    } catch (error) {
      toast.error('Failed to share referral link');
    } finally {
      setCopying(false);
    }
  };

  const handleCopyCode = async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      toast.success(`Wallet address copied!`, {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFFFFF',
        },
      });
    } catch (error) {
      toast.error('Failed to copy referral code');
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 rounded-full p-3">
            <FiGift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Referral Program</h3>
            <p className="text-sm text-gray-400">Earn 20% of fees from your referrals</p>
          </div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Your Referral Wallet</p>
            <p className="text-lg font-bold text-purple-400 tracking-wider">
              {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-6)}` : ''}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
            title="Copy code"
          >
            <FiCopy className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-white">{stats.totalReferrals || 0}</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Active Users</p>
          <p className="text-2xl font-bold text-white">{stats.activeReferrals || 0}</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Volume Generated</p>
          <p className="text-xl font-bold text-white">
            {formatAmount(stats.totalVolumeGenerated || 0)} APES
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Pending Rewards</p>
          <p className="text-xl font-bold text-green-400">
            {formatAmount(stats.pendingRewards || 0)} APES
          </p>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShareReferral}
        disabled={copying}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {copying ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <FiShare2 className="w-5 h-5" />
            <span>Share Referral Link</span>
          </>
        )}
      </button>

      {/* Info Text */}
      <p className="text-xs text-gray-500 text-center mt-4">
        Earn 20% of all trading fees generated by users you refer. Rewards are calculated in real-time and can be claimed anytime.
      </p>
    </div>
  );
};

export default ReferralSection;