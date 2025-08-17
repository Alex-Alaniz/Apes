import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Trophy, Users, DollarSign, Target, AlertCircle, Check, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import parlayService from '../services/parlayService';

const CS2ParlayTournamentPage = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState({});
  const [stakeAmount, setStakeAmount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [placingBet, setPlacingBet] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [userBets, setUserBets] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  
  // Debug environment variables
  console.log('Environment check:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_URL: API_URL,
    all_env: import.meta.env
  });

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentData();
      fetchMatches();
      if (publicKey) {
        fetchUserBets();
      }
    }
  }, [tournamentId, publicKey]);

  const fetchTournamentData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/parlay-tournaments/${tournamentId}`);
      setTournament(response.data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament data');
    }
  };

  const fetchMatches = async () => {
    try {
      console.log('Fetching matches from:', `${API_URL}/api/parlay-tournaments/${tournamentId}/matches`);
      const response = await axios.get(`${API_URL}/api/parlay-tournaments/${tournamentId}/matches`);
      console.log('Matches response:', response.data);
      setMatches(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
      setLoading(false);
    }
  };

  const fetchUserBets = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/parlay-tournaments/${tournamentId}/bets/${publicKey.toString()}`
      );
      setUserBets(response.data);
    } catch (error) {
      console.error('Error fetching user bets:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/parlay-tournaments/${tournamentId}/leaderboard`
      );
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleMatchSelection = (matchId, team) => {
    setSelectedMatches(prev => {
      const newSelections = { ...prev };
      if (newSelections[matchId] === team) {
        delete newSelections[matchId];
      } else {
        newSelections[matchId] = team;
      }
      return newSelections;
    });
  };

  const calculateMultiplier = () => {
    const selectionCount = Object.keys(selectedMatches).length;
    if (selectionCount < 2) return 0;
    
    // Ensure we always have valid numbers
    const baseMultiplier = parseFloat(tournament?.base_multiplier) || 1.8;
    const increment = parseFloat(tournament?.multiplier_increment) || 0.5;
    const result = baseMultiplier + (increment * (selectionCount - 1));
    
    // Return a valid number, never NaN
    return isNaN(result) ? 0 : result;
  };

  const formatMultiplier = () => {
    const multiplier = calculateMultiplier();
    return isNaN(multiplier) ? '0.00' : multiplier.toFixed(2);
  };

  const calculatePotentialPayout = () => {
    const multiplier = calculateMultiplier();
    const payout = stakeAmount * multiplier;
    return isNaN(payout) ? '0.00' : payout.toFixed(2);
  };

  const placeParlayBet = async () => {
    if (!connected) {
      toast.error('Please connect your wallet');
      return;
    }

    const selections = Object.entries(selectedMatches).map(([matchId, team]) => ({
      match_id: matchId,
      selected_team: team
    }));

    if (selections.length < 2) {
      toast.error('Please select at least 2 matches');
      return;
    }

    setPlacingBet(true);
    try {
      // Initialize parlay service
      await parlayService.initialize(connection, wallet);
      
      // Validate selections
      parlayService.validateSelections(selections, matches);
      
      // Place bet with APES token transfer
      const result = await parlayService.placeParlayBet(
        wallet,
        tournamentId,
        selections,
        stakeAmount
      );

      if (result.success) {
        toast.success(`Parlay bet placed! Potential payout: ${result.potentialPayout} APES`);
        toast.success(`Transaction: ${result.signature.substring(0, 8)}...`);
        setSelectedMatches({});
        fetchUserBets();
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient APES token balance');
      } else {
        toast.error(error.message || 'Failed to place bet');
      }
    } finally {
      setPlacingBet(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-green-900 to-black border-b border-green-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">CS2 Esports World Cup 2025</h1>
              <p className="text-gray-300">Create parlays and win big with APES tokens!</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                {tournament?.prize_pool || '100,000'} APES
              </div>
              <div className="text-sm text-gray-400">Prize Pool</div>
            </div>
          </div>

          {/* Tournament Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-black/50 rounded-lg p-4 border border-green-800">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Trophy className="w-5 h-5" />
                <span className="text-sm">Total Volume</span>
              </div>
              <div className="text-2xl font-bold">
                {parseFloat(tournament?.total_volume || 0).toLocaleString()} APES
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-green-800">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Participants</span>
              </div>
              <div className="text-2xl font-bold">
                {tournament?.total_participants || 0}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-green-800">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm">Total Bets</span>
              </div>
              <div className="text-2xl font-bold">
                {tournament?.total_bets || 0}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-green-800">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Min Selections</span>
              </div>
              <div className="text-2xl font-bold">
                {tournament?.min_selections || 2}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-green-800">
              <button
                onClick={() => setActiveTab('matches')}
                className={`pb-2 px-4 ${
                  activeTab === 'matches' 
                    ? 'text-green-400 border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Matches
              </button>
              <button
                onClick={() => {
                  setActiveTab('my-bets');
                  fetchUserBets();
                }}
                className={`pb-2 px-4 ${
                  activeTab === 'my-bets' 
                    ? 'text-green-400 border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Bets
              </button>
              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  fetchLeaderboard();
                }}
                className={`pb-2 px-4 ${
                  activeTab === 'leaderboard' 
                    ? 'text-green-400 border-b-2 border-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Leaderboard
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'matches' && (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div 
                    key={match.match_id}
                    className="bg-gray-900 rounded-lg p-6 border border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-400">
                        {match.round} • {new Date(match.match_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        Best of {match.best_of}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleMatchSelection(match.match_id, match.team_a)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMatches[match.match_id] === match.team_a
                            ? 'border-green-400 bg-green-900/20'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        disabled={match.status !== 'scheduled'}
                      >
                        <img 
                          src={match.team_a_logo || '/api/placeholder/100/100'} 
                          alt={match.team_a}
                          className="w-16 h-16 mx-auto mb-2 object-contain"
                        />
                        <div className="font-semibold">{match.team_a}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          {match.team_a_percentage}% picked
                        </div>
                      </button>

                      <button
                        onClick={() => handleMatchSelection(match.match_id, match.team_b)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMatches[match.match_id] === match.team_b
                            ? 'border-green-400 bg-green-900/20'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        disabled={match.status !== 'scheduled'}
                      >
                        <img 
                          src={match.team_b_logo || '/api/placeholder/100/100'} 
                          alt={match.team_b}
                          className="w-16 h-16 mx-auto mb-2 object-contain"
                        />
                        <div className="font-semibold">{match.team_b}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          {match.team_b_percentage}% picked
                        </div>
                      </button>
                    </div>

                    {match.status === 'completed' && (
                      <div className="mt-4 text-center text-sm">
                        <span className="text-green-400">
                          Winner: {match.winner === 'team_a' ? match.team_a : match.team_b}
                        </span>
                        <span className="text-gray-400 ml-4">
                          {match.score_a} - {match.score_b}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'my-bets' && (
              <div className="space-y-4">
                {userBets.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No bets placed yet</p>
                  </div>
                ) : (
                  userBets.map((bet) => (
                    <div 
                      key={bet.bet_id}
                      className="bg-gray-900 rounded-lg p-6 border border-gray-800"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-sm text-gray-400">
                            {new Date(bet.placed_at).toLocaleDateString()}
                          </div>
                          <div className="text-lg font-semibold">
                            {bet.selection_count} Selections
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          bet.status === 'won' 
                            ? 'bg-green-900 text-green-400'
                            : bet.status === 'lost'
                            ? 'bg-red-900 text-red-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {bet.status}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {bet.bet_selections.map((selection, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {selection.match_details.team_a} vs {selection.match_details.team_b}
                            </span>
                            <span className="flex items-center gap-2">
                              {selection.selected_team}
                              {selection.match_resolved && (
                                selection.is_correct 
                                  ? <Check className="w-4 h-4 text-green-400" />
                                  : <X className="w-4 h-4 text-red-400" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Stake</div>
                          <div className="font-semibold">{bet.stake_amount} APES</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Multiplier</div>
                          <div className="font-semibold">{bet.total_multiplier}x</div>
                        </div>
                        <div>
                          <div className="text-gray-400">
                            {bet.status === 'won' ? 'Payout' : 'Potential'}
                          </div>
                          <div className="font-semibold text-green-400">
                            {bet.potential_payout} APES
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Parlays
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {leaderboard.map((player, idx) => (
                      <tr key={player.user_address}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {player.username || `${player.user_address.slice(0, 6)}...`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {player.total_parlays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {player.win_rate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                          +{player.total_profit.toFixed(2)} APES
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bet Slip */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 sticky top-4">
              <h3 className="text-xl font-bold mb-4">Parlay Bet Slip</h3>

              {Object.keys(selectedMatches).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select at least 2 matches to create a parlay</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {Object.entries(selectedMatches).map(([matchId, team]) => {
                      const match = matches.find(m => m.match_id === matchId);
                      return (
                        <div 
                          key={matchId}
                          className="flex items-center justify-between bg-gray-800 rounded p-2"
                        >
                          <span className="text-sm">{team}</span>
                          <button
                            onClick={() => handleMatchSelection(matchId, team)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">
                      Stake Amount (APES)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Selections</span>
                      <span>{Object.keys(selectedMatches).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Multiplier</span>
                      <span className="text-green-400">
                        {formatMultiplier()}x
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Potential Payout</span>
                      <span className="text-green-400">
                        {calculatePotentialPayout()} APES
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={placeParlayBet}
                    disabled={
                      !connected || 
                      Object.keys(selectedMatches).length < 2 || 
                      placingBet
                    }
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    {placingBet ? 'Placing Bet...' : 'Place Parlay Bet'}
                  </button>

                  {!connected && (
                    <p className="text-center text-sm text-gray-400 mt-2">
                      Connect wallet to place bet
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Rules */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mt-4">
              <h4 className="font-semibold mb-3">Parlay Rules</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Minimum 2 selections required</li>
                <li>• All selections must win to win the parlay</li>
                <li>• Odds multiply with each selection</li>
                <li>• 2.5% burn fee on bet placement</li>
                <li>• 1.5% burn fee on payout claims</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2ParlayTournamentPage;