import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins, TrendingUp, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PointsWidget = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
      setLoading(false);
    }
  }, [publicKey]);

  const fetchBalance = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/engagement/balance/${publicKey.toString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching points balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Bronze': return 'text-orange-400';
      case 'Silver': return 'text-gray-300';
      case 'Gold': return 'text-yellow-400';
      case 'Platinum': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'Bronze': return '🥉';
      case 'Silver': return '🥈';
      case 'Gold': return '🥇';
      case 'Platinum': return '💎';
      default: return '🏅';
    }
  };

  if (!publicKey || loading) {
    return null;
  }

  const points = balance?.total_points || 0;
  const tier = balance?.tier || 'Bronze';
  const progress = balance?.next_milestone 
    ? ((points - (points < 1000 ? 0 : points < 5000 ? 1000 : points < 10000 ? 5000 : 10000)) / 
       (balance.next_milestone - (points < 1000 ? 0 : points < 5000 ? 1000 : points < 10000 ? 5000 : 10000))) * 100
    : 100;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => navigate('/engage-to-earn')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 border border-gray-600 dark:border-gray-700 hover:border-purple-500"
      >
        <Coins className="w-5 h-5 text-purple-400" />
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold">{points.toLocaleString()}</span>
            <span className="text-gray-300 dark:text-gray-400 text-sm">pts</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className={getTierColor(tier)}>{tier}</span>
            <span>{getTierIcon(tier)}</span>
          </div>
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Engagement Points
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Available:</span>
              <span className="text-gray-900 dark:text-white">{(balance?.available_points || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Claimed:</span>
              <span className="text-gray-700 dark:text-gray-300">{(balance?.claimed_points || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Multiplier:</span>
              <span className="text-purple-600 dark:text-purple-400">{balance?.multiplier || 1}x</span>
            </div>
          </div>

          {/* Progress to next tier */}
          {balance?.next_milestone && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Next tier:</span>
                <span className="text-gray-700 dark:text-gray-300">{balance.next_milestone.toLocaleString()} pts</span>
              </div>
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/engage-to-earn')}
            className="w-full mt-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default PointsWidget; 