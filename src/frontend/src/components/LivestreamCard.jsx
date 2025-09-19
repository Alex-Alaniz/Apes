import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircleIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';

const LivestreamCard = ({ stream }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(null);

  // Format large numbers
  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format market cap
  const formatMarketCap = (mc) => {
    if (!mc || mc === 0) return '$0';
    return `$${formatNumber(mc)}`;
  };

  // Price change color
  const priceChangeColor = stream.price_change_24h > 0 ? 'text-green-400' : 'text-red-400';
  const priceChangeIcon = stream.price_change_24h > 0 ? '↑' : '↓';

  // If there's an active market, show countdown
  useEffect(() => {
    if (stream.activeMarket?.expires_at) {
      const timer = setInterval(() => {
        const now = new Date();
        const expires = new Date(stream.activeMarket.expires_at);
        const diff = expires - now;

        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft('Expired');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [stream.activeMarket]);

  const handleClick = () => {
    navigate(`/livestream/${stream.token_address || stream.tokenAddress}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200 border border-gray-800 hover:border-purple-600"
    >
      {/* Stream Thumbnail */}
      <div className="aspect-video relative bg-gray-800">
        {stream.thumbnail ? (
          <img 
            src={stream.thumbnail} 
            alt={stream.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback with pump.fun iframe preview */}
        <div className="absolute inset-0" style={{ display: stream.thumbnail ? 'none' : 'flex' }}>
          <iframe
            src={`https://pump.fun/coin/${stream.token_address || stream.tokenAddress}?embed=1`}
            className="w-full h-full"
            style={{ pointerEvents: 'none' }}
            title={stream.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
        </div>
        
        {/* Live Badge */}
        {(stream.is_live || stream.isLive) && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            LIVE
          </div>
        )}
        
        {/* Viewer Count */}
        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
          <UsersIcon className="h-4 w-4" />
          {formatNumber(stream.viewer_count || stream.viewerCount || 0)}
        </div>

        {/* Token Symbol Badge */}
        <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-bold">
          ${stream.symbol || 'UNKNOWN'}
        </div>

        {/* Featured Badge */}
        {stream.featured_order === 0 && (
          <div className="absolute top-12 right-3 bg-yellow-500/90 backdrop-blur-sm text-black px-3 py-1 rounded-lg text-xs font-bold">
            FEATURED
          </div>
        )}
      </div>
      
      {/* Stream Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-lg mb-2 truncate">
          {stream.title}
        </h3>
        
        {/* Creator Info */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
          <span className="truncate">
            {stream.creator_wallet?.substring(0, 4)}...{stream.creator_wallet?.substring(stream.creator_wallet.length - 4)}
          </span>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center py-3 border-y border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1">Market Cap</p>
            <p className="text-sm font-bold text-white">{formatMarketCap(stream.market_cap)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">24h Volume</p>
            <p className="text-sm font-bold text-blue-400">{formatMarketCap(stream.volume_24h)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">24h Change</p>
            <p className={`text-sm font-bold ${priceChangeColor}`}>
              {priceChangeIcon} {Math.abs(stream.price_change_24h || 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Active Market Preview */}
        {stream.activeMarket && (
          <div className="mt-3 bg-gray-800 rounded-lg p-3">
            <p className="text-gray-300 text-sm mb-2 line-clamp-2">
              {stream.activeMarket.question}
            </p>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                  YES {stream.activeMarket.yesPercentage || 50}%
                </span>
                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                  NO {stream.activeMarket.noPercentage || 50}%
                </span>
              </div>
              {timeLeft && (
                <span className="text-gray-400 text-xs">
                  ⏱️ {timeLeft}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Active Markets & Volume */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">
              {stream.active_markets || 0} Active Markets
            </span>
          </div>
          <span className="text-sm font-medium text-purple-400">
            ${formatNumber(stream.total_volume || 0)} Vol
          </span>
        </div>
        
        {/* View Stream Button */}
        <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-600/20 flex items-center justify-center gap-2">
          <PlayCircleIcon className="h-5 w-5" />
          Watch & Predict
        </button>
      </div>
    </div>
  );
};

export default LivestreamCard;