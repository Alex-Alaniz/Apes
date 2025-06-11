import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  Filter, 
  ChevronDown, 
  Search,
  Star,
  Globe,
  Target,
  Medal,
  Zap
} from 'lucide-react';

// Sports categories with their leagues and metadata
const SPORTS_DATA = {
  football: {
    name: 'Football',
    icon: Trophy,
    leagues: [
      { id: 'fifa-club-world-cup', name: 'FIFA Club World Cup', region: 'International', tier: 'elite' },
      { id: 'premier-league', name: 'Premier League', region: 'England', tier: 'top' },
      { id: 'la-liga', name: 'La Liga', region: 'Spain', tier: 'top' },
      { id: 'bundesliga', name: 'Bundesliga', region: 'Germany', tier: 'top' },
      { id: 'serie-a', name: 'Serie A', region: 'Italy', tier: 'top' },
      { id: 'ligue-1', name: 'Ligue 1', region: 'France', tier: 'top' },
      { id: 'champions-league', name: 'Champions League', region: 'Europe', tier: 'elite' },
      { id: 'europa-league', name: 'Europa League', region: 'Europe', tier: 'major' },
      { id: 'copa-libertadores', name: 'Copa Libertadores', region: 'South America', tier: 'elite' },
      { id: 'mls', name: 'MLS', region: 'North America', tier: 'major' },
      { id: 'brazil-serie-a', name: 'Brazilian Série A', region: 'Brazil', tier: 'major' },
      { id: 'primera-division-argentina', name: 'Primera División', region: 'Argentina', tier: 'major' }
    ],
    color: 'from-green-500 to-emerald-600'
  },
  basketball: {
    name: 'Basketball',
    icon: Target,
    leagues: [
      { id: 'nba', name: 'NBA', region: 'USA', tier: 'elite' },
      { id: 'euroleague', name: 'EuroLeague', region: 'Europe', tier: 'elite' },
      { id: 'fiba-world-cup', name: 'FIBA World Cup', region: 'International', tier: 'elite' }
    ],
    color: 'from-orange-500 to-red-600'
  },
  american_football: {
    name: 'American Football',
    icon: Medal,
    leagues: [
      { id: 'nfl', name: 'NFL', region: 'USA', tier: 'elite' },
      { id: 'college-football', name: 'College Football', region: 'USA', tier: 'major' }
    ],
    color: 'from-blue-500 to-purple-600'
  },
  tennis: {
    name: 'Tennis',
    icon: Star,
    leagues: [
      { id: 'grand-slam', name: 'Grand Slam', region: 'International', tier: 'elite' },
      { id: 'atp-tour', name: 'ATP Tour', region: 'International', tier: 'major' },
      { id: 'wta-tour', name: 'WTA Tour', region: 'International', tier: 'major' }
    ],
    color: 'from-yellow-500 to-orange-600'
  },
  esports: {
    name: 'Esports',
    icon: Zap,
    leagues: [
      { id: 'league-of-legends', name: 'League of Legends', region: 'International', tier: 'elite' },
      { id: 'csgo', name: 'CS:GO', region: 'International', tier: 'elite' },
      { id: 'dota2', name: 'Dota 2', region: 'International', tier: 'elite' }
    ],
    color: 'from-purple-500 to-pink-600'
  },
  other: {
    name: 'Other Sports',
    icon: Globe,
    leagues: [
      { id: 'boxing', name: 'Boxing', region: 'International', tier: 'major' },
      { id: 'mma', name: 'MMA', region: 'International', tier: 'major' },
      { id: 'formula1', name: 'Formula 1', region: 'International', tier: 'elite' }
    ],
    color: 'from-gray-500 to-slate-600'
  }
};

const TOURNAMENT_TYPES = [
  { id: 'all', name: 'All Markets', icon: Globe },
  { id: 'tournament', name: 'Tournaments', icon: Trophy },
  { id: 'league', name: 'League Matches', icon: Calendar },
  { id: 'special', name: 'Special Events', icon: Star }
];

const MARKET_STATUS_FILTERS = [
  { id: 'all', name: 'All Status', count: 0 },
  { id: 'active', name: 'Active', count: 0 },
  { id: 'resolved', name: 'Resolved', count: 0 },
  { id: 'upcoming', name: 'Upcoming', count: 0 }
];

const SportFilter = ({ 
  markets = [], 
  onFilterChange, 
  selectedFilters = {
    sport: 'all',
    league: 'all',
    tournamentType: 'all',
    status: 'all',
    search: ''
  }
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(selectedFilters);
  const [searchTerm, setSearchTerm] = useState(selectedFilters.search || '');

  // Update local filters when selectedFilters prop changes
  useEffect(() => {
    setLocalFilters(selectedFilters);
    setSearchTerm(selectedFilters.search || '');
  }, [selectedFilters]);

  // Calculate counts for each filter
  const calculateCounts = () => {
    const counts = {
      sports: {},
      leagues: {},
      statuses: { all: markets.length, active: 0, resolved: 0, upcoming: 0 },
      tournamentTypes: { all: markets.length, tournament: 0, league: 0, special: 0 }
    };

    markets.forEach(market => {
      // Status counts
      const status = market.status?.toLowerCase() || 'active';
      if (status === 'active') counts.statuses.active++;
      else if (status === 'resolved') counts.statuses.resolved++;
      else if (status === 'upcoming') counts.statuses.upcoming++;

      // Sport counts
      const sport = market.category?.toLowerCase() || 'other';
      counts.sports[sport] = (counts.sports[sport] || 0) + 1;

      // League counts (would be based on market metadata)
      const league = market.league || 'other';
      counts.leagues[league] = (counts.leagues[league] || 0) + 1;

      // Tournament type counts (would be based on market type/tags)
      const tournamentType = market.tournament_type || 'league';
      counts.tournamentTypes[tournamentType] = (counts.tournamentTypes[tournamentType] || 0) + 1;
    });

    return counts;
  };

  const counts = calculateCounts();

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...localFilters, [filterType]: value };
    
    // Reset dependent filters
    if (filterType === 'sport' && value !== localFilters.sport) {
      newFilters.league = 'all';
    }
    
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    const newFilters = { ...localFilters, search: value };
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const resetFilters = {
      sport: 'all',
      league: 'all',
      tournamentType: 'all',
      status: 'all',
      search: ''
    };
    setLocalFilters(resetFilters);
    setSearchTerm('');
    onFilterChange?.(resetFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.sport !== 'all') count++;
    if (localFilters.league !== 'all') count++;
    if (localFilters.tournamentType !== 'all') count++;
    if (localFilters.status !== 'all') count++;
    if (localFilters.search) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Market Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span className="text-sm">
                {isExpanded ? 'Less Filters' : 'More Filters'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Quick Filters - Always Visible */}
      <div className="p-4 space-y-4">
        {/* Status Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Status</h4>
          <div className="flex flex-wrap gap-2">
            {MARKET_STATUS_FILTERS.map(status => (
              <button
                key={status.id}
                onClick={() => handleFilterChange('status', status.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilters.status === status.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status.name}
                <span className="ml-1 text-xs opacity-75">
                  ({counts.statuses[status.id] || 0})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Type Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Type</h4>
          <div className="flex flex-wrap gap-2">
            {TOURNAMENT_TYPES.map(type => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleFilterChange('tournamentType', type.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    localFilters.tournamentType === type.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {type.name}
                  <span className="text-xs opacity-75">
                    ({counts.tournamentTypes[type.id] || 0})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-700">
          {/* Sport Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Sports</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button
                onClick={() => handleFilterChange('sport', 'all')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilters.sport === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                All Sports
                <span className="text-xs opacity-75">({markets.length})</span>
              </button>
              
              {Object.entries(SPORTS_DATA).map(([sportKey, sport]) => {
                const IconComponent = sport.icon;
                const count = counts.sports[sportKey] || 0;
                
                return (
                  <button
                    key={sportKey}
                    onClick={() => handleFilterChange('sport', sportKey)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      localFilters.sport === sportKey
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {sport.name}
                    <span className="text-xs opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* League Filter - Only show if sport is selected */}
          {localFilters.sport !== 'all' && SPORTS_DATA[localFilters.sport] && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                {SPORTS_DATA[localFilters.sport].name} Leagues
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={() => handleFilterChange('league', 'all')}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    localFilters.league === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span>All Leagues</span>
                  <span className="text-xs opacity-75">
                    ({counts.sports[localFilters.sport] || 0})
                  </span>
                </button>
                
                {SPORTS_DATA[localFilters.sport].leagues.map(league => {
                  const count = counts.leagues[league.id] || 0;
                  return (
                    <button
                      key={league.id}
                      onClick={() => handleFilterChange('league', league.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        localFilters.league === league.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{league.name}</span>
                        {league.tier === 'elite' && (
                          <Star className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{league.region}</span>
                        <span className="text-xs opacity-75">({count})</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SportFilter; 