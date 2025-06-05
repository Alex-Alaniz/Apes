import React, { useState, useEffect } from 'react';
import marketService from '../services/marketService';

const TestPage = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        console.log('Fetching markets...');
        const fetchedMarkets = await marketService.fetchAllMarkets();
        console.log('Fetched markets:', fetchedMarkets);
        setMarkets(fetchedMarkets);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Market Debug Test</h1>
      
      {loading && <p>Loading markets...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Found {markets.length} markets</h2>
        {markets.map((market, index) => (
          <div key={market.publicKey} className="bg-gray-100 p-4 mb-4 rounded">
            <h3 className="font-bold">Market {index + 1}</h3>
            <p>PublicKey: {market.publicKey}</p>
            <p>Question: {market.question || '(no question)'}</p>
            <p>Options: {market.options.join(', ') || '(no options)'}</p>
            <p>Status: {market.status}</p>
            <pre className="text-xs mt-2 bg-gray-200 p-2 rounded overflow-auto">
              {JSON.stringify(market, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestPage; 