import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const StreamPredictionModal = ({ isOpen, onClose, streamToken, streamTitle, onMarketCreated }) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [question, setQuestion] = useState('');
  const [duration, setDuration] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Quick templates for common predictions
  const templates = [
    'Will the viewer count reach {X} in the next 5 minutes?',
    'Will {event} happen in the next 5 minutes?',
    'Will the stream hit {milestone} before time runs out?',
    'Will the chat spam {emoji} in the next 5 minutes?',
    'Will the streamer {action} in the next 5 minutes?'
  ];

  const handleCreate = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create market via API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams/${streamToken}/market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toString()
        },
        body: JSON.stringify({
          question,
          duration,
          creatorWallet: publicKey.toString()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create market');
      }

      const { market } = await response.json();
      
      // Success!
      onMarketCreated(market);
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to create market');
      console.error('Error creating market:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const useTemplate = (template) => {
    setQuestion(template.replace(/{[^}]+}/g, '___'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Create Prediction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          Create a 5-minute prediction market for <span className="font-bold">{streamTitle}</span>
        </p>

        {/* Question Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What do you want to predict?
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will something specific happen in the next 5 minutes?"
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {question.length}/500 characters
          </p>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-300 mb-2">Quick templates:</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => useTemplate(template)}
                className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full hover:bg-gray-700"
              >
                {template.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        {/* Duration (fixed for now) */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Duration</p>
              <p className="text-xs text-gray-500">Markets auto-resolve after expiry</p>
            </div>
            <div className="text-2xl font-bold text-white">
              5 min
            </div>
          </div>
        </div>

        {/* Fees Info */}
        <div className="mb-6 text-xs text-gray-400">
          <p>• 2% platform fee on volume</p>
          <p>• 0.5% goes to you as creator</p>
          <p>• 0.5% goes to the streamer</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-600 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreating || !question.trim()}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Creating...
              </span>
            ) : (
              'Create Market'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreamPredictionModal;