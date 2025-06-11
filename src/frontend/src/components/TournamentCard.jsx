import React, { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Star,
  Medal,
  Target,
  TrendingUp,
  ChevronRight,
  Gift
} from 'lucide-react';

const TournamentCard = ({ 
  tournament, 
  onJoinTournament, 
  isParticipating = false,
  userRank = null 
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleViewTournament = () => {
    navigate(`/tournaments/${tournament.id}`);
  };

  const handleJoinClick = (e) => {
    e.stopPropagation();
    onJoinTournament(tournament);
  };

  // Calculate tournament progress
  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);
  const isUpcoming = now < startDate;
  const isActive = now >= startDate && now <= endDate;
  const isCompleted = now > endDate;

  const getStatusColor = () => {
    if (isUpcoming) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (isActive) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (isCompleted) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  };

  const getStatusText = () => {
    if (isUpcoming) return 'Upcoming';
    if (isActive) return 'Live';
    if (isCompleted) return 'Completed';
    return 'Draft';
  };

  // Calculate prize pool distribution
  const totalPrizePool = tournament.prizePool || 0;
  const participantCount = tournament.participants?.length || 0;
  const maxParticipants = tournament.maxParticipants || 1000;

  return (
    <div
      onClick={handleViewTournament}
      className="bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden"
    >
      {/* Tournament Header with Banner */}
      <div className="relative h-32 overflow-hidden">
        {tournament.banner ? (
          <>
            <img 
              src={tournament.banner} 
              alt={tournament.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white/20" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Prize Pool Badge */}
        <div className="absolute top-3 left-3">
          <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg px-3 py-1 border border-yellow-500/30">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">
                {totalPrizePool >= 1000 ? `${(totalPrizePool / 1000).toFixed(1)}k` : totalPrizePool} APES
              </span>
            </div>
          </div>
        </div>

        {/* Trending Badge */}
        {tournament.isTrending && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-orange-500/30">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">Trending</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tournament Content */}
      <div className="p-5">
        {/* Tournament Title and Category */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">
              {tournament.category || 'Tournament'}
            </span>
            {tournament.isOfficial && (
              <Star className="w-3 h-3 text-yellow-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white line-clamp-2">
            {tournament.name}
          </h3>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-white">
                {participantCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                / {maxParticipants.toLocaleString()} max
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-white">
                {tournament.totalMarkets || 0}
              </div>
              <div className="text-xs text-gray-400">Markets</div>
            </div>
          </div>
        </div>

        {/* User Participation Status */}
        {isParticipating && (
          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">You're participating!</span>
              </div>
              {userRank && (
                <div className="text-sm font-medium text-white">
                  Rank #{userRank}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tournament Dates */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
          {isActive && (
            <div className="flex items-center gap-2 text-sm text-green-400 mt-1">
              <Clock className="w-4 h-4" />
              <span>Ends {format(endDate, 'MMM d, h:mm a')}</span>
            </div>
          )}
        </div>

        {/* Prize Pool Distribution */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Prize Pool</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isExpanded ? 'Less' : 'Details'}
            </button>
          </div>
          
          <div className="space-y-2">
            {/* Top 3 Prizes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-black">1</span>
                </div>
                <span className="text-sm text-gray-300">1st Place</span>
              </div>
              <span className="text-sm font-medium text-yellow-400">
                {Math.floor(totalPrizePool * 0.5).toLocaleString()} APES
              </span>
            </div>
            
            {isExpanded && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-black">2</span>
                    </div>
                    <span className="text-sm text-gray-300">2nd Place</span>
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {Math.floor(totalPrizePool * 0.3).toLocaleString()} APES
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-black">3</span>
                    </div>
                    <span className="text-sm text-gray-300">3rd Place</span>
                  </div>
                  <span className="text-sm font-medium text-orange-400">
                    {Math.floor(totalPrizePool * 0.2).toLocaleString()} APES
                  </span>
                </div>
                
                {tournament.additionalPrizes && tournament.additionalPrizes.length > 0 && (
                  <div className="pt-2 border-t border-gray-700">
                    {tournament.additionalPrizes.map((prize, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{prize.description}</span>
                        <span className="text-xs text-gray-300">{prize.amount} APES</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          {!isParticipating && !isCompleted ? (
            <button
              onClick={handleJoinClick}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              Join Tournament
            </button>
          ) : (
            <button
              onClick={handleViewTournament}
              className="flex-1 bg-gray-700 text-gray-300 py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
            >
              View Tournament
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentCard; 