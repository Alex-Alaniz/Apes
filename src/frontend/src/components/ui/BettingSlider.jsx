import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator } from 'lucide-react';

const BettingSlider = ({ market, selectedOption, onBet, onCancel }) => {
  const [amount, setAmount] = useState(1000);
  const [potentialPayout, setPotentialPayout] = useState(0);
  
  // Calculate potential payout based on current odds
  useEffect(() => {
      if (selectedOption !== null && market.options?.[selectedOption]) {
    const option = market.options?.[selectedOption];
      const odds = 100 / option.probability;
      const payout = amount * odds * 0.95; // 5% platform fee
      setPotentialPayout(Math.floor(payout));
    }
  }, [amount, selectedOption, market]);
  
  // Preset amounts for quick selection
  const presets = [
    { label: '1K', value: 1000 },
    { label: '10K', value: 10000 },
    { label: '100K', value: 100000 },
    { label: '1M', value: 1000000 },
    { label: 'MAX', value: 1000000000 } // 1B APES max
  ];
  
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setAmount(value);
  };
  
  const formatAmount = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };
  
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Amount display */}
      <div className="bg-black/30 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Bet Amount</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              {amount.toLocaleString()}
            </span>
            <span className="text-gray-400">APES</span>
          </div>
        </div>
        
        {/* Custom slider */}
        <div className="relative">
          <input
            type="range"
            min="100"
            max="1000000000"
            step="100"
            value={amount}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                     slider-thumb:appearance-none slider-thumb:w-6 slider-thumb:h-6 
                     slider-thumb:bg-indigo-500 slider-thumb:rounded-full 
                     slider-thumb:cursor-pointer slider-thumb:shadow-lg"
            style={{
              background: `linear-gradient(to right, #6366F1 0%, #6366F1 ${
                (Math.log(amount) - Math.log(100)) / (Math.log(1000000000) - Math.log(100)) * 100
              }%, #374151 ${
                (Math.log(amount) - Math.log(100)) / (Math.log(1000000000) - Math.log(100)) * 100
              }%, #374151 100%)`
            }}
          />
        </div>
        
        {/* Preset buttons */}
        <div className="flex gap-2 mt-3">
          {presets.map((preset) => (
            <motion.button
              key={preset.label}
              className={`flex-1 py-1 px-2 rounded-lg text-sm font-medium transition-all ${
                amount === preset.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAmount(preset.value)}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Payout calculator */}
      <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Potential Payout</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-xl font-bold text-emerald-400">
              {potentialPayout.toLocaleString()} APES
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Multiplier: {(potentialPayout / amount).toFixed(2)}x | 
          Profit: +{((potentialPayout - amount) / amount * 100).toFixed(1)}%
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 
                   font-medium rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
        >
          Cancel
        </motion.button>
        <motion.button
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white 
                   font-bold rounded-lg transition-colors shadow-lg 
                   shadow-indigo-600/25"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onBet(amount)}
        >
          Place Bet
        </motion.button>
      </div>
      
      {/* Risk warning for large bets */}
      {amount > 1000000 && (
        <motion.div
          className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-xs text-yellow-400">
            ⚡ High Roller Alert: You're about to bet {formatAmount(amount)} APES 
            (~${(amount * 0.000204).toFixed(0)}). Bet responsibly!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BettingSlider; 