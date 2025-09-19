import React, { useState, useEffect } from 'react';

const TestConnectionPage = () => {
  const [apiUrl, setApiUrl] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show what env var we're using
    setApiUrl(import.meta.env.VITE_API_URL || 'NOT SET');
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log('Testing connection to:', `${import.meta.env.VITE_API_URL}/api/livestreams`);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livestreams`);
      console.log('Response:', response);
      
      const data = await response.json();
      console.log('Data:', data);
      
      setTestResult({
        status: 'success',
        statusCode: response.status,
        streamsCount: data.streams?.length || 0,
        data: JSON.stringify(data, null, 2)
      });
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        status: 'error',
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">API Connection Test</h1>
      
      <div className="bg-gray-900 rounded-lg p-6 mb-4">
        <p className="text-lg mb-2">
          <strong>VITE_API_URL:</strong> {apiUrl}
        </p>
        <p className="text-sm text-gray-400">
          Full endpoint: {apiUrl}/api/livestreams
        </p>
      </div>

      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium mb-4"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      {testResult && (
        <div className={`rounded-lg p-6 ${testResult.status === 'success' ? 'bg-green-900' : 'bg-red-900'}`}>
          <h2 className="text-xl font-bold mb-2">
            {testResult.status === 'success' ? '✅ Success' : '❌ Error'}
          </h2>
          
          {testResult.status === 'success' ? (
            <>
              <p>Status Code: {testResult.statusCode}</p>
              <p>Streams Found: {testResult.streamsCount}</p>
              <pre className="mt-4 bg-black p-4 rounded overflow-auto text-xs">
                {testResult.data}
              </pre>
            </>
          ) : (
            <>
              <p>Error: {testResult.error}</p>
              <pre className="mt-4 bg-black p-4 rounded overflow-auto text-xs">
                {testResult.stack}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TestConnectionPage;