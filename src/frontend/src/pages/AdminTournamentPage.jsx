import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Play,
  Check,
  AlertTriangle,
  Download,
  Upload,
  Settings,
  Eye,
  Zap,
  X,
  Image,
  Palette,
  Save,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Shield,
  Filter
} from 'lucide-react';
import {
  formatCompactNumber,
  formatSOL,
  formatDate
} from '../utils/formatters';
import { CLUB_WC_MATCHES } from '../constants/worldCupMatches';
import { TEAM_LOGOS } from '../constants/teamLogos';
import marketService from '../services/marketService';
import { isWalletAuthorized } from '../config/access';
import { useNavigate } from 'react-router-dom';

// FIFA Club World Cup 2025 - Complete Tournament Structure (63 matches)
const CLUB_WC_MATCHES = [
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

const AdminTournamentPage = () => {
  const navigate = useNavigate();
  const { publicKey, connected, wallet } = useWallet();
  
  // Get the actual Phantom wallet with signAndSendTransaction method
  const phantomWallet = window.phantom?.solana;
  
  // Authorization check
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    if (publicKey) {
      const walletAddress = publicKey.toString();
      const authorized = isWalletAuthorized(walletAddress);
      setIsAuthorized(authorized);
      
      if (!authorized) {
        console.log('❌ Unauthorized wallet attempted to access admin tournament page:', walletAddress);
      }
    } else {
      setIsAuthorized(false);
    }
  }, [publicKey]);
  
  const [deploymentStatus, setDeploymentStatus] = useState({});
  const [selectedMatches, setSelectedMatches] = useState(new Set());
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResults, setDeploymentResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMatch, setPreviewMatch] = useState(null);
  const [showAssetManager, setShowAssetManager] = useState(false);
  const [filterGroup, setFilterGroup] = useState('all');
  const [prizePool, setPrizePool] = useState(50000);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  
  // Initialize market service when wallet connects
  useEffect(() => {
    if (serviceInitialized) {
      console.log('🔄 MarketService already initialized for tournament page');
      return;
    }

    const initService = async () => {
      if (wallet && publicKey && connected && phantomWallet) {
        try {
          if (typeof phantomWallet.signAndSendTransaction !== 'function') {
            console.log('⚠️ Phantom wallet missing signAndSendTransaction method');
            setServiceInitialized(false);
            return;
          }
          
          console.log('🚀 Initializing MarketService for tournament deployment');
          await marketService.initialize(phantomWallet);
          setServiceInitialized(true);
          console.log('✅ MarketService initialized for tournament page');
        } catch (error) {
          console.error('❌ Failed to initialize market service:', error);
          setServiceInitialized(false);
        }
      }
    };

    initService();
  }, [wallet, publicKey, connected, phantomWallet, serviceInitialized]);
  
  // Default tournament assets
  const defaultTournamentAssets = {
    banner: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80',
    icon: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80',
    teamLogos: {},
    matchBanners: {}
  };
  
  const [tournamentAssets, setTournamentAssets] = useState(defaultTournamentAssets);
  const [loadingAssets, setLoadingAssets] = useState(true);
  
  const TOURNAMENT_ID = 'club-world-cup-2025';

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'R16', 'QF', 'SF', 'F'];
  
  const filteredMatches = filterGroup === 'all' 
    ? CLUB_WC_MATCHES 
    : CLUB_WC_MATCHES.filter(match => match.group === filterGroup);

  // Load tournament assets from API on mount
  useEffect(() => {
    const loadTournamentAssets = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/tournaments/${TOURNAMENT_ID}/details`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Parse JSONB fields
          const assets = data.assets || {};
          const teamLogos = data.team_logos || {};
          const matchBanners = data.match_banners || {};
          
          setTournamentAssets({
            banner: assets.banner || defaultTournamentAssets.banner,
            icon: assets.icon || defaultTournamentAssets.icon,
            teamLogos: teamLogos,
            matchBanners: matchBanners
          });
          
          console.log('✅ Loaded tournament assets from database');
        } else {
          console.log('ℹ️ No tournament data found, using defaults');
        }
      } catch (error) {
        console.error('Error loading tournament assets:', error);
      } finally {
        setLoadingAssets(false);
      }
    };

    loadTournamentAssets();
  }, []);

  const handleSelectAll = () => {
    if (selectedMatches.size === filteredMatches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(filteredMatches.map(m => m.match)));
    }
  };

  const handleSelectMatch = (matchId) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else {
      newSelected.add(matchId);
    }
    setSelectedMatches(newSelected);
  };

  // Time zone conversion utility with 5-minute buffer
  const convertToUTC = (date, time, timezone) => {
    const timezoneOffsets = {
      'ET': -5,  // Eastern Time
      'PT': -8,  // Pacific Time
      'CT': -6,  // Central Time
      'MT': -7   // Mountain Time
    };
    
    // Add 5-minute buffer before match start to ensure betting stops
    const bufferMinutes = 5;
    
    // Create date object in local time
    const matchDateTime = new Date(`${date}T${time}:00`);
    const offsetHours = timezoneOffsets[timezone] || 0;
    
    // Adjust for timezone
    matchDateTime.setHours(matchDateTime.getHours() - offsetHours);
    // Subtract buffer to close betting early
    matchDateTime.setMinutes(matchDateTime.getMinutes() - bufferMinutes);
    
    console.log(`⏰ Match time conversion: ${date} ${time} ${timezone} → ${matchDateTime.toISOString()} (includes 5min buffer)`);
    return matchDateTime.toISOString();
  };

  // Check for duplicate markets before deployment
  const checkForDuplicates = async (selectedMatchIds) => {
    const duplicates = [];
    
    for (const matchId of selectedMatchIds) {
      const match = CLUB_WC_MATCHES.find(m => m.match === matchId);
      if (!match) continue;
      
      const question = `${match.home} - ${match.away}`;
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets/check-duplicate?` +
          `question=${encodeURIComponent(question)}&tournament_id=${TOURNAMENT_ID}`
        );
        
        const data = await response.json();
        
        if (data.exists) {
          duplicates.push({
            matchId,
            question,
            match: match,
            existingMarket: data.market
          });
        }
      } catch (error) {
        console.error(`Error checking duplicate for match ${matchId}:`, error);
      }
    }
    
    return duplicates;
  };

  const handleDeploySelectedMarkets = async () => {
    if (!connected || selectedMatches.size === 0) return;
    
    if (!serviceInitialized) {
      alert('Market service not initialized. Please reconnect your wallet.');
      return;
    }

    // Check for duplicates first
    console.log('🔍 Checking for duplicate markets...');
    const duplicates = await checkForDuplicates(selectedMatches);
    
    if (duplicates.length > 0) {
      const duplicateList = duplicates.map(d => 
        `• Match #${d.matchId}: ${d.question} (Market: ${d.existingMarket.market_address})`
      ).join('\n');
      
      const proceed = confirm(
        `⚠️ DUPLICATE MARKETS DETECTED!\n\n` +
        `The following ${duplicates.length} markets already exist:\n\n${duplicateList}\n\n` +
        `These will be skipped. Continue with the remaining ${selectedMatches.size - duplicates.length} markets?`
      );
      
      if (!proceed) {
        return;
      }
      
      // Remove duplicates from selection
      duplicates.forEach(d => selectedMatches.delete(d.matchId));
    }

    setIsDeploying(true);
    const results = [];

    for (const matchId of selectedMatches) {
      const match = CLUB_WC_MATCHES.find(m => m.match === matchId);
      if (!match) continue;

      try {
        // Create market data using tournament assets and match-specific banner
        const matchBanner = tournamentAssets.matchBanners[match.match] || tournamentAssets.banner;
        const isGroupStage = match.round === 'Group Stage';
        
        // Group stage matches can have draws, knockout matches cannot
        const options = isGroupStage 
          ? [match.home, 'Draw', match.away]
          : [match.home, match.away];
          
        const optionsMetadata = isGroupStage
          ? [
              { label: match.home, icon: tournamentAssets.teamLogos[match.home] || null },
              { label: 'Draw', icon: null },
              { label: match.away, icon: tournamentAssets.teamLogos[match.away] || null }
            ]
          : [
              { label: match.home, icon: tournamentAssets.teamLogos[match.home] || null },
              { label: match.away, icon: tournamentAssets.teamLogos[match.away] || null }
            ];

        const question = `${match.home} - ${match.away}`;
        const resolutionDate = new Date(convertToUTC(match.date, match.time, match.timezone));
        
        console.log('🚀 Deploying market on-chain:', {
          question,
          options,
          resolutionDate: resolutionDate.toISOString(),
          optionCount: options.length
        });

        // Deploy market on-chain using marketService
        const createResult = await marketService.createMarket({
          question: question,
          options: options,
          actualOptionCount: options.length,
          category: 'Sports',
          resolutionDate: resolutionDate,
          creatorFeeRate: 250, // 2.5% for tournament markets
          minBetAmount: 10,
          creatorStakeAmount: 10 // Admin deployment with minimal stake
        });

        if (createResult.success && createResult.marketPubkey) {
          console.log('✅ Market deployed on-chain:', createResult.marketPubkey);
          
          // Now save to database with all metadata
          const marketData = {
            market_address: createResult.marketPubkey,
            creator_address: publicKey.toString(),
            question: question,
            description: `Club World Cup 2025 - ${match.round} ${match.group !== 'A' && match.group !== 'B' && match.group !== 'C' && match.group !== 'D' && match.group !== 'E' && match.group !== 'F' && match.group !== 'G' && match.group !== 'H' ? '' : `Group ${match.group}`} match between ${match.home} and ${match.away} at ${match.venue} on ${match.date}`,
            options: options,
            category: 'Sports',
            tournament_type: 'tournament',
            tournament_id: TOURNAMENT_ID,
            end_time: resolutionDate.toISOString(),
            resolution_date: resolutionDate.toISOString(),
            min_bet: 10,
            status: 'Active',
            transaction_hash: createResult.transaction,
            assets: {
              banner: matchBanner,
              icon: tournamentAssets.icon
            },
            options_metadata: optionsMetadata,
            // Additional metadata for display
            matchMetadata: {
              matchNumber: match.match,
              round: match.round,
              group: match.group,
              venue: match.venue,
              localTime: `${match.time} ${match.timezone}`,
              utcEndTime: resolutionDate.toISOString()
            }
          };

          console.log('💾 Saving market to database:', marketData);

          // Save to database
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/markets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Wallet-Address': publicKey.toString()
            },
            body: JSON.stringify(marketData)
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Market saved to database:', responseData);
            
            const optionCount = isGroupStage ? '3 options (w/ Draw)' : '2 options (Knockout)';
            results.push({
              matchId,
              match: `${match.home} - ${match.away}`,
              status: 'success',
              message: `Market deployed on-chain (${optionCount}) at ${createResult.marketPubkey}`,
              marketAddress: createResult.marketPubkey
            });
            setDeploymentStatus(prev => ({ ...prev, [matchId]: 'success' }));
          } else {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
            console.error('❌ Failed to save to database:', errorMessage, errorData);
            
            // Market deployed on-chain but failed to save to DB
            results.push({
              matchId,
              match: `${match.home} - ${match.away}`,
              status: 'warning',
              message: `Market deployed on-chain at ${createResult.marketPubkey} but failed to save to database: ${errorMessage}`,
              marketAddress: createResult.marketPubkey
            });
            setDeploymentStatus(prev => ({ ...prev, [matchId]: 'warning' }));
          }
        } else {
          throw new Error(createResult.error || 'Failed to deploy market on-chain');
        }
      } catch (error) {
        console.error('❌ Error deploying market:', error);
        results.push({
          matchId,
          match: `${match.home} - ${match.away}`,
          status: 'error',
          message: error.message
        });
        setDeploymentStatus(prev => ({ ...prev, [matchId]: 'error' }));
      }

      // Add delay between deployments
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setDeploymentResults(results);
    setIsDeploying(false);
    setSelectedMatches(new Set()); // Clear selection
  };

  const handlePreviewMarket = (match) => {
    setPreviewMatch(match);
    setShowPreview(true);
  };

  const getMatchStatus = (matchId) => {
    return deploymentStatus[matchId] || 'pending';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleAssetUpdate = (type, value) => {
    setTournamentAssets(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleTeamLogoUpdate = (teamName, logoUrl) => {
    setTournamentAssets(prev => ({
      ...prev,
      teamLogos: {
        ...prev.teamLogos,
        [teamName]: logoUrl
      }
    }));
  };

  const handleMatchBannerUpdate = (matchId, bannerUrl) => {
    setTournamentAssets(prev => ({
      ...prev,
      matchBanners: {
        ...prev.matchBanners,
        [matchId]: bannerUrl
      }
    }));
  };

  const bulkUpdateMatchBanners = (bannerUrl, matchIds) => {
    const updates = {};
    matchIds.forEach(id => {
      updates[id] = bannerUrl;
    });
    setTournamentAssets(prev => ({
      ...prev,
      matchBanners: {
        ...prev.matchBanners,
        ...updates
      }
    }));
  };

  const saveAssets = async () => {
    if (!publicKey) {
      alert('Please connect your wallet to save assets.');
      return;
    }

    try {
      console.log('💾 Saving tournament assets...');
      
      const apiUrl = `${import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app'}/api/tournaments/${TOURNAMENT_ID}/assets`;
      console.log('📍 API URL:', apiUrl);
      
      const payload = {
        assets: {
          banner: tournamentAssets.banner,
          icon: tournamentAssets.icon
        },
        team_logos: tournamentAssets.teamLogos,
        match_banners: tournamentAssets.matchBanners
      };
      
      console.log('📦 Payload:', payload);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Assets saved successfully:', responseData);
        
        const customBannerCount = Object.keys(tournamentAssets.matchBanners).length;
        alert(`Tournament assets saved successfully!\n\n✓ Default banner: Set\n✓ Tournament icon: Set\n✓ Team logos: ${Object.keys(tournamentAssets.teamLogos).length} configured\n✓ Custom match banners: ${customBannerCount} of ${CLUB_WC_MATCHES.length} matches\n\nMatches without custom banners will use the default tournament banner.\n\nAssets are saved to the database and visible across the platform.`);
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        console.error('❌ Save assets failed:', errorMessage, errorData);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving assets:', error);
      alert(`Failed to save assets: ${error.message}`);
    }
  };

  // Show unauthorized message if wallet is connected but not authorized
  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your wallet <span className="font-mono text-sm">{publicKey.toString()}</span> is not authorized to access tournament admin features.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Only authorized admin wallets can manage tournaments.
              </p>
              <button
                onClick={() => navigate('/tournaments')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Back to Tournaments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access tournament admin features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Club World Cup 2025 - Tournament Admin
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Deploy and manage prediction markets for FIFA Club World Cup 2025 matches. Complete tournament with 32 teams, 63 matches from group stage to final.
          </p>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 dark:text-blue-400">ℹ️</div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Market Types:</strong> Group stage matches include <strong>Draw</strong> option (3 choices). Knockout matches are winner-only (2 choices) since they go to extra time/penalties if needed.
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">Tournament Dates</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Jun 14 - Jul 13, 2025
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">Prize Pool</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {prizePool.toLocaleString()} APES
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-purple-500" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">Total Matches</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {CLUB_WC_MATCHES.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-6 h-6 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">Deployed</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {Object.values(deploymentStatus).filter(s => s === 'success').length}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              >
                {groups.map(group => (
                  <option key={group} value={group}>
                    {group === 'all' ? 'All Matches' : 
                     group === 'R16' ? 'Round of 16' :
                     group === 'QF' ? 'Quarterfinals' :
                     group === 'SF' ? 'Semifinals' :
                     group === 'F' ? 'Final' :
                     `Group ${group}`}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {selectedMatches.size === filteredMatches.length ? 'Deselect All' : 'Select All'}
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedMatches.size} selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAssetManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Image className="w-4 h-4" />
                Asset Manager
              </button>

              <button
                onClick={handleDeploySelectedMarkets}
                disabled={!connected || selectedMatches.size === 0 || isDeploying}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Deploy Markets ({selectedMatches.size})
                  </>
                )}
              </button>
            </div>
          </div>

          {!connected && (
            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-yellow-800 dark:text-yellow-300">
                  Please connect your wallet to deploy markets
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Matches Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedMatches.size === filteredMatches.length && filteredMatches.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Round
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Teams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMatches.map((match) => (
                  <tr key={match.match} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedMatches.has(match.match)}
                        onChange={() => handleSelectMatch(match.match)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                          #{match.match}
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs">
                          {match.group === 'F' ? 'Final' : match.group === 'SF' ? 'Semi' : match.group === 'QF' ? 'Quarter' : match.group === 'R16' ? 'R16' : `Group ${match.group}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {match.round}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {match.home} - {match.away}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {match.round === 'Group Stage' && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            ⚽ 3 options (w/ Draw)
                          </div>
                        )}
                        {match.round !== 'Group Stage' && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            ⚡ 2 options (Knockout)
                          </div>
                        )}
                        {tournamentAssets.matchBanners[match.match] && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            🎨 Custom banner
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {match.date}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {match.time} {match.timezone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {match.venue}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(getMatchStatus(match.match))}
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {getMatchStatus(match.match)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handlePreviewMarket(match)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deployment Results */}
        {deploymentResults.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Deployment Results
            </h3>
            <div className="space-y-2">
              {deploymentResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {result.match}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    result.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Market Preview: {previewMatch.home} vs {previewMatch.away}
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

                             <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <img
                    src={tournamentAssets.matchBanners[previewMatch.match] || tournamentAssets.banner}
                    alt="Match Banner"
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  {tournamentAssets.matchBanners[previewMatch.match] && (
                    <div className="text-xs text-green-600 dark:text-green-400 mb-2">
                      ✓ Using custom match banner
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">{previewMatch.home}</div>
                      {tournamentAssets.teamLogos[previewMatch.home] && (
                        <img
                          src={tournamentAssets.teamLogos[previewMatch.home]}
                          alt={previewMatch.home}
                          className="w-16 h-16 mx-auto mt-2 rounded-lg"
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">{previewMatch.away}</div>
                      {tournamentAssets.teamLogos[previewMatch.away] && (
                        <img
                          src={tournamentAssets.teamLogos[previewMatch.away]}
                          alt={previewMatch.away}
                          className="w-16 h-16 mx-auto mt-2 rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Round:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{previewMatch.round}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Group:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {previewMatch.group === 'F' ? 'Final' : previewMatch.group === 'SF' ? 'Semifinal' : previewMatch.group === 'QF' ? 'Quarterfinal' : previewMatch.group === 'R16' ? 'Round of 16' : `Group ${previewMatch.group}`}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{previewMatch.date}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{previewMatch.time} {previewMatch.timezone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Venue:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{previewMatch.venue}</span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Market Question:</h4>
                  <p className="text-blue-800 dark:text-blue-200 font-medium">{previewMatch.home} - {previewMatch.away}</p>
                  
                  <div className="mt-3">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">Betting Options:</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {tournamentAssets.teamLogos[previewMatch.home] && (
                          <img src={tournamentAssets.teamLogos[previewMatch.home]} alt={previewMatch.home} className="w-4 h-4 rounded" />
                        )}
                        <span className="text-blue-700 dark:text-blue-300">{previewMatch.home}</span>
                      </div>
                      {previewMatch.round === 'Group Stage' && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">=</span>
                          </div>
                          <span className="text-blue-700 dark:text-blue-300">Draw</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {tournamentAssets.teamLogos[previewMatch.away] && (
                          <img src={tournamentAssets.teamLogos[previewMatch.away]} alt={previewMatch.away} className="w-4 h-4 rounded" />
                        )}
                        <span className="text-blue-700 dark:text-blue-300">{previewMatch.away}</span>
                      </div>
                    </div>
                  </div>
                  
                  {previewMatch.round === 'Group Stage' ? (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      ✓ Group stage match - includes Draw option
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      ⚡ Knockout match - winner decided (extra time/penalties if needed)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Asset Manager Modal */}
        {showAssetManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Tournament Asset Manager
                </h3>
                <button
                  onClick={() => setShowAssetManager(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

                             <div className="space-y-6">
                {/* Tournament Banner */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Tournament Banner
                  </label>
                  <div className="flex gap-4">
                    <img
                      src={tournamentAssets.banner}
                      alt="Tournament Banner"
                      className="w-32 h-20 object-cover rounded-lg border"
                    />
                    <div className="flex-1">
                      <input
                        type="url"
                        value={tournamentAssets.banner}
                        onChange={(e) => handleAssetUpdate('banner', e.target.value)}
                        placeholder="Enter default banner image URL"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Used as fallback when no custom match banner is set
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tournament Icon */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tournament Icon
                  </label>
                  <div className="flex gap-4">
                    <img
                      src={tournamentAssets.icon}
                      alt="Tournament Icon"
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <div className="flex-1">
                      <input
                        type="url"
                        value={tournamentAssets.icon}
                        onChange={(e) => handleAssetUpdate('icon', e.target.value)}
                        placeholder="Enter icon image URL"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Match Banners */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Individual Match Banners
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Configure unique banners for each match. Each match will use its custom banner or fall back to the default tournament banner.
                      </div>
                      
                      {/* Bulk Operations */}
                      <div className="bg-white dark:bg-gray-600 rounded-lg p-3 mb-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bulk Operations</div>
                        <div className="flex gap-2 flex-wrap">
                          {['Group Stage', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'].map(roundType => {
                            const roundMatches = CLUB_WC_MATCHES
                              .filter(m => {
                                if (roundType === 'Group Stage') return m.round === 'Group Stage';
                                if (roundType === 'Round of 16') return m.round === 'Round of 16';
                                if (roundType === 'Quarterfinals') return m.round === 'Quarterfinal';
                                if (roundType === 'Semifinals') return m.round === 'Semifinal';
                                if (roundType === 'Final') return m.round === 'Final';
                                return false;
                              })
                              .map(m => m.match);
                            
                            return (
                              <div key={roundType} className="flex items-center gap-2">
                                <input
                                  type="url"
                                  placeholder={`${roundType} banner URL`}
                                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-48"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.target.value) {
                                      bulkUpdateMatchBanners(e.target.value, roundMatches);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {roundMatches.length} matches
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Enter URL and press Enter to apply to all matches in that round
                        </div>
                        
                        {/* Banner Suggestions */}
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">💡 Banner Suggestions:</div>
                          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <div><strong>Group Stage (48 matches):</strong> Stadium atmosphere, team flags, group stage graphics <em>(includes Draw option)</em></div>
                            <div><strong>Round of 16 (8 matches):</strong> Dramatic lighting, elimination stakes <em>(winner-only)</em></div>
                            <div><strong>Quarterfinals (4 matches):</strong> Intense competition, trophy imagery <em>(winner-only)</em></div>
                            <div><strong>Semifinals (2 matches):</strong> Championship atmosphere, historic venues <em>(winner-only)</em></div>
                            <div><strong>Final (1 match):</strong> Championship banners, trophy close-ups <em>(winner-only)</em></div>
                            <div className="mt-1 text-blue-600 dark:text-blue-400">
                              Try Unsplash: football stadium, soccer championship, world cup trophy
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Match Banners by Round */}
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {['Group Stage', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'].map(roundType => {
                        const roundMatches = CLUB_WC_MATCHES.filter(m => {
                          if (roundType === 'Group Stage') return m.round === 'Group Stage';
                          if (roundType === 'Round of 16') return m.round === 'Round of 16';
                          if (roundType === 'Quarterfinals') return m.round === 'Quarterfinal';
                          if (roundType === 'Semifinals') return m.round === 'Semifinal';
                          if (roundType === 'Final') return m.round === 'Final';
                          return false;
                        });

                        if (roundMatches.length === 0) return null;

                        return (
                          <div key={roundType} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
                              {roundType} ({roundMatches.length} matches)
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {roundMatches.map(match => (
                                <div key={match.match} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded p-2">
                                  <div className="w-16 h-10 rounded border bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                    {tournamentAssets.matchBanners[match.match] ? (
                                      <img
                                        src={tournamentAssets.matchBanners[match.match]}
                                        alt={`Match ${match.match}`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-400">Default</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      #{match.match}: {match.home} vs {match.away}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {match.date} • {match.venue}
                                    </div>
                                    <input
                                      type="url"
                                      value={tournamentAssets.matchBanners[match.match] || ''}
                                      onChange={(e) => handleMatchBannerUpdate(match.match, e.target.value)}
                                      placeholder="Custom banner URL (optional)"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mt-1"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Team Logos */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Team Logos
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                      {Array.from(new Set([
                        ...CLUB_WC_MATCHES.map(m => m.home),
                        ...CLUB_WC_MATCHES.map(m => m.away)
                      ])).sort().map(team => (
                        <div key={team} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border bg-white flex items-center justify-center overflow-hidden">
                            {tournamentAssets.teamLogos[team] ? (
                              <img
                                src={tournamentAssets.teamLogos[team]}
                                alt={team}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-gray-400">?</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {team}
                            </div>
                            <input
                              type="url"
                              value={tournamentAssets.teamLogos[team] || ''}
                              onChange={(e) => handleTeamLogoUpdate(team, e.target.value)}
                              placeholder="Logo URL"
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to clear all tournament assets? This will reset everything to defaults.')) {
                        setTournamentAssets(defaultTournamentAssets);
                        // Save the default assets to database
                        try {
                          await saveAssets();
                        } catch (error) {
                          console.error('Error clearing assets:', error);
                          alert('Failed to clear assets. Please try again.');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Clear All Assets
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAssetManager(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveAssets}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Assets
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTournamentPage; 