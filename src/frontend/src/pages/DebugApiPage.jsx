import React, { useState, useEffect } from 'react';

const DebugApiPage = () => {
  const [apiUrl, setApiUrl] = useState('');
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const detectedUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
    setApiUrl(detectedUrl);
    testApiEndpoints(detectedUrl);
  }, []);

  const testApiEndpoints = async (baseUrl) => {
    const results = {};
    
    const endpoints = [
      '/health',
      '/api/twitter/primape-posts',
      '/api/users/test'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        results[endpoint] = {
          status: response.status,
          ok: response.ok,
          url: `${baseUrl}${endpoint}`
        };
      } catch (error) {
        results[endpoint] = {
          error: error.message,
          url: `${baseUrl}${endpoint}`
        };
      }
    }
    
    setTestResults(results);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🔧 API Debug Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Last updated: {new Date().toISOString()}</p>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
        <p><strong>Detected API URL:</strong> <code>{apiUrl}</code></p>
        <p><strong>VITE_API_URL:</strong> <code>{import.meta.env.VITE_API_URL || 'Not set'}</code></p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Endpoint Test Results</h2>
        {Object.entries(testResults).map(([endpoint, result]) => (
          <div key={endpoint} className="mb-4 p-4 border rounded">
            <h3 className="font-medium">{endpoint}</h3>
            <p className="text-sm text-gray-600">{result.url}</p>
            {result.error ? (
              <p className="text-red-600">❌ Error: {result.error}</p>
            ) : (
              <p className={result.ok ? 'text-green-600' : 'text-red-600'}>
                {result.ok ? '✅' : '❌'} Status: {result.status}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugApiPage; 