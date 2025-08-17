import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, ChevronRight } from 'lucide-react';

const CS2ParlayBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-green-900 via-black to-green-900 rounded-xl p-8 mb-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <Trophy className="w-8 h-8 text-black" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">CS2 Esports World Cup 2025</h2>
                <p className="text-green-400 text-lg">Parlay Tournament - Win Big with APES!</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="bg-black/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-medium">Prize Pool</span>
                </div>
                <div className="text-2xl font-bold text-white">100,000 APES</div>
              </div>
              
              <div className="bg-black/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="text-sm font-medium">Min Selections</span>
                </div>
                <div className="text-2xl font-bold text-white">2 Matches</div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Base Multiplier</span>
                </div>
                <div className="text-2xl font-bold text-white">1.8x +</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/parlay/cs2-ewc-2025')}
                className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
              >
                Enter Tournament
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="text-sm text-gray-300">
                <p>• Create parlays with 2+ match selections</p>
                <p>• All selections must win to win the parlay</p>
                <p>• Multipliers increase with each selection</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block ml-8">
            <img 
              src="https://cdn.cloudflare.steamstatic.com/apps/730/header.jpg" 
              alt="CS2"
              className="w-64 h-32 object-cover rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CS2ParlayBanner;