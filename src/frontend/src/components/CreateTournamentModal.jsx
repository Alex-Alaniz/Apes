import React, { useState } from 'react';
import {
  X,
  Trophy,
  Calendar,
  DollarSign,
  Users,
  Image,
  Star,
  Info,
  Check
} from 'lucide-react';

const CreateTournamentModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Football',
    startDate: '',
    endDate: '',
    prizePool: '',
    maxParticipants: '10000',
    banner: '',
    isOfficial: false,
    league: 'fifa-club-world-cup',
    tournamentType: 'tournament'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-defined tournament templates for quick setup
  const tournamentTemplates = {
    'club-world-cup-2025': {
      name: 'Club World Cup 2025 Prediction Championship',
      description: 'Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! Join thousands of fans in the ultimate football prediction tournament.',
      category: 'Football',
      startDate: '2025-06-14',
      endDate: '2025-07-13',
      prizePool: '50000',
      maxParticipants: '10000',
      banner: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1893&q=80',
      isOfficial: true,
      league: 'fifa-club-world-cup',
      tournamentType: 'tournament'
    },
    'premier-league-spring': {
      name: 'Premier League Spring Predictions',
      description: 'Weekly prediction contests for Premier League matches with running leaderboards and special prizes.',
      category: 'Football',
      startDate: '2025-01-15',
      endDate: '2025-05-25',
      prizePool: '25000',
      maxParticipants: '5000',
      banner: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?ixlib=rb-4.0.3',
      isOfficial: true,
      league: 'premier-league',
      tournamentType: 'league'
    },
    'custom': {
      name: '',
      description: '',
      category: 'Football',
      startDate: '',
      endDate: '',
      prizePool: '',
      maxParticipants: '1000',
      banner: '',
      isOfficial: false,
      league: 'other',
      tournamentType: 'tournament'
    }
  };

  const handleTemplateSelect = (templateKey) => {
    const template = tournamentTemplates[templateKey];
    setFormData(template);
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Tournament name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.prizePool || parseFloat(formData.prizePool) <= 0) {
      newErrors.prizePool = 'Prize pool must be greater than 0';
    }

    if (!formData.maxParticipants || parseInt(formData.maxParticipants) <= 0) {
      newErrors.maxParticipants = 'Max participants must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const tournamentData = {
        ...formData,
        prizePool: parseFloat(formData.prizePool),
        maxParticipants: parseInt(formData.maxParticipants),
        createdAt: new Date().toISOString(),
        status: 'upcoming',
        participants: [],
        totalMarkets: 0
      };

      await onSubmit(tournamentData);
      
      // Reset form
      setFormData(tournamentTemplates.custom);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating tournament:', error);
      setErrors({ submit: 'Failed to create tournament. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Create Tournament</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Templates */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Quick Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handleTemplateSelect('club-world-cup-2025')}
                className="p-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg text-left hover:from-green-700 hover:to-blue-700 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-white">Club World Cup 2025</span>
                </div>
                <p className="text-sm text-gray-200">Official FIFA tournament with 50k APES prize pool</p>
              </button>
              
              <button
                onClick={() => handleTemplateSelect('premier-league-spring')}
                className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-left hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-white">Premier League</span>
                </div>
                <p className="text-sm text-gray-200">Season-long predictions with 25k APES</p>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  placeholder="Enter tournament name"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  placeholder="Describe your tournament..."
                />
                {errors.description && (
                  <p className="text-red-400 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Football">Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Esports">Esports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tournament Type
                  </label>
                  <select
                    value={formData.tournamentType}
                    onChange={(e) => handleInputChange('tournamentType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="tournament">Tournament</option>
                    <option value="league">League</option>
                    <option value="special">Special Event</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates and Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Schedule & Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                  {errors.startDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                  {errors.endDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Prize Pool (APES) *
                  </label>
                  <input
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => handleInputChange('prizePool', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                    placeholder="10000"
                    min="1"
                  />
                  {errors.prizePool && (
                    <p className="text-red-400 text-sm mt-1">{errors.prizePool}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Max Participants *
                  </label>
                  <input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                    placeholder="1000"
                    min="1"
                  />
                  {errors.maxParticipants && (
                    <p className="text-red-400 text-sm mt-1">{errors.maxParticipants}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.banner}
                  onChange={(e) => handleInputChange('banner', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOfficial"
                  checked={formData.isOfficial}
                  onChange={(e) => handleInputChange('isOfficial', e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isOfficial" className="text-sm text-gray-300 flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Mark as Official Tournament
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-300 font-medium mb-1">Tournament Guidelines</h4>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• Prize pools are automatically distributed to top performers</li>
                    <li>• Official tournaments appear in trending sections</li>
                    <li>• Participants can join anytime before the tournament starts</li>
                    <li>• Tournament markets will be created based on your category and league</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Tournament
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentModal; 