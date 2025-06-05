import React from 'react';
import MarketCard from './MarketCard';

const MarketList = ({ markets, onPredict }) => {
  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No markets available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard 
          key={market.publicKey} 
          market={market} 
          onPredict={onPredict}
        />
      ))}
    </div>
  );
};

export default MarketList; 