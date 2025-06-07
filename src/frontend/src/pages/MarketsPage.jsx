import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import blockchainMarketsService from '../services/blockchainMarketsService';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading markets...');
      const fetchedMarkets = await blockchainMarketsService.fetchMarketsWithFallback();
      
      console.log(`✅ Loaded ${fetchedMarkets.length} markets`);
      setMarkets(fetchedMarkets);
    } catch (err) {
      console.error('❌ Failed to fetch markets:', err);
      setError('Failed to load markets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">Loading markets...</span>
          </Spinner>
          <p className="text-muted">Loading prediction markets...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Markets</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchMarkets}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">Prediction Markets</h2>
              <p className="text-muted mb-0">
                Active markets: {markets.length}
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate('/create-market')}
              className="px-4"
            >
              Create Market
            </Button>
          </div>
        </Col>
      </Row>

      {markets.length === 0 ? (
        <Row>
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <h4 className="text-muted mb-3">No Markets Available</h4>
                <p className="text-muted mb-4">
                  Be the first to create a prediction market!
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/create-market')}
                >
                  Create First Market
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          {markets.map((market) => (
            <Col key={market.publicKey || market.market_address || market.id} lg={6} className="mb-4">
              <MarketCard market={market} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MarketsPage; 