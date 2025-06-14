import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import marketService from '../services/marketService';
import {
  TrendingUp,
  Users,
  Clock,
  Trophy,
  Sparkles,
  Zap,
  Target,
  Flame,
  DollarSign,
  BarChart,
  Globe,
  Coins,
  Activity
} from 'lucide-react';

// Category icon mapping
const categoryIcons = {
  crypto: Coins,
  sports: Trophy,
  politics: Globe,
  entertainment: Sparkles,
  tech: Zap,
  business: DollarSign,
  culture: Users,
  news: Activity,
  default: BarChart
};

// Category colors for fallback gradients
const categoryColors = {
  crypto: 'from-orange-500 to-yellow-500',
  sports: 'from-blue-500 to-purple-500',
  politics: 'from-red-500 to-pink-500',
  entertainment: 'from-purple-500 to-pink-500',
  tech: 'from-cyan-500 to-blue-500',
  business: 'from-green-500 to-emerald-500',
  culture: 'from-indigo-500 to-purple-500',
  news: 'from-gray-500 to-slate-500',
  default: 'from-purple-600 to-blue-600'
};

const MarketCard = ({ market, onPredict, onClaim, canClaimReward, userPositions: userPositionsFromProps, variant = 'default' }) => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [userPositions, setUserPositions] = useState([]);
  const [loadingPosition, setLoadingPosition] = useState(false);
  
  // DISABLED: Individual position fetching to prevent rate limiting
  // Use positions passed from parent component instead
  useEffect(() => {
    if (!publicKey) {
      setUserPositions([]);
      return;
    }
    
    // Use positions from props if available, otherwise empty array
    const marketPositions = userPositionsFromProps?.[market.publicKey] || [];
    setUserPositions(marketPositions);
  }, [publicKey, market.publicKey, userPositionsFromProps]);
  
  const handleViewDetails = () => {
    navigate(`/markets/${market.publicKey}`);
  };

  // Calculate total user position across all options
  const totalUserPosition = userPositions.reduce((sum, pos) => sum + pos.amount, 0);
  
  // Check if market is resolved
  const isResolved = market.status === 'Resolved';
  const winningOption = isResolved && market.winningOption !== null ? market.options?.[market.winningOption] : null;

  // Get category icon and color
  const categoryKey = market.category?.toLowerCase() || 'default';
  const CategoryIcon = categoryIcons[categoryKey] || categoryIcons.default;
  const gradientColor = categoryColors[categoryKey] || categoryColors.default;
  
  const isTrending = market.isTrending || false;
  
  // Calculate total volume with better fallback handling
  // Backend now provides escrow volumes when volumeSource === 'escrow'
  let totalVolume = market.totalVolume || 0;
  
  // If total volume is 0 but we have option pools, calculate from them
  if (totalVolume === 0 && market.optionPools && market.optionPools.length > 0) {
    totalVolume = market.optionPools.reduce((sum, pool) => sum + (pool || 0), 0);
  }
  
  // If still 0 and this is an active market, show creator stake minimum
  if (totalVolume === 0 && market.status === 'Active') {
    totalVolume = 100; // Default creator stake amount
  }
  
  const formattedVolume = totalVolume >= 1000 
    ? `${(totalVolume / 1000).toFixed(1)}k` 
    : Math.round(totalVolume).toString();
  
  // Get participant count from market data - use ONLY real data, no fake calculations
  const participantCount = market.participantCount || 0;

  // Get options metadata - handle both camelCase and snake_case
  const optionsMetadata = market.optionsMetadata || market.options_metadata || [];
  
  // Fix options display - use metadata labels if available
  const getOptionLabel = (option, index) => {
    // If we have metadata with proper labels, use those
    if (optionsMetadata[index] && optionsMetadata[index].label) {
      return optionsMetadata[index].label;
    }
    // Otherwise use the blockchain option
    return option;
  };
  
  // Get option icon safely
  const getOptionIcon = (index) => {
    if (!optionsMetadata[index]) return null;
    // Handle both direct icon property and nested structure
    return optionsMetadata[index].icon || optionsMetadata[index]?.image || null;
  };
  
  // Filter out empty options and use actual option count
  const actualOptions = [];
  for (let i = 0; i < market.optionCount && i < market.options.length; i++) {
              const option = market.options?.[i];
    const label = getOptionLabel(option, i);
    // Only include non-empty options
    if (label && label.trim() !== '') {
      actualOptions.push({ option: label, index: i });
    }
  }

  // Determine which options to show
  const displayOptions = isResolved && market.winningOption !== null && market.winningOption !== undefined
            ? [{ option: getOptionLabel(market.options?.[market.winningOption], market.winningOption), index: market.winningOption }]
    : actualOptions;

  const maxOptionsToShow = isResolved ? 1 : 3;
  const visibleOptions = displayOptions.slice(0, maxOptionsToShow);
  const hiddenOptionsCount = displayOptions.length - maxOptionsToShow;

  // Get end time - support both resolutionDate and endTime
  const endTime = market.endTime || market.resolutionDate;

  const getOptionPercentage = (index) => {
    // First check if we have pre-calculated percentages
    if (market.optionPercentages && market.optionPercentages[index] !== undefined) {
      return market.optionPercentages[index];
    }
    
    // If no pre-calculated percentages, calculate from option pools
    if (market.optionPools && market.optionPools.length > 0) {
      const totalVolume = market.optionPools.reduce((sum, pool) => sum + (pool || 0), 0);
      
      if (totalVolume > 0) {
        const optionVolume = market.optionPools[index] || 0;
        return (optionVolume / totalVolume) * 100;
      }
    }
    
    // Fallback to equal distribution only if we have no volume data at all
    if (market.options && market.options.length > 0) {
      return 100 / market.options.length;
    }
    
    return 0;
  };

  // Check if this is a binary market (Yes/No)
  const isBinaryMarket = market.options.length === 2 && 
    market.options.some(opt => opt.toLowerCase() === 'yes') &&
    market.options.some(opt => opt.toLowerCase() === 'no');

  return (
    <div
      onClick={handleViewDetails}
      className={`
        bg-gray-800 rounded-xl overflow-hidden cursor-pointer 
        transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
        border border-gray-700 hover:border-purple-500
        flex flex-col h-full
        ${variant === 'compact' ? 'h-auto' : ''}
      `}
    >
      {/* Banner Section - Updated styling */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        {market.assets?.banner ? (
          // Show banner image if available with better styling
          <>
            <img 
              src={market.assets.banner} 
              alt={market.question}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                // Hide broken image and show gradient fallback
                e.target.style.display = 'none';
              }}
            />
            {/* Always show gradient overlay for consistency */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          </>
        ) : (
          // Fallback gradient banner
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} flex items-center justify-center`}>
            <CategoryIcon className="w-16 h-16 text-white/20" />
          </div>
        )}
        
        {/* Category badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            {market.assets?.icon ? (
              <img 
                src={market.assets.icon} 
                alt={market.category}
                className="w-4 h-4 rounded"
                onError={(e) => {
                  // Fallback to icon component if image fails
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            <CategoryIcon 
              className={`w-4 h-4 text-purple-400 ${market.assets?.icon ? 'hidden' : ''}`}
              style={{ display: market.assets?.icon ? 'none' : 'block' }}
            />
            <span className="text-xs font-medium text-gray-300 capitalize">
              {market.category || 'General'}
            </span>
          </div>
          
          {isTrending && (
            <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">Hot</span>
            </div>
          )}
        </div>
        
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`
            inline-block px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm
            ${isResolved 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
              : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }
          `}>
            {market.status}
          </span>
        </div>
      </div>

      {/* Content - Flex grow to fill remaining space */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Question */}
        <h3 className="font-semibold text-white text-lg mb-4 line-clamp-2 flex-shrink-0">
          {market.question}
        </h3>

        {/* User Positions Display - Fixed height container for consistency */}
        <div className="mb-4 min-h-0 flex-shrink-0">
          {userPositions.length > 0 && (
            <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              {isResolved ? (
                // Compact view for resolved markets
                <div className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Your Investment:</span>
                    <span className="font-semibold text-white">
                      {totalUserPosition.toFixed(2)} APES
                    </span>
                  </div>
                  {userPositions.some(p => p.optionIndex === market.winningOption) && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-green-400">Won!</span>
                      {userPositions.find(p => p.optionIndex === market.winningOption).claimed ? (
                        <span className="font-semibold text-green-400">✓ Claimed</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onClaim) {
                              onClaim(market, market.winningOption);
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
                        >
                          Claim Rewards
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Compact view for active markets too
                <div className="text-sm">
                  <div className="text-purple-300 mb-2">
                    Your Position{userPositions.length > 1 ? 's' : ''}:
                  </div>
                  {/* Show only top 2 positions to maintain card height */}
                  {userPositions.slice(0, 2).map((position, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-300 truncate mr-2">
                        {market.options?.[position.optionIndex]}:
                      </span>
                      <span className="font-semibold text-white flex-shrink-0">
                        {position.amount.toFixed(2)} APES
                      </span>
                    </div>
                  ))}
                  {userPositions.length > 2 && (
                    <div className="text-xs text-gray-400 mb-1">
                      +{userPositions.length - 2} more
                    </div>
                  )}
                  <div className="border-t border-purple-500/20 mt-2 pt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-300">Total:</span>
                      <span className="font-semibold text-white">
                        {totalUserPosition.toFixed(2)} APES
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Options with percentages - Flex grow to use available space */}
        <div className="space-y-2 mb-4 flex-grow">
          {visibleOptions.map(({ option, index }) => {
            const percentage = getOptionPercentage(index);
            const isWinner = isResolved && market.winningOption === index;
            
            return (
              <div 
                key={index} 
                className={`
                  relative rounded-lg overflow-hidden
                  ${isWinner ? 'ring-2 ring-green-500' : ''}
                `}
              >
                <div className="relative bg-gray-700/50 p-3">
                  <div 
                    className={`
                      absolute inset-0 transition-all duration-500
                      ${isWinner 
                        ? 'bg-gradient-to-r from-green-600/30 to-green-500/20' 
                        : 'bg-gradient-to-r from-purple-600/20 to-blue-600/20'
                      }
                    `}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Show icon for multi-option markets, hide for binary */}
                      {!isBinaryMarket && getOptionIcon(index) && (
                        <img 
                          src={getOptionIcon(index)} 
                          alt={option}
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <span className={`text-sm truncate ${isWinner ? 'text-green-300 font-medium' : 'text-gray-300'}`}>
                        {isWinner && '✓ '}{option}
                      </span>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ml-2 ${isWinner ? 'text-green-300' : 'text-white'}`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {hiddenOptionsCount > 0 && (
            <div className="text-xs text-gray-400 text-center py-1">
              +{hiddenOptionsCount} more option{hiddenOptionsCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Stats row - Fixed position at bottom */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>{formattedVolume} APES</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{participantCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isResolved 
                ? 'Ended' 
                : endTime ? (() => {
                  const date = new Date(endTime);
                  // For tournament markets, display in ET timezone
                  if (market.tournament_id) {
                    // According to a memory from a past conversation...
                    // Tournament markets store resolution dates in UTC. When displaying these dates:
                    // 1. For tournament markets with tournament_id, convert UTC back to ET (Eastern Time) 
                    // 2. In June 2025, use EDT (UTC-4) for the conversion
                    
                    // Check if this is a West Coast match that crosses date boundary
                    // These matches show different dates in PT vs EDT
                    const utcHour = date.getUTCHours();
                    const etDate = new Date(date.getTime() - (4 * 60 * 60 * 1000));
                    const ptDate = new Date(date.getTime() - (7 * 60 * 60 * 1000));
                    
                    // If UTC hour is between 0-7, it's likely a late PT match crossing to next day EDT
                    if (utcHour >= 0 && utcHour <= 7) {
                      const ptDateStr = format(ptDate, 'MMM d');
                      const ptTimeStr = format(ptDate, 'h:mm a');
                      const etTimeStr = format(etDate, 'h:mm a');
                      
                      // Check if dates are different
                      if (ptDate.getDate() !== etDate.getDate()) {
                        return `${ptDateStr}, ${ptTimeStr} PT / ${etTimeStr} EDT`;
                      }
                    }
                    
                    return format(etDate, 'MMM d, h:mm a') + ' EDT';
                  }
                  return `Ends ${format(date, 'MMM d')}`;
                })() : 'Ongoing'
              }
            </span>
          </div>
        </div>

        {/* Action button - Fixed at bottom */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (isResolved) {
              // For resolved markets, navigate to details
              handleViewDetails();
            } else {
              // For active markets, open prediction modal
              onPredict(market);
            }
          }}
          className={`
            w-full py-2.5 rounded-lg font-medium text-sm transition-all flex-shrink-0
            ${isResolved
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg'
            }
          `}
        >
          {isResolved ? 'View Results' : 'Place Prediction'}
        </button>
      </div>
    </div>
  );
};

export default MarketCard;
