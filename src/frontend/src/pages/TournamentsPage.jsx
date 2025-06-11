import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import TournamentCard from '../components/TournamentCard';
import SportFilter from '../components/SportFilter';
import CreateTournamentModal from '../components/CreateTournamentModal';
import Toast from '../components/Toast';
import {
  Trophy,
  Plus,
  Star,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Medal,
  Search
} from 'lucide-react';

// Tournament data - FIFA Club World Cup 2025 and NBA Finals 2025
const MOCK_TOURNAMENTS = [
  {
    id: 'club-world-cup-2025',
    name: 'FIFA Club World Cup 2025 Prediction Championship',
    category: 'Football',
    description: 'Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! Complete tournament with 32 teams, 63 matches from group stage to final.',
    banner: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80',
    startDate: '2025-06-14T00:00:00Z',
    endDate: '2025-07-13T23:59:59Z',
    prizePool: 0, // Configured through admin
    maxParticipants: 0, // Configured through admin
    participants: [],
    totalMarkets: 63,
    isOfficial: true,
    isTrending: true,
    league: 'fifa-club-world-cup',
    status: 'upcoming',
    tournament_type: 'tournament',
    additionalPrizes: [] // Configured through admin
  },
  {
    id: 'nba-finals-2025',
    name: 'NBA Finals 2025 Prediction Championship',
    category: 'Basketball',
    description: 'Predict the NBA Finals 2025 series winner, game outcomes, and MVP. The ultimate basketball showdown!',
    banner: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2059&q=80',
    startDate: '2025-06-05T00:00:00Z',
    endDate: '2025-06-22T23:59:59Z',
    prizePool: 0, // Configured through admin
    maxParticipants: 0, // Configured through admin
    participants: [],
    totalMarkets: 15,
    isOfficial: true,
    isTrending: true,
    league: 'nba',
    status: 'upcoming',
    tournament_type: 'tournament',
    additionalPrizes: [] // Configured through admin
  }
];

const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState(MOCK_TOURNAMENTS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    sport: 'all',
    league: 'all',
    tournamentType: 'all',
    status: 'all',
    search: ''
  });
  const [userTournaments, setUserTournaments] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    loadTournaments();
    if (connected && publicKey) {
      loadUserTournaments();
    }
  }, [connected, publicKey]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from your API
      // const response = await fetch('/api/tournaments');
      // const data = await response.json();
      // setTournaments(data);
      
      // For now, using mock data
      setTournaments(MOCK_TOURNAMENTS);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setToast({
        message: 'Failed to load tournaments. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserTournaments = async () => {
    try {
      // In a real app, fetch user's participating tournaments
      // const response = await fetch(`/api/tournaments/user/${publicKey.toString()}`);
      // const data = await response.json();
      // setUserTournaments(new Set(data.tournamentIds));
      
      // Mock user participating in tournaments
      setUserTournaments(new Set(['club-world-cup-2025', 'nba-finals-2025']));
    } catch (error) {
      console.error('Error loading user tournaments:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setSelectedFilters(newFilters);
  };

  const handleJoinTournament = async (tournament) => {
    if (!connected || !publicKey) {
      setToast({
        message: 'Please connect your wallet to join tournaments.',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // In a real app, this would call your API
      // const response = await fetch('/api/tournaments/join', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     tournamentId: tournament.id,
      //     userAddress: publicKey.toString()
      //   })
      // });
      
      // Mock successful join
      setUserTournaments(prev => new Set([...prev, tournament.id]));
      
      setToast({
        message: `Successfully joined ${tournament.name}!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error joining tournament:', error);
      setToast({
        message: 'Failed to join tournament. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = () => {
    setShowCreateModal(true);
  };

  const handleSubmitTournament = async (tournamentData) => {
    try {
      // In a real app, this would call your API to create the tournament
      // const response = await fetch('/api/tournaments', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(tournamentData)
      // });
      
      // For now, add to local state
      const newTournament = {
        ...tournamentData,
        id: `tournament-${Date.now()}`,
        isTrending: false
      };
      
      setTournaments(prev => [newTournament, ...prev]);
      
      setToast({
        message: `Tournament "${tournamentData.name}" created successfully!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error; // Re-throw so modal can handle it
    }
  };

  // Filter tournaments based on selected filters
  const filteredTournaments = tournaments.filter(tournament => {
    // Search filter
    if (selectedFilters.search) {
      const searchTerm = selectedFilters.search.toLowerCase();
      if (!tournament.name.toLowerCase().includes(searchTerm) &&
          !tournament.description.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Sport filter
    if (selectedFilters.sport !== 'all') {
      const sportCategory = tournament.category?.toLowerCase();
      if (selectedFilters.sport === 'football' && sportCategory !== 'football') return false;
      if (selectedFilters.sport === 'basketball' && sportCategory !== 'basketball') return false;
      if (selectedFilters.sport === 'american_football' && sportCategory !== 'american football') return false;
      if (selectedFilters.sport === 'other' && !['football', 'basketball', 'american football'].includes(sportCategory)) return true;
      if (selectedFilters.sport !== 'other' && selectedFilters.sport !== sportCategory) return false;
    }

    // League filter
    if (selectedFilters.league !== 'all' && tournament.league !== selectedFilters.league) {
      return false;
    }

    // Tournament type filter
    if (selectedFilters.tournamentType !== 'all' && tournament.tournament_type !== selectedFilters.tournamentType) {
      return false;
    }

    // Status filter
    if (selectedFilters.status !== 'all' && tournament.status !== selectedFilters.status) {
      return false;
    }

    return true;
  });

  const activeTournaments = filteredTournaments.filter(t => t.status === 'active');
  const totalPrizePool = tournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0);
  const totalParticipants = tournaments.reduce((sum, t) => sum + (t.participants?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-purple-500" />
              Tournaments
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Compete in prediction tournaments and win amazing prizes
            </p>
          </div>
          
          <button
            onClick={handleCreateTournament}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Tournament
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-gray-400 text-sm">Active Tournaments</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {activeTournaments.length}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-green-400" />
              <span className="text-gray-400 text-sm">Total Tournaments</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tournaments.length}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Participants</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {totalParticipants.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Medal className="w-6 h-6 text-purple-400" />
              <span className="text-gray-400 text-sm">Your Tournaments</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {connected ? userTournaments.size : 0}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <SportFilter 
            markets={tournaments}
            onFilterChange={handleFilterChange}
            selectedFilters={selectedFilters}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tournaments...</p>
          </div>
        )}

        {/* All Tournaments */}
        {!loading && (
          <div className="space-y-8">
            {/* All Tournaments - No Redundant Sections */}
            {filteredTournaments.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-purple-400" />
                  Available Tournaments ({filteredTournaments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onJoinTournament={handleJoinTournament}
                      isParticipating={userTournaments.has(tournament.id)}
                      userRank={null}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {filteredTournaments.length === 0 && !loading && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  No Tournaments Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No tournaments match your current filters. Try adjusting your search criteria.
                </p>
                <button
                  onClick={() => setSelectedFilters({
                    sport: 'all',
                    league: 'all',
                    tournamentType: 'all',
                    status: 'all',
                    search: ''
                  })}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Create Tournament Modal */}
        <CreateTournamentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleSubmitTournament}
        />
      </div>
    </div>
  );
};

export default TournamentsPage; 