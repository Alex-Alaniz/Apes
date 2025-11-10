/**
 * WebSocket Service for Real-time Stream Updates
 * Similar to actions.fun's WebSocket implementation
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class StreamWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Set();
    this.streams = new Map();
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    console.log('🔌 Initializing Stream WebSocket Service...');
    
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket client connected');
      this.handleConnection(ws, req);
    });

    // Start heartbeat to keep connections alive
    this.startHeartbeat();

    console.log('✅ WebSocket service ready at /ws');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    // Add client to set
    this.clients.add(ws);

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to APES Stream WebSocket',
      timestamp: new Date().toISOString()
    }));

    // Send current streams
    this.sendStreamsToClient(ws);

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error('Invalid message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('🔌 Client disconnected');
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });

    // Ping to keep alive
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Subscribe to specific stream updates
        ws.subscribedStreams = ws.subscribedStreams || new Set();
        if (data.streamToken) {
          ws.subscribedStreams.add(data.streamToken);
          console.log(`Client subscribed to stream: ${data.streamToken}`);
        }
        break;

      case 'unsubscribe':
        if (ws.subscribedStreams && data.streamToken) {
          ws.subscribedStreams.delete(data.streamToken);
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send current streams to a client
   */
  async sendStreamsToClient(ws) {
    const db = require('../database/db');
    
    try {
      const result = await db.query(`
        SELECT 
          ps.*,
          COUNT(DISTINCT sm.id) as active_markets,
          COALESCE(SUM(sm.total_volume), 0) as total_volume
        FROM pumpfun_streams ps
        LEFT JOIN stream_markets sm ON ps.token_address = sm.stream_token AND sm.status = 'active'
        WHERE ps.is_featured = true
        GROUP BY ps.id
        ORDER BY ps.featured_order ASC
      `);

      ws.send(JSON.stringify({
        type: 'streams',
        data: result.rows
      }));

    } catch (error) {
      console.error('Error sending streams:', error);
    }
  }

  /**
   * Broadcast stream update to all clients
   */
  broadcastStreamUpdate(streamToken, update) {
    const message = JSON.stringify({
      type: 'stream_update',
      streamToken,
      data: update,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this stream
        if (!client.subscribedStreams || client.subscribedStreams.size === 0 || client.subscribedStreams.has(streamToken)) {
          client.send(message);
        }
      }
    });
  }

  /**
   * Broadcast new market creation
   */
  broadcastNewMarket(market) {
    const message = JSON.stringify({
      type: 'new_market',
      data: market,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  /**
   * Broadcast bet update
   */
  broadcastBetUpdate(marketId, betData) {
    const message = JSON.stringify({
      type: 'bet_update',
      marketId,
      data: betData,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  /**
   * Broadcast market resolution
   */
  broadcastMarketResolution(marketId, winningOption) {
    const message = JSON.stringify({
      type: 'market_resolved',
      marketId,
      winningOption,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(message) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Update stream status
   */
  updateStreamStatus(streamToken, status) {
    this.broadcastStreamUpdate(streamToken, {
      status,
      isLive: status === 'live',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update viewer count
   */
  updateViewerCount(streamToken, viewerCount) {
    this.broadcastStreamUpdate(streamToken, {
      viewerCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clean up
   */
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach(client => {
      client.close();
    });

    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = new StreamWebSocketService();