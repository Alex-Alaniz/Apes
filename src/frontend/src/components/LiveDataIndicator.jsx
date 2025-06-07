import React from 'react';
import { Activity, Database, RefreshCw, Zap } from 'lucide-react';

/**
 * LiveDataIndicator Component
 * 
 * Shows users when they're viewing live blockchain data vs cached data
 * for maximum transparency and trust
 */
const LiveDataIndicator = ({ 
  isLiveData = false, 
  dataSource = 'unknown', 
  lastUpdated = null,
  onRefresh = null,
  showRefreshButton = true,
  size = 'sm' 
}) => {
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      
      if (diffSeconds < 60) {
        return `${diffSeconds}s ago`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else {
        return date.toLocaleTimeString();
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const getIndicatorConfig = () => {
    if (isLiveData && dataSource === 'live_blockchain') {
      return {
        icon: Zap,
        text: 'Live Data',
        description: 'Real-time data from blockchain',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400'
      };
    } else if (dataSource === 'database_fallback') {
      return {
        icon: Database,
        text: 'Cached Data',
        description: 'Data from database cache',
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        iconColor: 'text-orange-400'
      };
    } else {
      return {
        icon: Activity,
        text: 'Synced Data',
        description: 'Recently synced data',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400'
      };
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`
      inline-flex items-center gap-2 rounded-lg border backdrop-blur-sm
      ${config.bgColor} ${config.borderColor} ${sizeClasses[size]}
    `}>
      <div className="flex items-center gap-1.5">
        <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
        <span className={`font-medium ${config.textColor}`}>
          {config.text}
        </span>
      </div>
      
      {lastUpdated && (
        <span className="text-gray-400 text-xs">
          {formatLastUpdated(lastUpdated)}
        </span>
      )}
      
      {showRefreshButton && onRefresh && (
        <button
          onClick={onRefresh}
          className={`
            p-1 rounded transition-colors hover:bg-white/10
            ${config.textColor}
          `}
          title="Refresh live data"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// Tooltip variant for more detailed information
export const LiveDataTooltip = ({ 
  isLiveData, 
  dataSource, 
  lastUpdated, 
  participantCount,
  totalVolume 
}) => {
  const getIndicatorConfig = () => {
    if (isLiveData && dataSource === 'live_blockchain') {
      return {
        icon: Zap,
        text: 'Live Data',
        description: 'Real-time data from blockchain',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400'
      };
    } else if (dataSource === 'database_fallback') {
      return {
        icon: Database,
        text: 'Cached Data',
        description: 'Data from database cache',
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        iconColor: 'text-orange-400'
      };
    } else {
      return {
        icon: Activity,
        text: 'Synced Data',
        description: 'Recently synced data',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400'
      };
    }
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      
      if (diffSeconds < 60) {
        return `${diffSeconds}s ago`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else {
        return date.toLocaleTimeString();
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span className={`font-medium ${config.textColor}`}>
          {config.text}
        </span>
      </div>
      
      <div className="text-gray-300 space-y-1 text-xs">
        <div>{config.description}</div>
        {lastUpdated && (
          <div>Updated: {formatLastUpdated(lastUpdated)}</div>
        )}
        {dataSource && (
          <div>Source: {dataSource.replace('_', ' ')}</div>
        )}
        {participantCount !== undefined && (
          <div>Participants: {participantCount}</div>
        )}
        {totalVolume !== undefined && (
          <div>Volume: {totalVolume.toFixed(2)} APES</div>
        )}
      </div>
      
      {isLiveData && dataSource === 'live_blockchain' && (
        <div className="mt-2 text-xs text-green-400">
          ✓ Real-time blockchain data
        </div>
      )}
    </div>
  );
};

export default LiveDataIndicator; 