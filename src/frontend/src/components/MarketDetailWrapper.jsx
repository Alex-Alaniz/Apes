import React from 'react';
import { useParams } from 'react-router-dom';
import MarketDetailPage from '../pages/MarketDetailPage';

const MarketDetailWrapper = () => {
  const { id } = useParams();
  return <MarketDetailPage marketId={id} />;
};

export default MarketDetailWrapper; 