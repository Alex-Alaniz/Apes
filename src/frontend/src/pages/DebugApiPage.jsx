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
      <h1 className="text-2xl font-bold mb-6">API Debug Information</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Environment Detection</h2>
        <div className="space-y-2">
          <p><strong>Detected API URL:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{apiUrl}</code></p>
          <p><strong>Environment Variable:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{import.meta.env.VITE_API_URL || 'NOT SET'}</code></p>
          <p><strong>Fallback URL:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">https://apes-production.up.railway.app</code></p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">API Endpoint Tests</h2>
        <div className="space-y-3">
          {Object.entries(testResults).map(([endpoint, result]) => (
            <div key={endpoint} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <code className="font-mono text-sm">{endpoint}</code>
                <span className={`px-2 py-1 rounded text-xs ${
                  result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status || 'ERROR'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{result.url}</p>
              {result.error && (
                <p className="text-sm text-red-600 mt-1">{result.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Troubleshooting</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• If API URL shows localhost:5001, update VITE_API_URL in Vercel environment variables</li>
          <li>• If twitter/primape-posts returns 404, the backend needs the Twitter routes update</li>
          <li>• If all tests fail, check if the backend server is running</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugApiPage; 