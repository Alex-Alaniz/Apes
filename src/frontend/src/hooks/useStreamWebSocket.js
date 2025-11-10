import { useEffect, useState, useRef, useCallback } from 'react';

const useStreamWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [streams, setStreams] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Get WebSocket URL from API URL
  const getWebSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/ws`;
  };

  const connect = useCallback(() => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected successfully');
        setConnected(true);
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnected(false);
    }
  }, []);

  const handleMessage = (message) => {
    switch (message.type) {
      case 'connected':
        console.log('Connected:', message.message);
        break;
        
      case 'streams':
        setStreams(message.data);
        setLastUpdate(message.timestamp);
        break;
        
      case 'stream_update':
        updateStream(message.streamToken, message.data);
        break;
        
      case 'new_market':
        console.log('New market created:', message.data);
        break;
        
      case 'bet_update':
        console.log('Bet update:', message.data);
        break;
        
      case 'market_resolved':
        console.log('Market resolved:', message.marketId, message.winningOption);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const updateStream = (streamToken, update) => {
    setStreams(prevStreams => 
      prevStreams.map(stream => 
        stream.token_address === streamToken 
          ? { ...stream, ...update }
          : stream
      )
    );
  };

  const subscribe = (streamToken) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        streamToken
      }));
    }
  };

  const unsubscribe = (streamToken) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        streamToken
      }));
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    streams,
    lastUpdate,
    subscribe,
    unsubscribe
  };
};

export default useStreamWebSocket;