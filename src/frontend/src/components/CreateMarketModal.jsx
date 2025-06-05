import React, { useState } from 'react';

const CreateMarketModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    category: 'General',
    resolutionDate: '',
    creatorStakeAmount: 100,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCreate({
        ...formData,
        resolutionDate: new Date(formData.resolutionDate),
        options: formData.options.filter(opt => opt.trim() !== ''),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Market</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Question</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Will Bitcoin reach $150,000 by 2025?"
              required
              maxLength={200}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Options</label>
            <div className="space-y-2">
              <input
                type="text"
                value={formData.options[0]}
                onChange={(e) => handleOptionChange(0, e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Yes"
                required
                maxLength={50}
              />
              <input
                type="text"
                value={formData.options[1]}
                onChange={(e) => handleOptionChange(1, e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="No"
                required
                maxLength={50}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="General">General</option>
              <option value="Crypto">Crypto</option>
              <option value="Sports">Sports</option>
              <option value="Politics">Politics</option>
              <option value="Tech">Technology</option>
              <option value="Economy">Economy</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Resolution Date</label>
            <input
              type="datetime-local"
              value={formData.resolutionDate}
              onChange={(e) => setFormData({ ...formData, resolutionDate: e.target.value })}
              className="w-full p-2 border rounded"
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Creator Stake (APES)</label>
            <input
              type="number"
              value={formData.creatorStakeAmount}
              onChange={(e) => setFormData({ ...formData, creatorStakeAmount: Number(e.target.value) })}
              className="w-full p-2 border rounded"
              min="10"
              max="10000"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Market'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMarketModal; 