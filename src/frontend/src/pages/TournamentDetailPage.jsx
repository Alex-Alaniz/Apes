import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { isWalletAuthorized } from '../config/access';
import {
  Trophy,
  Calendar,
  Users,
  Clock,
  MapPin,
  Star,
  Medal,
  TrendingUp,
  Plus,
  Play,
  ChevronRight,
  ArrowLeft,
  Crown,
  Target,
  Zap,
  Flag,
  Globe,
  ChevronDown,
  ChevronUp,
  Eye,
  Gift
} from 'lucide-react';

// NBA Finals Series Data
const NBA_FINALS_SERIES = {
  id: 'nba-finals-2025',
  name: 'NBA Finals 2025',
  description: 'The ultimate basketball championship series',
  team1: 'Oklahoma City Thunder',
  team2: 'Indiana Pacers',
  seriesFormat: 'Best of 7',
  games: [
    { id: 1, status: 'completed', winner: 'Oklahoma City Thunder', score: '118-105', date: '2025-06-05', venue: 'Paycom Center' },
    { id: 2, status: 'completed', winner: 'Indiana Pacers', score: '112-108', date: '2025-06-08', venue: 'Paycom Center' },
    { id: 3, status: 'live', score: '0-0', date: '2025-06-11', venue: 'Gainbridge Fieldhouse' },
    { id: 4, status: 'upcoming', date: '2025-06-13', venue: 'Gainbridge Fieldhouse' },
    { id: 5, status: 'upcoming', date: '2025-06-16', venue: 'Paycom Center' },
    { id: 6, status: 'upcoming', date: '2025-06-18', venue: 'Gainbridge Fieldhouse' },
    { id: 7, status: 'upcoming', date: '2025-06-20', venue: 'Paycom Center' }
  ],
  standings: {
    'Oklahoma City Thunder': 1,
    'Indiana Pacers': 1
  }
};

// Club World Cup Groups and Teams
const CLUB_WC_GROUPS = {
  'A': { teams: ['Al Ahly', 'Inter Miami', 'Palmeiras', 'Porto'], results: [] },
  'B': { teams: ['Paris Saint-Germain', 'Atletico Madrid', 'Botafogo', 'Seattle Sounders'], results: [] },
  'C': { teams: ['Bayern Munich', 'Auckland City', 'Boca Juniors', 'Benfica'], results: [] },
  'D': { teams: ['Chelsea', 'LAFC', 'Flamengo', 'Espérance'], results: [] },
  'E': { teams: ['River Plate', 'Urawa Red Diamonds', 'Monterrey', 'Internazionale'], results: [] },
  'F': { teams: ['Fluminense', 'Borussia Dortmund', 'Ulsan HD', 'Mamelodi Sundowns'], results: [] },
  'G': { teams: ['Manchester City', 'Wydad AC', 'Al Ain', 'Juventus'], results: [] },
  'H': { teams: ['Real Madrid', 'Al Hilal', 'Pachuca', 'Salzburg'], results: [] }
};

// Complete FIFA Club World Cup 2025 Match Data (63 matches)
const CLUB_WC_ALL_MATCHES = [
  // GROUP STAGE MATCHES (48 matches - Groups A-H, 6 matches per group)
  // Group A
  { match: 1, group: 'A', round: 'Group Stage', home: 'Al Ahly', away: 'Inter Miami', venue: 'Hard Rock, Miami', date: '2025-06-14', time: '20:00', timezone: 'ET' },
  { match: 2, group: 'A', round: 'Group Stage', home: 'Palmeiras', away: 'Porto', venue: 'MetLife, NJ', date: '2025-06-15', time: '18:00', timezone: 'ET' },
  { match: 3, group: 'A', round: 'Group Stage', home: 'Palmeiras', away: 'Al Ahly', venue: 'MetLife, NJ', date: '2025-06-19', time: '12:00', timezone: 'ET' },
  { match: 4, group: 'A', round: 'Group Stage', home: 'Inter Miami', away: 'Porto', venue: 'Mercedes-Benz, Atl', date: '2025-06-19', time: '15:00', timezone: 'ET' },
  { match: 5, group: 'A', round: 'Group Stage', home: 'Porto', away: 'Al Ahly', venue: 'MetLife, NJ', date: '2025-06-23', time: '21:00', timezone: 'ET' },
  { match: 6, group: 'A', round: 'Group Stage', home: 'Inter Miami', away: 'Palmeiras', venue: 'Hard Rock, Miami', date: '2025-06-23', time: '21:00', timezone: 'ET' },

  // Group B
  { match: 7, group: 'B', round: 'Group Stage', home: 'Paris Saint-Germain', away: 'Atletico Madrid', venue: 'Rose Bowl, LA', date: '2025-06-15', time: '15:00', timezone: 'PT' },
  { match: 8, group: 'B', round: 'Group Stage', home: 'Botafogo', away: 'Seattle Sounders', venue: 'Lumen, Seattle', date: '2025-06-15', time: '22:00', timezone: 'PT' },
  { match: 9, group: 'B', round: 'Group Stage', home: 'Seattle Sounders', away: 'Atletico Madrid', venue: 'Lumen, Seattle', date: '2025-06-19', time: '18:00', timezone: 'ET' },
  { match: 10, group: 'B', round: 'Group Stage', home: 'Paris Saint-Germain', away: 'Botafogo', venue: 'Rose Bowl, LA', date: '2025-06-19', time: '21:00', timezone: 'ET' },
  { match: 11, group: 'B', round: 'Group Stage', home: 'Atletico Madrid', away: 'Botafogo', venue: 'Mercedes-Benz, Atl', date: '2025-06-23', time: '15:00', timezone: 'ET' },
  { match: 12, group: 'B', round: 'Group Stage', home: 'Seattle Sounders', away: 'Paris Saint-Germain', venue: 'Lumen, Seattle', date: '2025-06-23', time: '15:00', timezone: 'ET' },

  // Group C
  { match: 13, group: 'C', round: 'Group Stage', home: 'Bayern Munich', away: 'Auckland City', venue: 'TQL, Cincinnati', date: '2025-06-15', time: '12:00', timezone: 'ET' },
  { match: 14, group: 'C', round: 'Group Stage', home: 'Boca Juniors', away: 'Benfica', venue: 'Hard Rock, Miami', date: '2025-06-16', time: '18:00', timezone: 'ET' },
  { match: 15, group: 'C', round: 'Group Stage', home: 'Benfica', away: 'Auckland City', venue: 'Inter&Co, Orl', date: '2025-06-20', time: '12:00', timezone: 'ET' },
  { match: 16, group: 'C', round: 'Group Stage', home: 'Bayern Munich', away: 'Boca Juniors', venue: 'Hard Rock, Miami', date: '2025-06-20', time: '21:00', timezone: 'ET' },
  { match: 17, group: 'C', round: 'Group Stage', home: 'Auckland City', away: 'Boca Juniors', venue: 'Geodis Park, Nashville', date: '2025-06-24', time: '15:00', timezone: 'ET' },
  { match: 18, group: 'C', round: 'Group Stage', home: 'Benfica', away: 'Bayern Munich', venue: 'Bank of America, Cha', date: '2025-06-24', time: '15:00', timezone: 'ET' },

  // Group D
  { match: 19, group: 'D', round: 'Group Stage', home: 'Chelsea', away: 'LAFC', venue: 'Mercedes-Benz, Atl', date: '2025-06-16', time: '15:00', timezone: 'ET' },
  { match: 20, group: 'D', round: 'Group Stage', home: 'Flamengo', away: 'Espérance', venue: 'Lincoln Financial, Phi', date: '2025-06-16', time: '21:00', timezone: 'ET' },
  { match: 21, group: 'D', round: 'Group Stage', home: 'Flamengo', away: 'Chelsea', venue: 'Lincoln Financial, Phi', date: '2025-06-20', time: '14:00', timezone: 'ET' },
  { match: 22, group: 'D', round: 'Group Stage', home: 'LAFC', away: 'Espérance', venue: 'Geodis Park, Nashville', date: '2025-06-20', time: '18:00', timezone: 'ET' },
  { match: 23, group: 'D', round: 'Group Stage', home: 'Espérance', away: 'Chelsea', venue: 'Lincoln Financial, Phi', date: '2025-06-24', time: '21:00', timezone: 'ET' },
  { match: 24, group: 'D', round: 'Group Stage', home: 'LAFC', away: 'Flamengo', venue: 'Camping World, Orl', date: '2025-06-24', time: '21:00', timezone: 'ET' },

  // Group E
  { match: 25, group: 'E', round: 'Group Stage', home: 'River Plate', away: 'Urawa Red Diamonds', venue: 'Lumen, Seattle', date: '2025-06-17', time: '15:00', timezone: 'PT' },
  { match: 26, group: 'E', round: 'Group Stage', home: 'Monterrey', away: 'Internazionale', venue: 'Rose Bowl, LA', date: '2025-06-17', time: '21:00', timezone: 'PT' },
  { match: 27, group: 'E', round: 'Group Stage', home: 'Internazionale', away: 'Urawa Red Diamonds', venue: 'Lumen, Seattle', date: '2025-06-21', time: '15:00', timezone: 'ET' },
  { match: 28, group: 'E', round: 'Group Stage', home: 'River Plate', away: 'Monterrey', venue: 'Rose Bowl, LA', date: '2025-06-21', time: '21:00', timezone: 'ET' },
  { match: 29, group: 'E', round: 'Group Stage', home: 'Internazionale', away: 'River Plate', venue: 'Lumen, Seattle', date: '2025-06-25', time: '21:00', timezone: 'ET' },
  { match: 30, group: 'E', round: 'Group Stage', home: 'Urawa Red Diamonds', away: 'Monterrey', venue: 'Rose Bowl, LA', date: '2025-06-25', time: '21:00', timezone: 'ET' },

  // Group F
  { match: 31, group: 'F', round: 'Group Stage', home: 'Fluminense', away: 'Borussia Dortmund', venue: 'MetLife, NJ', date: '2025-06-17', time: '12:00', timezone: 'ET' },
  { match: 32, group: 'F', round: 'Group Stage', home: 'Ulsan HD', away: 'Mamelodi Sundowns', venue: 'Inter&Co, Orl', date: '2025-06-17', time: '18:00', timezone: 'ET' },
  { match: 33, group: 'F', round: 'Group Stage', home: 'Mamelodi Sundowns', away: 'Borussia Dortmund', venue: 'TQL, Cincinnati', date: '2025-06-21', time: '12:00', timezone: 'ET' },
  { match: 34, group: 'F', round: 'Group Stage', home: 'Fluminense', away: 'Ulsan HD', venue: 'MetLife, NJ', date: '2025-06-21', time: '18:00', timezone: 'ET' },
  { match: 35, group: 'F', round: 'Group Stage', home: 'Borussia Dortmund', away: 'Ulsan HD', venue: 'TQL, Cincinnati', date: '2025-06-25', time: '15:00', timezone: 'ET' },
  { match: 36, group: 'F', round: 'Group Stage', home: 'Mamelodi Sundowns', away: 'Fluminense', venue: 'Hard Rock, Miami', date: '2025-06-25', time: '15:00', timezone: 'ET' },

  // Group G
  { match: 37, group: 'G', round: 'Group Stage', home: 'Manchester City', away: 'Wydad AC', venue: 'Lincoln Financial, Phi', date: '2025-06-18', time: '12:00', timezone: 'ET' },
  { match: 38, group: 'G', round: 'Group Stage', home: 'Al Ain', away: 'Juventus', venue: 'Audi, Washington', date: '2025-06-18', time: '21:00', timezone: 'ET' },
  { match: 39, group: 'G', round: 'Group Stage', home: 'Juventus', away: 'Wydad AC', venue: 'Lincoln Financial, Phi', date: '2025-06-22', time: '12:00', timezone: 'ET' },
  { match: 40, group: 'G', round: 'Group Stage', home: 'Manchester City', away: 'Al Ain', venue: 'Mercedes-Benz, Atl', date: '2025-06-22', time: '21:00', timezone: 'ET' },
  { match: 41, group: 'G', round: 'Group Stage', home: 'Juventus', away: 'Manchester City', venue: 'Camping World, Orl', date: '2025-06-26', time: '15:00', timezone: 'ET' },
  { match: 42, group: 'G', round: 'Group Stage', home: 'Wydad AC', away: 'Al Ain', venue: 'Audi, Washington', date: '2025-06-26', time: '15:00', timezone: 'ET' },

  // Group H
  { match: 43, group: 'H', round: 'Group Stage', home: 'Real Madrid', away: 'Al Hilal', venue: 'Hard Rock, Miami', date: '2025-06-18', time: '15:00', timezone: 'ET' },
  { match: 44, group: 'H', round: 'Group Stage', home: 'Pachuca', away: 'Salzburg', venue: 'TQL, Cincinnati', date: '2025-06-18', time: '18:00', timezone: 'ET' },
  { match: 45, group: 'H', round: 'Group Stage', home: 'Real Madrid', away: 'Pachuca', venue: 'Bank of America, Cha', date: '2025-06-22', time: '15:00', timezone: 'ET' },
  { match: 46, group: 'H', round: 'Group Stage', home: 'Salzburg', away: 'Al Hilal', venue: 'Audi, Washington', date: '2025-06-22', time: '18:00', timezone: 'ET' },
  { match: 47, group: 'H', round: 'Group Stage', home: 'Al Hilal', away: 'Pachuca', venue: 'Geodis Park, Nashville', date: '2025-06-26', time: '21:00', timezone: 'ET' },
  { match: 48, group: 'H', round: 'Group Stage', home: 'Salzburg', away: 'Real Madrid', venue: 'Lincoln Financial, Phi', date: '2025-06-26', time: '21:00', timezone: 'ET' },

  // ROUND OF 16 (8 matches)
  { match: 49, group: 'R16', round: 'Round of 16', home: 'Group A Winner', away: 'Group B Runner-up', venue: 'Hard Rock, Miami', date: '2025-06-29', time: '15:00', timezone: 'ET' },
  { match: 50, group: 'R16', round: 'Round of 16', home: 'Group C Winner', away: 'Group D Runner-up', venue: 'Rose Bowl, LA', date: '2025-06-29', time: '18:00', timezone: 'PT' },
  { match: 51, group: 'R16', round: 'Round of 16', home: 'Group B Winner', away: 'Group A Runner-up', venue: 'MetLife, NJ', date: '2025-06-30', time: '15:00', timezone: 'ET' },
  { match: 52, group: 'R16', round: 'Round of 16', home: 'Group D Winner', away: 'Group C Runner-up', venue: 'Mercedes-Benz, Atl', date: '2025-06-30', time: '18:00', timezone: 'ET' },
  { match: 53, group: 'R16', round: 'Round of 16', home: 'Group E Winner', away: 'Group F Runner-up', venue: 'Lumen, Seattle', date: '2025-07-01', time: '15:00', timezone: 'PT' },
  { match: 54, group: 'R16', round: 'Round of 16', home: 'Group G Winner', away: 'Group H Runner-up', venue: 'TQL, Cincinnati', date: '2025-07-01', time: '18:00', timezone: 'ET' },
  { match: 55, group: 'R16', round: 'Round of 16', home: 'Group F Winner', away: 'Group E Runner-up', venue: 'Lincoln Financial, Phi', date: '2025-07-02', time: '15:00', timezone: 'ET' },
  { match: 56, group: 'R16', round: 'Round of 16', home: 'Group H Winner', away: 'Group G Runner-up', venue: 'Inter&Co, Orl', date: '2025-07-02', time: '18:00', timezone: 'ET' },

  // QUARTERFINALS (4 matches)
  { match: 57, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 1', away: 'R16 Winner 2', venue: 'MetLife, NJ', date: '2025-07-05', time: '15:00', timezone: 'ET' },
  { match: 58, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 3', away: 'R16 Winner 4', venue: 'Rose Bowl, LA', date: '2025-07-05', time: '18:00', timezone: 'PT' },
  { match: 59, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 5', away: 'R16 Winner 6', venue: 'Hard Rock, Miami', date: '2025-07-06', time: '15:00', timezone: 'ET' },
  { match: 60, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 7', away: 'R16 Winner 8', venue: 'Mercedes-Benz, Atl', date: '2025-07-06', time: '18:00', timezone: 'ET' },

  // SEMIFINALS (2 matches)
  { match: 61, group: 'SF', round: 'Semifinal', home: 'QF Winner 1', away: 'QF Winner 2', venue: 'MetLife, NJ', date: '2025-07-09', time: '15:00', timezone: 'ET' },
  { match: 62, group: 'SF', round: 'Semifinal', home: 'QF Winner 3', away: 'QF Winner 4', venue: 'Rose Bowl, LA', date: '2025-07-10', time: '18:00', timezone: 'PT' },

  // FINAL (1 match)
  { match: 63, group: 'F', round: 'Final', home: 'SF Winner 1', away: 'SF Winner 2', venue: 'MetLife, NJ', date: '2025-07-13', time: '15:00', timezone: 'ET' }
];

// Get upcoming matches (next 10 matches chronologically)
const getUpcomingMatches = () => {
  const today = new Date();
  return CLUB_WC_ALL_MATCHES
    .filter(match => new Date(match.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
};

// Countdown Timer Component
const CountdownTimer = ({ targetDate, label }) => {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ expired: true });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 font-bold">
        🔴 {label} has begun!
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</div>
      <div className="flex justify-center gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 min-w-[60px]">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{timeLeft.days || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Days</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 min-w-[60px]">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{timeLeft.hours || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Hours</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 min-w-[60px]">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{timeLeft.minutes || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Mins</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 min-w-[60px]">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{timeLeft.seconds || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Secs</div>
        </div>
      </div>
    </div>
  );
};

// Club World Cup Matches Component with group-based organization
const ClubWorldCupMatches = () => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showAllMatches, setShowAllMatches] = useState(false);

  const toggleGroup = (group) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Group matches by group and round
  const groupStageMatches = CLUB_WC_ALL_MATCHES.filter(match => match.round === 'Group Stage');
  const knockoutMatches = CLUB_WC_ALL_MATCHES.filter(match => match.round !== 'Group Stage');

  // Group stage matches by group
  const matchesByGroup = {};
  Object.keys(CLUB_WC_GROUPS).forEach(groupLetter => {
    matchesByGroup[groupLetter] = groupStageMatches.filter(match => match.group === groupLetter);
  });

  // Get first match for each group (for initial display)
  const getFirstMatchForGroup = (groupLetter) => {
    return matchesByGroup[groupLetter]?.[0];
  };

  const MatchCard = ({ match, isFirst = false }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 ${isFirst ? 'border-2 border-purple-200 dark:border-purple-700' : 'border border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[60px]">
            <div className="text-xs text-gray-500 dark:text-gray-400">#{match.match}</div>
            <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">{match.round === 'Group Stage' ? `Group ${match.group}` : match.round}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right min-w-[120px]">
              <div className="font-bold text-gray-900 dark:text-white text-sm">{match.home}</div>
            </div>
            <div className="text-gray-400 font-bold">vs</div>
            <div className="text-left min-w-[120px]">
              <div className="font-bold text-gray-900 dark:text-white text-sm">{match.away}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{match.date}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{match.time} {match.timezone}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">{match.venue}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Tournament Matches</h3>
        <button
          onClick={() => setShowAllMatches(!showAllMatches)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showAllMatches ? 'Show Groups Only' : 'Show All Matches'}
        </button>
      </div>

      {!showAllMatches ? (
        // Group-based view
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <strong>Group Stage Overview:</strong> Showing first match for each group. Click to expand and see all 6 matches per group.
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300">
              48 total group stage matches • 8 groups with 4 teams each
            </div>
          </div>

          {Object.keys(CLUB_WC_GROUPS).map(groupLetter => {
            const firstMatch = getFirstMatchForGroup(groupLetter);
            const groupMatches = matchesByGroup[groupLetter];
            const isExpanded = expandedGroups.has(groupLetter);
            
            if (!firstMatch) return null;

            return (
              <div key={groupLetter} className="space-y-2">
                {/* Group Header with First Match */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        {groupLetter}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Group {groupLetter}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {CLUB_WC_GROUPS[groupLetter].teams.join(' • ')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleGroup(groupLetter)}
                      className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {isExpanded ? 'Hide' : 'Show'} all {groupMatches.length} matches
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* First match (always shown) */}
                  <MatchCard match={firstMatch} isFirst={true} />
                </div>

                {/* Expanded matches */}
                {isExpanded && (
                  <div className="space-y-2 ml-4 border-l-2 border-purple-200 dark:border-purple-700 pl-4">
                    {groupMatches.slice(1).map(match => (
                      <MatchCard key={match.match} match={match} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Knockout Stage Preview */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
            <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Knockout Stage
            </h4>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              15 knockout matches: Round of 16 (8) • Quarterfinals (4) • Semifinals (2) • Final (1)
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              Click "Show All Matches" to see the complete knockout bracket
            </div>
          </div>
        </div>
      ) : (
        // All matches view
        <div className="space-y-6">
          {/* Group Stage */}
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flag className="w-5 h-5 text-blue-500" />
              Group Stage (48 matches)
            </h4>
            <div className="space-y-2">
              {groupStageMatches.map(match => (
                <MatchCard key={match.match} match={match} />
              ))}
            </div>
          </div>

          {/* Knockout Stage */}
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Knockout Stage (15 matches)
            </h4>
            <div className="space-y-2">
              {knockoutMatches.map(match => (
                <MatchCard key={match.match} match={match} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tournament Leaderboard Component
const TournamentLeaderboard = ({ tournamentId, participantCount, onJoinSuccess }) => {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [participating, setParticipating] = useState(false);

  useEffect(() => {
    loadLeaderboard();
    if (publicKey) {
      checkUserStatus();
    }
  }, [tournamentId, publicKey]);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading tournament leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/status/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setParticipating(data.participating);
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error checking user tournament status:', error);
    }
  };

  const handleJoinTournament = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: publicKey.toString() })
      });

      if (response.ok) {
        const data = await response.json();
        setParticipating(true);
        
        // Award engagement points for joining
        let totalPointsEarned = 50; // Base join reward
        try {
          const pointsResponse = await fetch(`https://apes-production.up.railway.app/api/engagement/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: publicKey.toString(),
              activity_type: 'TOURNAMENT_JOIN',
              metadata: { tournamentId, tournament_name: 'FIFA Club World Cup 2025' }
            })
          });
          
          // Early bird bonus for first 100 participants
          if (participantCount < 100) {
            await fetch(`https://apes-production.up.railway.app/api/engagement/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet_address: publicKey.toString(),
                activity_type: 'EARLY_BIRD_BONUS',
                metadata: { tournamentId, reason: 'First 100 participants' }
              })
            });
            totalPointsEarned = 150; // 50 + 100 bonus
          }
        } catch (pointsError) {
          console.error('Error awarding join points:', pointsError);
        }
        
        // Refresh local data
        loadLeaderboard(); // Refresh leaderboard
        checkUserStatus(); // Refresh user stats
        
        // Call parent callback to refresh tournament data
        if (onJoinSuccess) {
          onJoinSuccess();
        }
        
        // Show success message with rewards
        alert(`🎉 Successfully joined tournament!\n💰 Earned ${totalPointsEarned} APES points\n🏆 Good luck in the competition!\n\n📊 Participant count will update shortly.`);
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('❌ Failed to join tournament. Please try again.');
    }
  };

  const getBadgeForRank = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank <= 10 ? '🏆' : '📊';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tournament leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Tournament Leaderboard</h3>
        {!participating && publicKey && (
          <button
            onClick={handleJoinTournament}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Join Tournament
          </button>
        )}
      </div>

      {/* User's participation status */}
      {participating && userStats && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5" />
            Your Tournament Performance
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.total_predictions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.accuracy_rate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userStats.total_profit > 0 ? '+' : ''}{userStats.total_profit.toFixed(2)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Profit (APES)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{userStats.winning_predictions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Wins</div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Top Performers ({leaderboard.length} participants)
            </h4>
          </div>
          
          <div className="space-y-1">
            {leaderboard.map((user, index) => (
              <div 
                key={user.user_address} 
                className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  user.user_address === publicKey?.toString() ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <div className="text-2xl">{getBadgeForRank(user.rank)}</div>
                    <div className="text-sm font-bold text-gray-600 dark:text-gray-400">#{user.rank}</div>
                  </div>
                  
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {user.username || user.twitter_username || `${user.user_address.substring(0, 8)}...`}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {user.total_predictions} predictions • {user.accuracy_rate.toFixed(1)}% accuracy
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {user.total_profit > 0 ? '+' : ''}{user.total_profit.toFixed(2)} APES
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {user.winning_predictions}/{user.total_predictions} wins
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No participants yet
          </div>
          <div className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to join this tournament and start predicting!
          </div>
          {!participating && publicKey && (
            <button
              onClick={handleJoinTournament}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Join Tournament
            </button>
          )}
        </div>
      )}

      {/* Tournament info */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700">
        <h4 className="font-bold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
          ⚡ How Tournament Competition Works
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700 dark:text-yellow-300">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
            <div className="font-bold mb-1">1️⃣ Join Tournament</div>
            <div>Click "Join Tournament" to register and earn instant rewards + early bird bonuses</div>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
            <div className="font-bold mb-1">2️⃣ Make Predictions</div>
            <div>Predict outcomes on Club World Cup matches to earn points and climb the leaderboard</div>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
            <div className="font-bold mb-1">3️⃣ Win Prizes</div>
            <div>Top performers share the massive prize pool: {tournamentId === 'club-world-cup-2025' ? '1,000,000 APES + 3 SOL' : '500,000 APES + 1.5 SOL'} based on accuracy</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-200 dark:bg-yellow-800/50 rounded-lg">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            💡 <strong>Pro Tip:</strong> Join early to secure your early bird bonus and get first access to prediction markets!
          </div>
        </div>
      </div>
    </div>
  );
};

const TournamentDetailPage = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroup, setSelectedGroup] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [recentJoiners, setRecentJoiners] = useState([]);
  const [participating, setParticipating] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Check if user is admin
  const isAdmin = publicKey && isWalletAuthorized(publicKey.toString());

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  const loadTournamentData = async () => {
    setLoading(true);
    
    // Load tournament participant count with cache busting
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/leaderboard?t=${cacheBuster}`);
      
      console.log('🔍 Loading tournament data for:', tournamentId, 'Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const newParticipantCount = data.totalParticipants || data.leaderboard?.length || 0;
        
        console.log('📊 Tournament data loaded:', {
          totalParticipants: data.totalParticipants,
          leaderboardLength: data.leaderboard?.length,
          finalCount: newParticipantCount
        });
        
        setParticipantCount(newParticipantCount);
        
        // Get recent joiners (last 3)
        const recentJoiners = (data.leaderboard || [])
          .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))
          .slice(0, 3)
          .map(user => ({
            username: user.username || user.twitter_username || `${user.user_address.substring(0, 8)}...`,
            joinedAt: user.joined_at
          }));
        setRecentJoiners(recentJoiners);
        
        console.log('👥 Recent joiners updated:', recentJoiners.length);
      } else {
        console.error('❌ Failed to load tournament data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading tournament data:', error);
    }
    
    // Mock tournament data based on ID
    if (tournamentId === 'club-world-cup-2025') {
      setTournament({
        id: 'club-world-cup-2025',
        name: 'FIFA Club World Cup 2025',
        description: 'The ultimate club football championship featuring 32 teams from around the world',
        banner: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80',
        startDate: '2025-06-14',
        endDate: '2025-07-13',
        totalMarkets: 63,
        prizePool: {
          apes: 1000000,
          sol: 3 // Enhanced massive prize pool
        },
        participants: participantCount,
        maxParticipants: 1000, // Create scarcity
        type: 'football',
        earlyBirdBonus: 100, // Points for early joiners
        joinReward: 50 // Base points for joining
      });
    } else if (tournamentId === 'nba-finals-2025') {
      setTournament({
        id: 'nba-finals-2025',
        name: 'NBA Finals 2025',
        description: 'The championship series of the National Basketball Association - Oklahoma City Thunder vs Indiana Pacers',
        banner: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2059&q=80',
        startDate: '2025-06-05',
        endDate: '2025-06-22',
        totalMarkets: 7, // Up to 7 games in best of 7 series
        prizePool: {
          apes: 500000,
          sol: 1.5
        },
        participants: participantCount,
        maxParticipants: 500,
        type: 'basketball',
        earlyBirdBonus: 50,
        joinReward: 25
      });
    }
    
    setLoading(false);
  };

  // Check if user is participating in tournament
  const checkUserParticipation = async () => {
    if (!publicKey || !tournament) return;
    
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournament.id}/status/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setParticipating(data.participating);
      }
    } catch (error) {
      console.error('Error checking user participation:', error);
    }
  };

  // Shared join tournament function
  const handleJoinTournament = async () => {
    if (!publicKey || !tournament || joining) return;

    setJoining(true);
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournament.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: publicKey.toString() })
      });

      if (response.ok) {
        const joinData = await response.json();
        setParticipating(true);
        
        // Award engagement points for joining with better error handling
        let totalPointsEarned = 50; // Base join reward
        let pointsAwarded = false;
        
        console.log('🎯 Awarding tournament join points for wallet:', publicKey.toString());
        
        try {
          // Award base tournament join points
          const basePointsResponse = await fetch(`https://apes-production.up.railway.app/api/engagement/track`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-wallet-address': publicKey.toString()
            },
            body: JSON.stringify({
              activity_type: 'TOURNAMENT_JOIN',
              metadata: { 
                tournamentId: tournament.id, 
                tournament_name: tournament.name,
                points: 50
              }
            })
          });
          
          if (basePointsResponse.ok) {
            const basePointsResult = await basePointsResponse.json();
            console.log('✅ Base tournament points awarded:', basePointsResult);
            pointsAwarded = true;
          } else {
            const errorText = await basePointsResponse.text();
            console.error('❌ Failed to award base points:', basePointsResponse.status, errorText);
          }
          
          // Early bird bonus for first 100 participants
          if (participantCount < 100) {
            const bonusResponse = await fetch(`https://apes-production.up.railway.app/api/engagement/track`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-wallet-address': publicKey.toString()
              },
              body: JSON.stringify({
                activity_type: 'EARLY_BIRD_BONUS',
                metadata: { 
                  tournamentId: tournament.id, 
                  reason: 'First 100 participants',
                  points: 100
                }
              })
            });
            
            if (bonusResponse.ok) {
              const bonusResult = await bonusResponse.json();
              console.log('✅ Early bird bonus awarded:', bonusResult);
              totalPointsEarned = 150; // 50 + 100 bonus
            } else {
              const errorText = await bonusResponse.text();
              console.error('❌ Failed to award early bird bonus:', bonusResponse.status, errorText);
            }
          }
        } catch (pointsError) {
          console.error('❌ Error awarding join points:', pointsError);
        }
        
        // Force refresh tournament data multiple times to ensure count updates
        console.log('🔄 Refreshing tournament data...');
        await loadTournamentData();
        
        // Wait a moment and refresh again to ensure database updates are reflected
        setTimeout(async () => {
          await loadTournamentData();
          console.log('🔄 Second refresh completed');
        }, 2000);
        
        // Additional debugging - test the API endpoints directly
        setTimeout(async () => {
          try {
            console.log('🧪 Testing tournament API endpoints...');
            
            // Test leaderboard endpoint
            const testResponse = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournament.id}/leaderboard`);
            if (testResponse.ok) {
              const testData = await testResponse.json();
              console.log('🧪 Direct API test result:', {
                endpoint: '/leaderboard',
                totalParticipants: testData.totalParticipants,
                leaderboardLength: testData.leaderboard?.length,
                recentParticipants: testData.leaderboard?.slice(0, 3)
              });
            } else {
              console.error('🧪 API test failed:', testResponse.status, testResponse.statusText);
            }
            
            // Test user status endpoint
            const statusResponse = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournament.id}/status/${publicKey.toString()}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log('🧪 User status test:', statusData);
            } else {
              console.error('🧪 Status API test failed:', statusResponse.status);
            }
          } catch (testError) {
            console.error('🧪 API testing failed:', testError);
          }
        }, 3000);
        
        // Show success message with rewards
        const pointsMessage = pointsAwarded 
          ? `💰 Earned ${totalPointsEarned} APES points` 
          : `💰 ${totalPointsEarned} APES points pending (may take a moment to appear)`;
          
        alert(`🎉 Successfully joined tournament!\n${pointsMessage}\n🏆 Good luck in the competition!\n\n📊 Participant count will update shortly.`);
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('❌ Failed to join tournament. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  // Check participation when tournament data loads
  useEffect(() => {
    if (tournament && publicKey) {
      checkUserParticipation();
    }
  }, [tournament, publicKey]);

  const addNBAGame = async (gameNumber) => {
    try {
      // Create market for NBA Finals game
      const marketData = {
        question: `NBA Finals 2025 - Game ${gameNumber}`,
        description: `Predict the winner of NBA Finals Game ${gameNumber} between Oklahoma City Thunder and Indiana Pacers`,
        options: ['Oklahoma City Thunder', 'Indiana Pacers'],
        category: 'Sports',
        league: 'nba',
        tournament_type: 'tournament',
        tournament_id: 'nba-finals-2025',
        endTime: NBA_FINALS_SERIES.games[gameNumber - 1].date + 'T23:59:59.000Z',
        minBetAmount: 10,
        creatorFeeRate: 2.5,
        assets: {
          banner: tournament.banner,
          icon: tournament.banner
        },
        optionsMetadata: [
          { label: 'Oklahoma City Thunder', icon: null },
          { label: 'Indiana Pacers', icon: null }
        ]
      };

              const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(marketData)
      });

      if (response.ok) {
        console.log(`✅ Successfully created market for NBA Finals Game ${gameNumber}`);
        // You could update local state or show a success message
      } else {
        console.error(`❌ Failed to create market for Game ${gameNumber}`);
      }
    } catch (error) {
      console.error('Error creating NBA Finals game market:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Tournament Not Found</h2>
          <button 
            onClick={() => navigate('/tournaments')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tournament Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img 
          src={tournament.banner} 
          alt={tournament.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
            <button 
              onClick={() => navigate('/tournaments')}
              className="mb-4 flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Tournaments
            </button>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-gray-200 text-lg max-w-2xl">{tournament.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tournament Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-yellow-200 dark:border-yellow-800">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {tournament.prizePool.apes.toLocaleString()} APES
            </div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              + {tournament.prizePool.sol} SOL
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">Total Prize Pool</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">🔥 Enhanced Pool</div>
          </div>
          
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 text-center border-2 ${
            tournament.participants >= tournament.maxParticipants * 0.8 
              ? 'border-red-200 dark:border-red-800' 
              : 'border-blue-200 dark:border-blue-800'
          }`}>
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tournament.participants.toLocaleString()}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                /{tournament.maxParticipants.toLocaleString()}
              </span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">Participants</div>
            {tournament.participants >= tournament.maxParticipants * 0.8 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚡ Almost Full!</div>
            )}
            {tournament.participants < tournament.maxParticipants * 0.5 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">🌟 Early Bird Bonus</div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tournament.totalMarkets}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">Total Markets</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.ceil((new Date(tournament.startDate) - new Date()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">Days Until Start</div>
            {Math.ceil((new Date(tournament.startDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 7 && (
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">⏰ Starting Soon</div>
            )}
          </div>
        </div>

        {/* Join Tournament CTA Section */}
        {!connected && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-8 border border-purple-200 dark:border-purple-700">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                🚀 Connect Wallet to Join Tournament
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your wallet to participate in the FIFA Club World Cup 2025 and earn rewards!
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>💰 {tournament.joinReward} APES for joining</span>
                <span>🎯 {tournament.earlyBirdBonus} bonus points if first 100</span>
                <span>🏆 Prize pool: {tournament.prizePool.apes.toLocaleString()} APES + {tournament.prizePool.sol} SOL</span>
              </div>
            </div>
          </div>
        )}

        {/* Countdown Timer & Join Tournament */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 mb-8 border border-purple-200 dark:border-purple-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                Tournament Starts In
              </h3>
              <CountdownTimer 
                targetDate={tournament.startDate} 
                label="⚽ FIFA Club World Cup 2025"
              />
            </div>
            
            {/* Join Tournament Section */}
            <div className="text-center">
              {connected && publicKey ? (
                participating ? (
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="text-green-800 dark:text-green-200 font-bold mb-2">
                      ✅ You're In!
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Good luck in the tournament!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleJoinTournament}
                      disabled={joining}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Joining...
                        </div>
                      ) : (
                        '🚀 Join Tournament'
                      )}
                    </button>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      💰 {tournament.joinReward} APES instantly + {tournament.earlyBirdBonus} bonus if first 100
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-800 dark:text-blue-200 font-bold mb-2">
                    🔗 Connect Wallet
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Connect to join the tournament
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center lg:text-right">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tournament Fill Status</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((tournament.participants / tournament.maxParticipants) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {Math.round((tournament.participants / tournament.maxParticipants) * 100)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {tournament.maxParticipants - tournament.participants} spots remaining
                </div>
              </div>
              
              {tournament.participants < 100 && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm font-medium px-3 py-2 rounded-lg">
                  🌟 Early Bird Bonus Still Available!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity & FOMO */}
        {recentJoiners.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 mb-8 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-green-800 dark:text-green-200 mb-1">🔥 Recent Joiners</h4>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  {recentJoiners.map((joiner, index) => (
                    <span key={index} className="bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                      {joiner.username}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                {connected && publicKey && !participating && (
                  <button
                    onClick={handleJoinTournament}
                    disabled={joining}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {joining ? 'Joining...' : 'Join Now'}
                  </button>
                )}
                {!connected && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Connect wallet to join!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="flex space-x-8">
            {['overview', 'bracket', 'markets', 'leaderboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {tournament.id === 'club-world-cup-2025' && <ClubWorldCupMatches />}

            {tournament.id === 'nba-finals-2025' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">NBA Finals 2025 Series</h3>
                
                {/* Series Scoreboard */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                                          <div className="text-center flex-1">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">OKC</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">Oklahoma City Thunder</div>
                        <div className="text-4xl font-bold text-blue-600 mt-2">1</div>
                      </div>
                    
                    <div className="text-center px-8">
                      <div className="text-gray-500 dark:text-gray-400 text-sm">Best of 7 Series</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">1 - 1</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Series Tied</div>
                      <div className="flex gap-1 mt-3 justify-center">
                        {[1, 2, 3, 4, 5, 6, 7].map((gameNum) => {
                          const game = NBA_FINALS_SERIES.games[gameNum - 1];
                          return (
                            <div
                              key={gameNum}
                                                             className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                 game.status === 'completed'
                                   ? game.winner === 'Oklahoma City Thunder'
                                     ? 'bg-blue-500 text-white border-blue-500'
                                     : 'bg-yellow-500 text-white border-yellow-500'
                                   : game.status === 'live'
                                   ? 'bg-red-100 text-red-600 border-red-500 animate-pulse'
                                   : 'bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                               }`}
                            >
                              {gameNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                                          <div className="text-center flex-1">
                        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-yellow-600 dark:text-yellow-400 font-bold text-xl">IND</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">Indiana Pacers</div>
                        <div className="text-4xl font-bold text-yellow-600 mt-2">1</div>
                      </div>
                  </div>
                </div>

                {/* Game List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Series Games</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Game 3 is LIVE • Next: Add Games 4-7 as needed
                    </div>
                  </div>
                  
                  {NBA_FINALS_SERIES.games.map((game) => (
                    <div key={game.id} className={`bg-white dark:bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                      game.status === 'live' 
                        ? 'border-red-500 shadow-lg' 
                        : game.status === 'completed'
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="text-center min-w-[80px]">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Game {game.id}</div>
                            <div className={`font-bold text-lg ${
                              game.status === 'live' ? 'text-red-500 animate-pulse' : 
                              game.status === 'completed' ? 'text-green-500' : 'text-gray-400'
                            }`}>
                              {game.status === 'live' ? '🔴 LIVE' : 
                               game.status === 'completed' ? '✅ FINAL' : '⏰ UPCOMING'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className={`font-bold text-lg ${
                                game.status === 'completed' && game.winner === 'Oklahoma City Thunder' 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                Thunder
                              </div>
                              {game.status === 'completed' && game.winner === 'Oklahoma City Thunder' && (
                                <Crown className="w-5 h-5 text-yellow-500 mx-auto mt-1" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {game.status === 'completed' && (
                                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                                  <div className="font-bold text-gray-900 dark:text-white">{game.score}</div>
                                </div>
                              )}
                              {game.status !== 'completed' && (
                                <div className="text-gray-400 font-bold">VS</div>
                              )}
                            </div>
                            
                            <div className="text-center">
                              <div className={`font-bold text-lg ${
                                game.status === 'completed' && game.winner === 'Indiana Pacers' 
                                  ? 'text-yellow-600 dark:text-yellow-400' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                Pacers
                              </div>
                              {game.status === 'completed' && game.winner === 'Indiana Pacers' && (
                                <Crown className="w-5 h-5 text-yellow-500 mx-auto mt-1" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{game.date}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">{game.venue}</div>
                            {game.status === 'live' && (
                              <div className="text-xs text-red-500 font-bold mt-1">⚡ Markets Active</div>
                            )}
                          </div>
                          
                                                  {game.status === 'upcoming' && game.id > 3 && isAdmin && (
                          <button
                            onClick={() => addNBAGame(game.id)}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Add Game {game.id} Market
                          </button>
                        )}
                          
                          {game.status === 'upcoming' && game.id <= 3 && (
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg text-sm">
                              Market Ready
                            </div>
                          )}
                          
                                                  {(game.status === 'completed' || game.status === 'live') && (
                          <button 
                            onClick={() => {
                              // Link to specific market for Game 3
                              if (game.id === 3) {
                                navigate('/markets/9CKNL7Qf9G8n2REVZJNQK9r9pNhziPc5KDGsvCU64wjV');
                              } else {
                                navigate('/markets');
                              }
                            }}
                            className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                          >
                            View Market
                          </button>
                        )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Series Info */}
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <h5 className="font-bold text-blue-900 dark:text-blue-100 mb-3">Series Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Format:</span>
                      <span className="ml-2 text-blue-700 dark:text-blue-300">Best of 7 (First to 4 wins)</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Current Status:</span>
                      <span className="ml-2 text-blue-700 dark:text-blue-300">Game 3 Live, Series Tied 1-1</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-200">Games Remaining:</span>
                      <span className="ml-2 text-blue-700 dark:text-blue-300">Up to 5 games (minimum 2)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bracket' && tournament.id === 'nba-finals-2025' && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Series Bracket</h3>
            
            {/* NBA Finals Visual Bracket */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-2xl">OKC</span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">Oklahoma City Thunder</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">(Western Champion)</div>
                  </div>
                  
                  <div className="flex-1 max-w-md">
                    <div className="text-center mb-4">
                      <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                      <div className="font-bold text-lg text-gray-900 dark:text-white">NBA Finals 2025</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Best of 7 Series</div>
                    </div>
                    
                    {/* Series Progress Bar */}
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-2 mb-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">OKC: 1</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6, 7].map((gameNum) => {
                            const game = NBA_FINALS_SERIES.games[gameNum - 1];
                            return (
                              <div
                                key={gameNum}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  game.status === 'completed'
                                    ? game.winner === 'Oklahoma City Thunder'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-yellow-500 text-white'
                                    : game.status === 'live'
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {gameNum}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">IND: 1</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">1 - 1</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Series Tied</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold text-2xl">IND</span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">Indiana Pacers</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">(Eastern Champion)</div>
                  </div>
                </div>
              </div>
              
              {/* Championship Path */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Western Conference</h4>
                  <div className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="font-bold text-blue-700 dark:text-blue-300">Conference Finals</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Thunder def. Nuggets 4-3</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="font-bold text-blue-700 dark:text-blue-300">Conference Semifinals</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Thunder def. Lakers 4-2</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-4">Championship</h4>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                    <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <div className="font-bold text-yellow-700 dark:text-yellow-300">NBA Championship</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">June 5-22, 2025</div>
                    <div className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">Best of 7</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Eastern Conference</h4>
                  <div className="space-y-3">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="font-bold text-yellow-700 dark:text-yellow-300">Conference Finals</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">Pacers def. Celtics 4-2</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="font-bold text-yellow-700 dark:text-yellow-300">Conference Semifinals</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">Pacers def. 76ers 4-1</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bracket' && tournament.id === 'club-world-cup-2025' && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tournament Bracket</h3>
            
            {/* Tournament Phase Selector */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setSelectedGroup('groups')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedGroup === 'groups'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Group Stage
              </button>
              <button
                onClick={() => setSelectedGroup('knockout')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedGroup === 'knockout'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Knockout Phase
              </button>
            </div>

            {/* Group Stage View */}
            {selectedGroup === 'groups' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(CLUB_WC_GROUPS).map(([groupLetter, groupData]) => (
                    <div key={groupLetter} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">
                            {groupLetter}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Group {groupLetter}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {groupData.teams.map((team, index) => (
                          <div key={team} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{team}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {CLUB_WC_ALL_MATCHES.filter(m => m.group === groupLetter).length} matches
                        </div>
                        <button
                          onClick={() => setSelectedGroup(groupLetter)}
                          className="w-full mt-2 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 py-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Group Detail View */}
            {Object.keys(CLUB_WC_GROUPS).includes(selectedGroup) && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setSelectedGroup('groups')}
                    className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to All Groups
                  </button>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Group {selectedGroup}
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h5 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Teams & Standings
                      </h5>
                      <div className="space-y-3">
                        {CLUB_WC_GROUPS[selectedGroup].teams.map((team, index) => (
                          <div key={team} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                index === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{team}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">0 pts</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">0-0-0</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Qualification:</strong> Top 2 teams advance to Round of 16
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Group Matches
                      </h5>
                      <div className="space-y-3">
                        {CLUB_WC_ALL_MATCHES
                          .filter(match => match.group === selectedGroup)
                          .map((match) => (
                            <div key={match.match} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  Match {match.match}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {match.date} • {match.time}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {match.home} vs {match.away}
                                </div>
                                <button className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/40 transition-colors">
                                  View Market
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {match.venue}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Knockout Phase View */}
            {selectedGroup === 'knockout' && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">32</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Teams</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">16</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Round of 16</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Quarterfinals</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">4</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Semifinals</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">1</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Champion</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Knockout Bracket
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <h5 className="font-bold text-center mb-4 text-gray-700 dark:text-gray-300">Round of 16</h5>
                      <div className="space-y-2">
                        {Array.from({ length: 8 }, (_, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Match {49 + i}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Group Winner vs Runner-up
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-bold text-center mb-4 text-gray-700 dark:text-gray-300">Quarterfinals</h5>
                      <div className="space-y-4">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QF {i + 1}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              TBD vs TBD
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-bold text-center mb-4 text-gray-700 dark:text-gray-300">Semifinals</h5>
                      <div className="space-y-8">
                        {Array.from({ length: 2 }, (_, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded p-4 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">SF {i + 1}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              TBD vs TBD
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-bold text-center mb-4 text-yellow-600 dark:text-yellow-400">Final</h5>
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">July 13, 2025</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          Champion Match
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          MetLife Stadium
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'markets' && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Markets</h3>
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Markets will be available closer to match dates</p>
              <button 
                onClick={() => navigate('/markets')}
                className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Browse All Markets
              </button>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <TournamentLeaderboard 
            tournamentId={tournament.id} 
            participantCount={participantCount}
            onJoinSuccess={loadTournamentData}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentDetailPage; 