import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, TrendingUp, Share2, Heart } from 'lucide-react';
import BettingSlider from './BettingSlider';
import ProbabilityBar from './ProbabilityBar';

const AnimatedMarketCard = ({ market, onBet, onShare, onLike }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showBetting, setShowBetting] = useState(false);
  
  // Calculate market heat (0-1) based on volume
  const marketHeat = Math.min(market.totalVolume / 1000000, 1); // Heat maxes at 1M APES
  
  // Dynamic gradient based on market heat
  const gradientColors = {
    cold: ['#6366F1', '#8B5CF6'], // Purple/Indigo
    warm: ['#F59E0B', '#EF4444'], // Orange/Red
    hot: ['#EF4444', '#DC2626']   // Red/Dark Red
  };
  
  const getGradient = () => {
    if (marketHeat < 0.33) return gradientColors.cold;
    if (marketHeat < 0.66) return gradientColors.warm;
    return gradientColors.hot;
  };
  
  const [startColor, endColor] = getGradient();
  
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-2xl p-[2px]"
        style={{
          background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
        }}
        animate={{
          background: isHovered 
            ? `linear-gradient(225deg, ${startColor}, ${endColor})`
            : `linear-gradient(135deg, ${startColor}, ${endColor})`,
        }}
      >
        {/* Glass card content */}
        <div className="relative h-full rounded-2xl bg-gray-900/90 backdrop-blur-xl p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                {market.question}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{market.timeRemaining}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{market.participantCount || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{(market.totalVolume || 0).toLocaleString()} APES</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Options with animated probability bars */}
          <div className="space-y-3 mb-6">
            {market.options.map((option, index) => (
              <motion.div
                key={index}
                className={`relative cursor-pointer rounded-lg p-3 transition-all ${
                  selectedOption === index 
                    ? 'bg-white/10 ring-2 ring-indigo-500' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => {
                  setSelectedOption(index);
                  setShowBetting(true);
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{option.name}</span>
                  <span className="text-lg font-bold text-white">
                    {option.probability.toFixed(1)}%
                  </span>
                </div>
                <ProbabilityBar 
                  probability={option.probability}
                  color={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#F59E0B'}
                  animated={isHovered}
                />
                {option.userPosition > 0 && (
                  <div className="mt-2 text-sm text-indigo-400">
                    Your position: {option.userPosition.toLocaleString()} APES
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          
          {/* Quick bet buttons */}
          {!showBetting ? (
            <div className="flex gap-2 mb-4">
              {[100, 1000, 10000, 100000].map((amount) => (
                <motion.button
                  key={amount}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 
                           text-white font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (selectedOption !== null) {
                      onBet(market.id, selectedOption, amount);
                    }
                  }}
                >
                  {amount >= 1000 ? `${amount/1000}K` : amount}
                </motion.button>
              ))}
            </div>
          ) : (
            <BettingSlider
              market={market}
              selectedOption={selectedOption}
              onBet={(amount) => {
                onBet(market.id, selectedOption, amount);
                setShowBetting(false);
              }}
              onCancel={() => setShowBetting(false)}
            />
          )}
          
          {/* Social actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <motion.button
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onLike(market.id)}
              >
                <Heart className={`w-5 h-5 ${market.liked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{market.likes}</span>
              </motion.button>
              <motion.button
                className="flex items-center gap-2 text-gray-400 hover:text-indigo-500 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onShare(market.id)}
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </motion.button>
            </div>
            
            {/* Market heat indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Market Heat</span>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: i < Math.ceil(marketHeat * 5) ? endColor : '#374151'
                    }}
                    animate={{
                      scale: i < Math.ceil(marketHeat * 5) ? [1, 1.2, 1] : 1
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnimatedMarketCard; 