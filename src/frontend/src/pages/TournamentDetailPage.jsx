import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { isWalletAuthorized } from '../config/access';
import { format, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet-async';
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
  Gift,
  BarChart3,
  Newspaper,
  Table2,
  Filter,
  Search,
  Grid3x3,
  CalendarDays,
  Shield,
  UserCircle2,
  Activity,
  TrendingDown,
  Award,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink
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

// Club World Cup Groups and Teams with standings
const CLUB_WC_GROUPS = {
  'A': { 
    teams: ['Al Ahly', 'Inter Miami', 'Palmeiras', 'Porto'],
    standings: [
      { team: 'Palmeiras', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Porto', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Al Ahly', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Inter Miami', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'B': { 
    teams: ['Paris Saint-Germain', 'Atletico Madrid', 'Botafogo', 'Seattle Sounders'],
    standings: [
      { team: 'Paris Saint-Germain', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Atletico Madrid', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Botafogo', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Seattle Sounders', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'C': { 
    teams: ['Bayern Munich', 'Auckland City', 'Boca Juniors', 'Benfica'],
    standings: [
      { team: 'Bayern Munich', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Benfica', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Boca Juniors', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Auckland City', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'D': { 
    teams: ['Chelsea', 'LAFC', 'Flamengo', 'Espérance'],
    standings: [
      { team: 'Chelsea', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Flamengo', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'LAFC', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Espérance', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'E': { 
    teams: ['River Plate', 'Urawa Red Diamonds', 'Monterrey', 'Internazionale'],
    standings: [
      { team: 'River Plate', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Internazionale', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Monterrey', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Urawa Red Diamonds', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'F': { 
    teams: ['Fluminense', 'Borussia Dortmund', 'Ulsan HD', 'Mamelodi Sundowns'],
    standings: [
      { team: 'Borussia Dortmund', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Fluminense', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Ulsan HD', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Mamelodi Sundowns', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'G': { 
    teams: ['Manchester City', 'Wydad AC', 'Al Ain', 'Juventus'],
    standings: [
      { team: 'Manchester City', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Juventus', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Al Ain', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Wydad AC', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  'H': { 
    teams: ['Real Madrid', 'Al Hilal', 'Pachuca', 'Salzburg'],
    standings: [
      { team: 'Real Madrid', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Salzburg', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Al Hilal', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: 'Pachuca', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  }
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

// FotMob-style Tab Navigation Component
const TabNavigation = ({ activeTab, setActiveTab, tournamentId }) => {
  const tabs = tournamentId === 'club-world-cup-2025' 
    ? ['overview', 'table', 'knockout', 'matches', 'stats', 'news']
    : ['overview', 'matches', 'stats', 'news'];

  const tabIcons = {
    overview: Globe,
    table: Table2,
    knockout: Trophy,
    matches: CalendarDays,
    stats: BarChart3,
    news: Newspaper
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto">
        <nav className="flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tabIcons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-3 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-gray-900 dark:text-white border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, title, value, subtitle, trend, color = 'yellow' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    black: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Match Card Component (FotMob style)
const MatchCard = ({ match, tournamentAssets, onViewMarket, markets = [], timezone = 'ET' }) => {
  const navigate = useNavigate();
  
  // Convert match time to the tournament's timezone
  const getDisplayTime = useCallback(() => {
    if (!match.date || !match.time) return { date: 'TBD', time: 'TBD' };
    
    try {
      // Create a date object from the match date and time
      const matchDateTime = new Date(`${match.date}T${match.time}:00`);
      
      // According to a memory from a past conversation...
      // Tournament markets store resolution dates in UTC. When displaying these dates:
      // 1. For tournament markets with tournament_id, convert UTC back to ET (Eastern Time) as that's the tournament timezone
      // 2. In June 2025, use EDT (UTC-4) for the conversion
      // 3. Always indicate the timezone when displaying times to avoid confusion
      // 4. The backend correctly stores UTC times, but frontend display should show the actual match time in the tournament's timezone
      
      // Since it's June 2025, we use EDT (UTC-4)
      // The match times are already in the correct timezone (ET/PT as specified in match data)
      // So we just format them for display
      const dateStr = format(parseISO(match.date), 'MMM d');
      const timeStr = match.time || 'TBD';
      
      return { date: dateStr, time: timeStr };
    } catch (error) {
      console.error('Error formatting match time:', error);
      return { date: match.date, time: match.time || 'TBD' };
    }
  }, [match.date, match.time]);
  
  const displayTime = getDisplayTime();
  
  const handleViewMarket = async () => {
    if (onViewMarket) {
      onViewMarket(match);
    } else {
      const question = `${match.home} - ${match.away}`;
      console.log('🔍 Looking for market with question:', question);
      console.log('📊 Available markets:', markets.map(m => ({ question: m.question, status: m.status })));
      
      // 🔥 FIX: Look for market regardless of status (Active, Resolved, Pending Resolution)
      const market = markets.find(m => m.question === question);
      
      if (market) {
        console.log('✅ Found market:', market.publicKey || market.market_address, 'Status:', market.status);
        
        // Navigate to market regardless of status - let the market page handle display
        navigate(`/markets/${market.publicKey || market.market_address}`);
      } else {
        console.log('❌ Market not found in passed markets, trying API...');
        // If market not in passed array, try fetching from API as fallback
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets?tournament_id=club-world-cup-2025&include_resolved=true&check_escrow=true`);
          if (response.ok) {
            const allMarkets = await response.json();
            console.log('📡 API returned markets:', allMarkets.map(m => ({ question: m.question, status: m.status })));
            const foundMarket = allMarkets.find(m => m.question === question);
            if (foundMarket) {
              console.log('✅ Found market via API:', foundMarket.publicKey || foundMarket.market_address, 'Status:', foundMarket.status);
              
              // Navigate to market regardless of status
              navigate(`/markets/${foundMarket.publicKey || foundMarket.market_address}`);
            } else {
              // Better error message to distinguish between not deployed vs other issues
              console.log('❌ Market not found for question:', question);
              
              // Check if it's a past match date
              const matchDate = new Date(match.date);
              const today = new Date();
              
              if (matchDate < today) {
                alert('This match has already been played. The market may be pending resolution or not yet deployed.');
              } else {
                alert('Market not yet deployed for this match. Please check back later.');
              }
            }
          }
        } catch (error) {
          console.error('Error finding market:', error);
          alert('Error finding market for this match');
        }
      }
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
      <div className="p-4">
        {/* Match header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {match.round} {match.group && match.round === 'Group Stage' ? `• Group ${match.group}` : ''}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {displayTime.date} • {displayTime.time} {match.timezone || timezone}
          </div>
        </div>
        
        {/* Teams */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {tournamentAssets?.team_logos?.[match.home] && (
                <img 
                  src={tournamentAssets.team_logos[match.home]} 
                  alt={match.home}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="font-medium text-gray-900 dark:text-white">{match.home}</span>
            </div>
            {match.status === 'completed' && match.score && (
              <span className="font-bold text-gray-900 dark:text-white">{match.score.split('-')[0]}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {tournamentAssets?.team_logos?.[match.away] && (
                <img 
                  src={tournamentAssets.team_logos[match.away]} 
                  alt={match.away}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="font-medium text-gray-900 dark:text-white">{match.away}</span>
            </div>
            {match.status === 'completed' && match.score && (
              <span className="font-bold text-gray-900 dark:text-white">{match.score.split('-')[1]}</span>
            )}
          </div>
        </div>
        
        {/* Match info and action */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 inline mr-1" />
            {match.venue}
          </div>
          <button
            onClick={handleViewMarket}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            View Market
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Table Component for Group Standings
const TableView = ({ groups, tournamentAssets, markets = [] }) => {
  // 🔥 FIX: Calculate standings dynamically based on resolved markets
  const calculateStandings = (groupLetter, teams) => {
    console.log(`📊 Calculating standings for Group ${groupLetter}`);
    console.log('Available markets:', markets.length);
    
    // Initialize standings for each team
    const standings = teams.map(team => ({
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    }));

    // Get group stage matches for this group
    const groupMatches = CLUB_WC_ALL_MATCHES.filter(
      match => match.group === groupLetter && match.round === 'Group Stage'
    );
    
    console.log(`Group ${groupLetter} matches:`, groupMatches.map(m => `${m.home} - ${m.away}`));

    // Process each match that has a resolved market
    groupMatches.forEach(match => {
      const marketQuestion = `${match.home} - ${match.away}`;
      const market = markets.find(m => 
        m.question === marketQuestion && 
        (m.status === 'Resolved' || m.status === 'resolved') &&
        m.resolved_option !== null && m.resolved_option !== undefined
      );

      console.log(`Looking for market: "${marketQuestion}"`);
      if (market) {
        console.log(`✅ Found resolved market: ${marketQuestion}, resolved_option: ${market.resolved_option}, status: ${market.status}`);
      } else {
        // Also check for pending resolution markets
        const pendingMarket = markets.find(m => 
          m.question === marketQuestion && 
          m.status === 'Pending Resolution'
        );
        if (pendingMarket) {
          console.log(`⏳ Market in Pending Resolution: ${marketQuestion}`);
        } else {
          console.log(`❌ No resolved market found for: ${marketQuestion}`);
        }
      }

      if (market && market.resolved_option !== null && market.resolved_option !== undefined) {
        // Find teams in standings
        const homeTeamIndex = standings.findIndex(s => s.team === match.home);
        const awayTeamIndex = standings.findIndex(s => s.team === match.away);

        if (homeTeamIndex !== -1 && awayTeamIndex !== -1) {
          // Both teams played
          standings[homeTeamIndex].played++;
          standings[awayTeamIndex].played++;

          // Determine result based on resolved option
          // For group stage: option 0 = home win, option 1 = away win, option 2 = draw
          if (market.resolved_option === 0) {
            // Home win
            standings[homeTeamIndex].won++;
            standings[homeTeamIndex].points += 3;
            standings[awayTeamIndex].lost++;
            console.log(`🏆 ${match.home} won against ${match.away}`);
          } else if (market.resolved_option === 1) {
            // Away win
            standings[awayTeamIndex].won++;
            standings[awayTeamIndex].points += 3;
            standings[homeTeamIndex].lost++;
            console.log(`🏆 ${match.away} won against ${match.home}`);
          } else if (market.resolved_option === 2) {
            // Draw
            standings[homeTeamIndex].drawn++;
            standings[homeTeamIndex].points += 1;
            standings[awayTeamIndex].drawn++;
            standings[awayTeamIndex].points += 1;
            console.log(`🤝 Draw between ${match.home} and ${match.away}`);
          }

          // TODO: Update goals for/against when score data is available
          // For now, we'll leave them as 0
        }
      }
    });

    // Sort standings by points, then goal difference, then goals for
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });

    console.log(`Final standings for Group ${groupLetter}:`, standings);
    return standings;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(groups).map(([groupLetter, groupData]) => {
          // Calculate current standings based on resolved markets
          const currentStandings = calculateStandings(groupLetter, groupData.teams);
          
          return (
            <div key={groupLetter} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">Group {groupLetter}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Team</th>
                      <th className="px-4 py-3 text-center font-medium">P</th>
                      <th className="px-4 py-3 text-center font-medium">W</th>
                      <th className="px-4 py-3 text-center font-medium">D</th>
                      <th className="px-4 py-3 text-center font-medium">L</th>
                      <th className="px-4 py-3 text-center font-medium">GF</th>
                      <th className="px-4 py-3 text-center font-medium">GA</th>
                      <th className="px-4 py-3 text-center font-medium">GD</th>
                      <th className="px-4 py-3 text-center font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStandings.map((team, index) => (
                      <tr key={team.team} className={`border-t border-gray-100 dark:border-gray-700 ${
                        index < 2 ? 'bg-green-50 dark:bg-green-900/10' : ''
                      }`}>
                        <td className="px-4 py-3 text-sm">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {tournamentAssets?.team_logos?.[team.team] && (
                              <img 
                                src={tournamentAssets.team_logos[team.team]} 
                                alt={team.team}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{team.team}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.played}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.won}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.drawn}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.lost}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.gf}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{team.ga}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                          <span className={team.gd > 0 ? 'text-green-600' : team.gd < 0 ? 'text-red-600' : ''}>
                            {team.gd > 0 ? '+' : ''}{team.gd}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                Top 2 teams advance to Round of 16
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Matches View with Filtering
const MatchesView = ({ matches, tournamentAssets, tournamentId, markets }) => {
  const [filterBy, setFilterBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRound, setSelectedRound] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  
  // Get unique values for filters
  const rounds = [...new Set(matches.map(m => m.round))];
  const groups = [...new Set(matches.filter(m => m.group && m.group !== 'R16' && m.group !== 'QF' && m.group !== 'SF' && m.group !== 'F').map(m => m.group))].sort();
  const teams = [...new Set(matches.flatMap(m => [m.home, m.away]))].sort();
  
  // Filter matches
  const filteredMatches = matches.filter(match => {
    if (searchTerm && !match.home.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !match.away.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedRound !== 'all' && match.round !== selectedRound) return false;
    if (selectedGroup !== 'all' && match.group !== selectedGroup) return false;
    if (selectedTeam !== 'all' && match.home !== selectedTeam && match.away !== selectedTeam) return false;
    return true;
  });
  
  // Group matches based on filter
  const groupedMatches = () => {
    if (filterBy === 'date') {
      const grouped = {};
      filteredMatches.forEach(match => {
        const date = match.date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(match);
      });
      return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    } else if (filterBy === 'round') {
      const grouped = {};
      filteredMatches.forEach(match => {
        if (!grouped[match.round]) grouped[match.round] = [];
        grouped[match.round].push(match);
      });
      return Object.entries(grouped);
    } else if (filterBy === 'group') {
      const grouped = {};
      filteredMatches.forEach(match => {
        const group = match.group || 'Knockout';
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(match);
      });
      return Object.entries(grouped).sort((a, b) => {
        if (a[0] === 'Knockout') return 1;
        if (b[0] === 'Knockout') return -1;
        return a[0].localeCompare(b[0]);
      });
    } else if (filterBy === 'team') {
      const grouped = {};
      filteredMatches.forEach(match => {
        [match.home, match.away].forEach(team => {
          if (!grouped[team]) grouped[team] = [];
          if (!grouped[team].find(m => m.match === match.match)) {
            grouped[team].push(match);
          }
        });
      });
      return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    }
    return [];
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Group by:
            </span>
            {['date', 'round', 'group', 'team'].map(filter => (
              <button
                key={filter}
                onClick={() => setFilterBy(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterBy === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                By {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Additional filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Rounds</option>
              {rounds.map(round => (
                <option key={round} value={round}>{round}</option>
              ))}
            </select>
            
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>Group {group}</option>
              ))}
            </select>
            
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Grouped matches */}
      <div className="space-y-6">
        {groupedMatches().map(([groupKey, groupMatches]) => (
          <div key={groupKey}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {filterBy === 'date' && (
                <>
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  {format(parseISO(groupKey), 'EEEE, MMMM d, yyyy')}
                </>
              )}
              {filterBy === 'round' && (
                <>
                  <Trophy className="w-5 h-5 text-purple-600" />
                  {groupKey}
                </>
              )}
              {filterBy === 'group' && (
                <>
                  <Grid3x3 className="w-5 h-5 text-green-600" />
                  {groupKey === 'Knockout' ? 'Knockout Stage' : `Group ${groupKey}`}
                </>
              )}
              {filterBy === 'team' && (
                <>
                  <Shield className="w-5 h-5 text-orange-600" />
                  {groupKey}
                </>
              )}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({groupMatches.length} matches)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMatches.map(match => (
                <MatchCard 
                  key={match.match} 
                  match={match} 
                  tournamentAssets={tournamentAssets}
                  markets={markets}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Knockout View Component (FotMob style)
const KnockoutView = ({ matches, tournamentAssets }) => {
  const knockoutMatches = matches.filter(m => m.round !== 'Group Stage');
  
  // Group matches by round
  const matchesByRound = {
    'Round of 16': knockoutMatches.filter(m => m.round === 'Round of 16'),
    'Quarterfinal': knockoutMatches.filter(m => m.round === 'Quarterfinal'),
    'Semifinal': knockoutMatches.filter(m => m.round === 'Semifinal'),
    'Final': knockoutMatches.filter(m => m.round === 'Final')
  };

  // Create bracket structure
  const createBracketPairs = (matches) => {
    const pairs = [];
    for (let i = 0; i < matches.length; i += 2) {
      pairs.push([matches[i], matches[i + 1] || null]);
    }
    return pairs;
  };

  return (
    <div className="space-y-8">
      {/* FotMob-style Visual Bracket */}
      <div className="bg-gray-900 dark:bg-black rounded-xl p-8 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header with trophy icon */}
          <div className="text-center mb-8">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white">FIFA Club World Cup 2025</h3>
            <p className="text-gray-400 mt-2">Knockout Stage</p>
          </div>

          {/* Bracket Grid */}
          <div className="grid grid-cols-7 gap-4">
            {/* Round of 16 - Left Side */}
            <div className="space-y-8">
              <div className="text-center mb-4">
                <h4 className="text-sm font-bold text-gray-400">ROUND OF 16</h4>
                <p className="text-xs text-gray-500">Jun 29</p>
              </div>
              {createBracketPairs(matchesByRound['Round of 16'].slice(0, 4)).map((pair, idx) => (
                <div key={`r16-left-${idx}`} className="space-y-2">
                  {pair.map((match, i) => match && (
                    <div key={match.match} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">Match {match.match}</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{match.home}</span>
                          {tournamentAssets?.team_logos?.[match.home] && (
                            <img src={tournamentAssets.team_logos[match.home]} alt="" className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{match.away}</span>
                          {tournamentAssets?.team_logos?.[match.away] && (
                            <img src={tournamentAssets.team_logos[match.away]} alt="" className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Quarterfinals - Left */}
            <div className="space-y-16 flex flex-col justify-center">
              <div className="text-center mb-4">
                <h4 className="text-sm font-bold text-gray-400">QUARTERFINALS</h4>
                <p className="text-xs text-gray-500">Jul 5</p>
              </div>
              {createBracketPairs(matchesByRound['Quarterfinal'].slice(0, 2)).map((pair, idx) => (
                <div key={`qf-left-${idx}`} className="space-y-2">
                  {pair.map((match, i) => match && (
                    <div key={match.match} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">QF{idx * 2 + i + 1}</div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-white">TBD</div>
                        <div className="text-sm font-medium text-white">TBD</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Semifinals */}
            <div className="flex flex-col justify-center">
              <div className="text-center mb-4">
                <h4 className="text-sm font-bold text-gray-400">SEMIFINALS</h4>
                <p className="text-xs text-gray-500">Jul 9-10</p>
              </div>
              <div className="space-y-32">
                {matchesByRound['Semifinal'].map((match, idx) => (
                  <div key={match.match} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500 transition-colors">
                    <div className="text-xs text-gray-400 mb-1">SF{idx + 1}</div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">TBD</div>
                      <div className="text-sm font-medium text-white">TBD</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{match.venue}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final */}
            <div className="flex flex-col justify-center">
              <div className="text-center mb-4">
                <h4 className="text-sm font-bold text-yellow-400">FINAL</h4>
                <p className="text-xs text-gray-500">Jul 13</p>
              </div>
              {matchesByRound['Final'].map((match) => (
                <div key={match.match} className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded-lg p-4 border-2 border-yellow-500">
                  <div className="text-center mb-3">
                    <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-white text-center">TBD</div>
                    <div className="text-xs text-yellow-400 text-center">vs</div>
                    <div className="text-sm font-bold text-white text-center">TBD</div>
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-3">
                    {match.venue}
                  </div>
                </div>
              ))}
            </div>

            {/* Semifinals - Right */}
            <div className="flex flex-col justify-center">
              <div className="space-y-32">
                {/* Placeholder for right side semifinals */}
              </div>
            </div>

            {/* Quarterfinals - Right */}
            <div className="space-y-16 flex flex-col justify-center">
              {createBracketPairs(matchesByRound['Quarterfinal'].slice(2, 4)).map((pair, idx) => (
                <div key={`qf-right-${idx}`} className="space-y-2">
                  {pair.map((match, i) => match && (
                    <div key={match.match} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">QF{idx * 2 + i + 3}</div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-white">TBD</div>
                        <div className="text-sm font-medium text-white">TBD</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Round of 16 - Right Side */}
            <div className="space-y-8">
              <div className="text-center mb-4">
                <h4 className="text-sm font-bold text-gray-400">ROUND OF 16</h4>
                <p className="text-xs text-gray-500">Jun 30 - Jul 2</p>
              </div>
              {createBracketPairs(matchesByRound['Round of 16'].slice(4, 8)).map((pair, idx) => (
                <div key={`r16-right-${idx}`} className="space-y-2">
                  {pair.map((match, i) => match && (
                    <div key={match.match} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">Match {match.match}</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{match.home}</span>
                          {tournamentAssets?.team_logos?.[match.home] && (
                            <img src={tournamentAssets.team_logos[match.home]} alt="" className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{match.away}</span>
                          {tournamentAssets?.team_logos?.[match.away] && (
                            <img src={tournamentAssets.team_logos[match.away]} alt="" className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">All times shown in Eastern Time (ET)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats View Component
const StatsView = ({ tournament, markets, participantCount }) => {
  const [topParticipants, setTopParticipants] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Fetch real leaderboard data
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournament.id}/leaderboard`);
        if (response.ok) {
          const data = await response.json();
          // Get top 5 participants with calculations
          const topFive = (data.leaderboard || []).slice(0, 5).map(player => ({
            username: player.username || player.twitter_username || `${player.user_address.substring(0, 8)}...`,
            predictions: player.total_predictions || 0,
            winRate: player.correct_predictions && player.total_predictions 
              ? Math.round((player.correct_predictions / player.total_predictions) * 100)
              : 0,
            profit: player.points || 0,
            rank: player.rank || 0
          }));
          setTopParticipants(topFive);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchLeaderboardData();
  }, [tournament.id]);
  
  // Calculate various stats
  const totalBetsPlaced = markets.reduce((sum, m) => sum + (m.totalBets || 0), 0);
  const totalVolume = markets.reduce((sum, m) => sum + (m.totalVolume || 0), 0);
  const avgBetSize = totalBetsPlaced > 0 ? totalVolume / totalBetsPlaced : 0;
  const activeMarkets = markets.filter(m => m.status === 'Active' || m.status === 'active').length;
  const resolvedMarkets = markets.filter(m => m.status === 'Resolved' || m.status === 'resolved').length;
  
  // Top markets by volume
  const topMarketsByVolume = [...markets]
    .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
    .slice(0, 5);
  
  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={Activity}
          title="Total Volume"
          value={`${totalVolume.toLocaleString()} APES`}
          subtitle="Across all markets"
          color="black"
        />
        <StatsCard 
          icon={TrendingUp}
          title="Active Markets"
          value={activeMarkets}
          subtitle={`${resolvedMarkets} resolved`}
          color="green"
        />
        <StatsCard 
          icon={Users}
          title="Total Predictions"
          value={totalBetsPlaced.toLocaleString()}
          subtitle={`Avg: ${avgBetSize.toFixed(0)} APES`}
          color="yellow"
        />
        <StatsCard 
          icon={Trophy}
          title="Prize Pool"
          value={`${tournament.prizePool.apes.toLocaleString()} APES`}
          subtitle={`+ ${tournament.prizePool.sol} SOL`}
          color="yellow"
        />
      </div>
      
      {/* Top Markets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top Markets by Volume
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
              (from escrow accounts)
            </span>
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {topMarketsByVolume.map((market, index) => (
              <div key={market.publicKey || index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center text-sm font-bold text-yellow-600 dark:text-yellow-400">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{market.question}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {market.participantCount || 0} participants
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {(market.totalVolume || 0).toLocaleString()} APES
                    {market.dataSource === 'escrow' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" title="Verified from escrow" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {market.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Top Predictors - Using Real Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Top Predictors
          </h3>
        </div>
        <div className="p-6">
          {loadingStats ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading leaderboard...</p>
            </div>
          ) : topParticipants.length > 0 ? (
            <div className="space-y-3">
              {topParticipants.map((participant, index) => (
                <div key={participant.username} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                      'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{participant.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {participant.predictions} predictions • {participant.winRate}% win rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {participant.profit} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No participants yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// News View Component
const NewsView = ({ tournament }) => {
  // Mock news data - in production, this would come from an API
  const newsItems = [
    {
      id: 1,
      title: 'Club World Cup 2025: Everything You Need to Know',
      excerpt: 'The expanded FIFA Club World Cup featuring 32 teams will kick off in Miami on June 14, 2025...',
      source: 'FIFA Official',
      time: '2 hours ago',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400'
    },
    {
      id: 2,
      title: 'Real Madrid and Manchester City Among Favorites',
      excerpt: 'European giants Real Madrid and Manchester City are leading the betting markets for the inaugural tournament...',
      source: 'ESPN FC',
      time: '5 hours ago',
      image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400'
    },
    {
      id: 3,
      title: 'Inter Miami to Host Opening Match with Messi',
      excerpt: 'Lionel Messi\'s Inter Miami will play the tournament opener at Hard Rock Stadium against Al Ahly...',
      source: 'The Athletic',
      time: '1 day ago',
      image: 'https://images.unsplash.com/photo-1606925842584-ffa79285b531?w=400'
    },
    {
      id: 4,
      title: 'Prize Money and Format Revealed',
      excerpt: 'FIFA announces record prize money for the Club World Cup with winners set to receive...',
      source: 'Goal.com',
      time: '2 days ago',
      image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400'
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Featured Article */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <img 
          src={newsItems[0].image} 
          alt={newsItems[0].title}
          className="w-full h-64 object-cover"
        />
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-blue-600 dark:text-blue-400">{newsItems[0].source}</span>
            <span>•</span>
            <span>{newsItems[0].time}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {newsItems[0].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {newsItems[0].excerpt}
          </p>
          <button className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
            Read more
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {newsItems.slice(1).map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span className="font-medium text-blue-600 dark:text-blue-400">{item.source}</span>
                <span>•</span>
                <span>{item.time}</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                {item.excerpt}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* External Links */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-4">External Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="https://www.fifa.com/tournaments/mens/clubworldcup/fifa-club-world-cup-2025" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <span className="font-medium text-gray-900 dark:text-white">Official FIFA Website</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
          <a 
            href="#" 
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <span className="font-medium text-gray-900 dark:text-white">Tournament Schedule</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
};

// Overview Component
const OverviewView = ({ tournament, markets, participantCount, recentJoiners, tournamentAssets }) => {
  const upcomingMatches = getUpcomingMatches();
  
  return (
    <div className="space-y-8">
      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          icon={Trophy}
          title="Prize Pool"
          value={`${tournament.prizePool.apes.toLocaleString()} APES`}
          subtitle={`+ ${tournament.prizePool.sol} SOL`}
          color="yellow"
        />
        <StatsCard 
          icon={Users}
          title="Participants"
          value={participantCount}
          subtitle={`of ${tournament.maxParticipants}`}
          color="black"
        />
        <StatsCard 
          icon={Target}
          title="Total Markets"
          value={tournament.totalMarkets}
          subtitle={`${markets.length} active`}
          color="green"
        />
        <StatsCard 
          icon={Calendar}
          title="Days to Start"
          value={Math.ceil((new Date(tournament.startDate) - new Date()) / (1000 * 60 * 60 * 24))}
          subtitle="Get ready!"
          color="yellow"
        />
      </div>
      
      {/* Upcoming Matches */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-yellow-600" />
              Upcoming Matches
            </span>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Next 10 matches
            </span>
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map(match => (
              <MatchCard 
                key={match.match} 
                match={match} 
                tournamentAssets={tournamentAssets}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Tournament Format */}
      {tournament.id === 'club-world-cup-2025' && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 rounded-xl p-6 border border-yellow-500/20">
          <h3 className="text-lg font-bold text-white mb-4">Tournament Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Group Stage</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• 8 groups of 4 teams</li>
                <li>• Round-robin format</li>
                <li>• Top 2 teams advance</li>
                <li>• 48 total matches</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Knockout Stage</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Round of 16</li>
                <li>• Quarterfinals</li>
                <li>• Semifinals</li>
                <li>• Final at MetLife Stadium</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Key Dates</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Starts: June 14, 2025</li>
                <li>• Group Stage: June 14-26</li>
                <li>• Knockouts: June 29 - July 13</li>
                <li>• Final: July 13, 2025</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Activity */}
      {recentJoiners.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <h3 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentJoiners.map((joiner, index) => (
              <span key={index} className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm">
                {joiner.username} joined
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Tournament Markets Component (from original)
const TournamentMarkets = ({ tournamentId }) => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadTournamentMarkets = async () => {
      try {
        // 🔥 FIX: Include resolved markets and check escrow for accurate volumes
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets?tournament_id=${tournamentId}&include_resolved=true&check_escrow=true`);
        if (response.ok) {
          const data = await response.json();
          setMarkets(data);
        } else {
          console.error('Failed to load tournament markets');
        }
      } catch (error) {
        console.error('Error loading tournament markets:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTournamentMarkets();
  }, [tournamentId]);
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading tournament markets...</p>
      </div>
    );
  }
  
  if (markets.length === 0) {
    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tournament Markets</h3>
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No markets deployed yet for this tournament</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Tournament Markets ({markets.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((market) => (
          <div 
            key={market.publicKey || market.market_address} 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6 cursor-pointer"
            onClick={() => navigate(`/markets/${market.publicKey || market.market_address}`)}
          >
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">{market.question}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{market.description}</p>
            
            <div className="space-y-2">
              {market.options?.map((option, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {market.optionPools && market.totalVolume > 0 
                      ? `${((market.optionPools[index] / market.totalVolume) * 100).toFixed(1)}%`
                      : '50%'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Volume</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {(market.totalVolume || 0).toLocaleString()} APES
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tournament Leaderboard Component (from original)
const TournamentLeaderboard = ({ tournamentId, participantCount, onJoinSuccess }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);
  const { publicKey } = useWallet();
  
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
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkUserStatus = async () => {
    try {
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/status/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.participating && data.rank) {
          setUserRank(data.rank);
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };
  
  const handleJoinTournament = async () => {
    // This would be handled by the parent component
    if (onJoinSuccess) {
      await onJoinSuccess();
      await loadLeaderboard();
      await checkUserStatus();
    }
  };
  
  const getBadgeForRank = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/20' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
    if (rank === 3) return { icon: Medal, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' };
    if (rank <= 10) return { icon: Star, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' };
    return null;
  };
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading leaderboard...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Leaderboard Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Tournament Leaderboard</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {participantCount} participants
        </div>
      </div>
      
      {/* User Rank Card */}
      {userRank && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-1">Your Ranking</h4>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">#{userRank}</div>
            </div>
            <Trophy className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      )}
      
      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Player</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Predictions</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboard.map((player, index) => {
              const badge = getBadgeForRank(index + 1);
              const isCurrentUser = publicKey && player.user_address === publicKey.toString();
              
              return (
                <tr 
                  key={player.user_address} 
                  className={`${isCurrentUser ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {badge ? (
                        <div className={`w-8 h-8 rounded-full ${badge.bg} flex items-center justify-center`}>
                          <badge.icon className={`w-4 h-4 ${badge.color}`} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {player.username || player.twitter_username || `${player.user_address.substring(0, 8)}...`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Joined {new Date(player.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                      {isCurrentUser && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{player.points.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{player.total_predictions || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {player.correct_predictions && player.total_predictions 
                        ? `${((player.correct_predictions / player.total_predictions) * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No participants yet. Be the first to join!</p>
          </div>
        )}
      </div>
      
      {/* Tournament Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700">
        <h4 className="font-bold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Tournament Rewards
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-yellow-800 dark:text-yellow-200">🥇 1st Place</div>
            <div className="text-yellow-700 dark:text-yellow-300">30% of prize pool</div>
          </div>
          <div>
            <div className="font-medium text-yellow-800 dark:text-yellow-200">🥈 2nd Place</div>
            <div className="text-yellow-700 dark:text-yellow-300">20% of prize pool</div>
          </div>
          <div>
            <div className="font-medium text-yellow-800 dark:text-yellow-200">🥉 3rd Place</div>
            <div className="text-yellow-700 dark:text-yellow-300">15% of prize pool</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-700">
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
  const [tournamentAssets, setTournamentAssets] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [recentJoiners, setRecentJoiners] = useState([]);
  const [participating, setParticipating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [markets, setMarkets] = useState([]);
  
  // Check if user is admin
  const isAdmin = publicKey && isWalletAuthorized(publicKey.toString());

  // Helper function to get team colors for banner
  const getTeamColor = (teamName) => {
    const colors = {
      // Group A
      'Al Ahly': 'from-red-600 to-red-800',
      'Inter Miami': 'from-pink-500 to-pink-700',
      'Palmeiras': 'from-green-600 to-green-800',
      'Porto': 'from-blue-600 to-blue-800',
      // Group B
      'Paris Saint-Germain': 'from-blue-800 to-red-600',
      'Atletico Madrid': 'from-red-600 to-white/20',
      'Botafogo': 'from-gray-800 to-gray-600',
      'Seattle Sounders': 'from-green-700 to-blue-600',
      // Group C
      'Bayern Munich': 'from-red-700 to-gray-800',
      'Auckland City': 'from-blue-500 to-yellow-500',
      'Boca Juniors': 'from-blue-800 to-yellow-600',
      'Benfica': 'from-red-700 to-gray-700',
      // Group D
      'Chelsea': 'from-blue-700 to-blue-900',
      'LAFC': 'from-gray-900 to-yellow-600',
      'Flamengo': 'from-red-700 to-black',
      'Espérance': 'from-red-600 to-yellow-600',
      // Group E
      'River Plate': 'from-white/20 to-red-600',
      'Urawa Red Diamonds': 'from-red-600 to-gray-800',
      'Monterrey': 'from-blue-800 to-white/20',
      'Internazionale': 'from-blue-900 to-black',
      // Group F
      'Fluminense': 'from-green-700 to-red-700',
      'Borussia Dortmund': 'from-yellow-500 to-black',
      'Ulsan HD': 'from-blue-600 to-yellow-500',
      'Mamelodi Sundowns': 'from-yellow-500 to-green-700',
      // Group G
      'Manchester City': 'from-sky-500 to-sky-700',
      'Wydad AC': 'from-red-600 to-white/20',
      'Al Ain': 'from-purple-700 to-white/20',
      'Juventus': 'from-white/20 to-black',
      // Group H
      'Real Madrid': 'from-white/30 to-purple-800',
      'Al Hilal': 'from-blue-600 to-white/20',
      'Pachuca': 'from-blue-700 to-white/20',
      'Salzburg': 'from-red-600 to-white/20'
    };
    
    return colors[teamName] || 'from-gray-600 to-gray-800';
  };

  useEffect(() => {
    const loadAllData = async () => {
      const assets = await loadTournamentAssets();
      await loadTournamentData(assets);
      await loadTournamentMarkets();
    };
    loadAllData();
  }, [tournamentId]);

  // Function to create tournament object with current participant count
  const createTournamentObject = (currentParticipantCount, loadedAssets = null) => {
    const defaultBanner = tournamentId === 'nba-finals-2025' 
      ? 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2059&q=80'
      : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80';
    
    // Use loaded assets if available, otherwise check state, then defaults
    const assets = loadedAssets || tournamentAssets;
    const banner = assets?.assets?.banner || defaultBanner;
    const icon = assets?.assets?.icon || defaultBanner;
    
    if (tournamentId === 'club-world-cup-2025') {
      return {
        id: 'club-world-cup-2025',
        name: 'FIFA Club World Cup 2025',
        description: 'The ultimate club football championship featuring 32 teams from around the world',
        banner: banner,
        icon: icon,
        startDate: '2025-06-14',
        endDate: '2025-07-13',
        totalMarkets: 63,
        prizePool: {
          apes: 1000000,
          sol: 3
        },
        participants: currentParticipantCount,
        maxParticipants: 1000,
        type: 'football',
        earlyBirdBonus: 100,
        joinReward: 50
      };
    } else if (tournamentId === 'nba-finals-2025') {
      return {
        id: 'nba-finals-2025',
        name: 'NBA Finals 2025',
        description: 'The championship series of the National Basketball Association',
        banner: banner,
        icon: icon,
        startDate: '2025-06-05',
        endDate: '2025-06-22',
        totalMarkets: 7,
        prizePool: {
          apes: 500000,
          sol: 1.5
        },
        participants: currentParticipantCount,
        maxParticipants: 500,
        type: 'basketball',
        earlyBirdBonus: 50,
        joinReward: 25
      };
    }
    return null;
  };

  const loadTournamentAssets = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/tournaments/${tournamentId}/details`);
      
      if (response.ok) {
        const data = await response.json();
        const assets = {
          assets: data.assets || {},
          team_logos: data.team_logos || {},
          match_banners: data.match_banners || {}
        };
        setTournamentAssets(assets);
        return assets;
      }
    } catch (error) {
      console.error('Error loading tournament assets:', error);
    }
    return null;
  };

  const loadTournamentData = async (loadedAssets) => {
    setLoading(true);
    
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`https://apes-production.up.railway.app/api/tournaments/${tournamentId}/leaderboard?t=${cacheBuster}`);
      
      if (response.ok) {
        const data = await response.json();
        const newParticipantCount = data.totalParticipants || data.leaderboard?.length || 0;
        
        setParticipantCount(newParticipantCount);
        
        // Get recent joiners
        const recentJoiners = (data.leaderboard || [])
          .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))
          .slice(0, 3)
          .map(user => ({
            username: user.username || user.twitter_username || `${user.user_address.substring(0, 8)}...`,
            joinedAt: user.joined_at
          }));
        setRecentJoiners(recentJoiners);
        
        const tournamentData = createTournamentObject(newParticipantCount, loadedAssets);
        if (tournamentData) {
          setTournament(tournamentData);
        }
      } else {
        const fallbackTournament = createTournamentObject(0, loadedAssets);
        if (fallbackTournament) {
          setTournament(fallbackTournament);
        }
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
      const fallbackTournament = createTournamentObject(0, loadedAssets);
      if (fallbackTournament) {
        setTournament(fallbackTournament);
      }
    }
    
    setLoading(false);
  };

  const loadTournamentMarkets = async () => {
    try {
      // 🔥 FIX: Include resolved markets and check escrow for accurate volumes
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets?tournament_id=${tournamentId}&include_resolved=true&check_escrow=true`);
      if (response.ok) {
        const data = await response.json();
        setMarkets(data);
      }
    } catch (error) {
      console.error('Error loading tournament markets:', error);
    }
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

  // Handle join tournament
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
        setParticipating(true);
        
        // Award engagement points
        let totalPointsEarned = 50;
        
        try {
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
            console.log('✅ Tournament points awarded');
          }
          
          // Early bird bonus
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
              totalPointsEarned = 150;
            }
          }
        } catch (pointsError) {
          console.error('Error awarding points:', pointsError);
        }
        
        await loadTournamentData();
        
        alert(`🎉 Successfully joined tournament!\n💰 Earned ${totalPointsEarned} APES points`);
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('❌ Failed to join tournament. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (tournament && publicKey) {
      checkUserParticipation();
    }
  }, [tournament, publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading tournament...</p>
        </div>
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
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* OpenGraph Meta Tags */}
      {tournamentId === 'club-world-cup-2025' && (
        <Helmet>
          <title>FIFA Club World Cup 2025 - PRIMAPE Markets</title>
          <meta name="description" content="Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! The ultimate club football championship featuring 32 teams from around the world." />
          
          {/* OpenGraph tags */}
          <meta property="og:title" content="FIFA Club World Cup 2025 - PRIMAPE Markets" />
          <meta property="og:description" content="Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! The ultimate club football championship featuring 32 teams from around the world." />
          <meta property="og:image" content="https://i0.wp.com/financefootball.com/wp-content/uploads/2024/12/fifa_club_world_cup_2025.jpg?fit=1366%2C768&ssl=1" />
          <meta property="og:image:width" content="1366" />
          <meta property="og:image:height" content="768" />
          <meta property="og:image:alt" content="FIFA Club World Cup 2025 - All 32 Teams" />
          <meta property="og:url" content="https://apes.primape.app/tournaments/club-world-cup-2025" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="PRIMAPE Markets" />
          
          {/* Twitter Card tags */}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:title" content="FIFA Club World Cup 2025 - PRIMAPE Markets" />
          <meta property="twitter:description" content="Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes!" />
          <meta property="twitter:image" content="https://i0.wp.com/financefootball.com/wp-content/uploads/2024/12/fifa_club_world_cup_2025.jpg?fit=1366%2C768&ssl=1" />
          <meta property="twitter:site" content="@PRIMAPE_APP" />
          <meta property="twitter:creator" content="@PRIMAPE_APP" />
        </Helmet>
      )}

      {/* Tournament Header */}
      <div className="relative bg-white dark:bg-gray-800 shadow-sm">
        {tournamentId === 'club-world-cup-2025' ? (
          // Custom Club World Cup Banner with Groups
          <div className="relative bg-black overflow-hidden">
            {/* Background pattern */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #fbbf24,
                  #fbbf24 10px,
                  transparent 10px,
                  transparent 20px
                )`
              }}
            />
            
            {/* Content */}
            <div className="relative p-6 md:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">FIFA CLUB</h1>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">WORLD CUP 2025™</h2>
              </div>
              
              {/* Groups Grid - Production Style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
                {Object.entries(CLUB_WC_GROUPS).map(([groupLetter, group]) => (
                  <div key={groupLetter}>
                    {/* Group Header */}
                    <div className="text-center mb-3">
                      <h3 className="text-white text-sm font-black tracking-wider">GROUP {groupLetter}</h3>
                    </div>
                    
                    {/* Teams Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {group.teams.map((team) => {
                        // Define team colors/styles for visual distinction
                        const teamInitials = team.split(' ').map(word => word[0]).join('').substring(0, 3);
                        const teamColor = getTeamColor(team);
                        
                        return (
                          <div key={team} className="relative group cursor-pointer">
                            <div className={`
                              aspect-square rounded-lg p-2 
                              bg-gradient-to-br ${teamColor} 
                              hover:scale-110 transition-transform duration-200
                              flex items-center justify-center
                              border border-gray-700 hover:border-yellow-500
                            `}>
                              {tournamentAssets?.team_logos?.[team] ? (
                                <img 
                                  src={tournamentAssets.team_logos[team]} 
                                  alt={team}
                                  className="w-full h-full object-contain p-1"
                                  title={team}
                                />
                              ) : (
                                <div className="text-center">
                                  <div className="text-white font-bold text-sm md:text-base">
                                    {teamInitials}
                                  </div>
                                  <div className="text-white/70 text-[8px] md:text-[10px] mt-0.5 font-medium">
                                    {team.split(' ')[0]}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Team name tooltip */}
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 
                              bg-gray-900 text-white text-xs px-2 py-1 rounded 
                              opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {team}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Bottom Section */}
              <div className="text-center">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              </div>
            </div>
            
            {/* Navigation and description overlay */}
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent">
              <div className="p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                  <button 
                    onClick={() => navigate('/tournaments')}
                    className="mb-4 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tournaments
                  </button>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{tournament.name}</h1>
                  <p className="text-white/90 text-lg max-w-3xl">{tournament.description}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Default banner for other tournaments
          <>
            <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
              <img 
                src={tournament.banner} 
                alt={tournament.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="max-w-7xl mx-auto">
                <button 
                  onClick={() => navigate('/tournaments')}
                  className="mb-4 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Tournaments
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{tournament.name}</h1>
                <p className="text-white/90 text-lg max-w-3xl">{tournament.description}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-900 dark:bg-black border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-white">
                  {tournament.prizePool.apes.toLocaleString()} APES + {tournament.prizePool.sol} SOL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-white">
                  {participantCount}/{tournament.maxParticipants} participants
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-white">
                  Starts {format(parseISO(tournament.startDate), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            
            {/* Join Button */}
            {connected && publicKey && !participating && (
              <button
                onClick={handleJoinTournament}
                disabled={joining}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Join Tournament
                  </>
                )}
              </button>
            )}
            {connected && publicKey && participating && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Joined</span>
              </div>
            )}
            {!connected && (
              <span className="text-sm text-gray-400">
                Connect wallet to join
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Admin Panel - Only show for admins */}
      {isAdmin && tournamentId === 'club-world-cup-2025' && (
        <div className="bg-yellow-900/20 border-b border-yellow-600/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-200">Admin Tools</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Admin Dashboard
                </button>
                <button
                  onClick={() => navigate('/admin/tournament')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Tournament
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} tournamentId={tournamentId} />

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewView 
            tournament={tournament} 
            markets={markets}
            participantCount={participantCount}
            recentJoiners={recentJoiners}
            tournamentAssets={tournamentAssets}
          />
        )}
        
        {activeTab === 'table' && tournamentId === 'club-world-cup-2025' && (
          <TableView groups={CLUB_WC_GROUPS} tournamentAssets={tournamentAssets} markets={markets} />
        )}
        
        {activeTab === 'knockout' && tournamentId === 'club-world-cup-2025' && (
          <KnockoutView matches={CLUB_WC_ALL_MATCHES} tournamentAssets={tournamentAssets} />
        )}
        
        {activeTab === 'matches' && (
          <MatchesView 
            matches={tournamentId === 'club-world-cup-2025' ? CLUB_WC_ALL_MATCHES : NBA_FINALS_SERIES.games}
            tournamentAssets={tournamentAssets}
            tournamentId={tournamentId}
            markets={markets}
          />
        )}
        
        {activeTab === 'stats' && (
          <StatsView tournament={tournament} markets={markets} participantCount={participantCount} />
        )}
        
        {activeTab === 'news' && (
          <NewsView tournament={tournament} />
        )}
        
        {activeTab === 'markets' && (
          <TournamentMarkets tournamentId={tournament.id} />
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