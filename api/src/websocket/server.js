import { WebSocketServer } from 'ws';
import { q } from '../db.js';
import logger from '../utils/logger.js';

// Map of userId -> Set of WebSocket connections
const userConnections = new Map();

// Map of connection -> user info
const connectionUsers = new Map();

/**
 * Authenticate WebSocket connection using session cookie or header
 */
async function authenticateConnection(req) {
  try {
    // Extract session ID from cookies or headers
    const cookies = req.headers.cookie || '';
    const cookieMatch = cookies.match(/sessionId=([^;]+)/);
    const sessionId = cookieMatch?.[1] || 
                     req.headers['x-session-id'] ||
                     req.headers['X-Session-ID'] ||
                     req.url?.split('sessionId=')[1]?.split('&')[0];

    if (!sessionId) {
      return null;
    }

    // Validate session in database (same logic as requireAuth)
    const sessionResult = await q(`
      SELECT 
        s.id, 
        s.user_id, 
        s.expires_at, 
        u.email, 
        u.username,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
        COALESCE(r.role_name, 'user') as role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE s.id = $1 AND s.expires_at > NOW()
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const dbSession = sessionResult.rows[0];
    
    return {
      userId: dbSession.user_id,
      username: dbSession.username,
      full_name: dbSession.full_name,
      email: dbSession.email,
      role: dbSession.role,
      sessionId: dbSession.id
    };
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    return null;
  }
}

/**
 * Send message to specific user
 */
export function sendToUser(userId, event, data) {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    return false;
  }

  const message = JSON.stringify({ event, data });
  let sent = false;

  connections.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(message);
        sent = true;
      } catch (error) {
        logger.error(`Error sending message to user ${userId}:`, error);
        // Remove dead connection
        connections.delete(ws);
        connectionUsers.delete(ws);
      }
    } else {
      // Remove closed connection
      connections.delete(ws);
      connectionUsers.delete(ws);
    }
  });

  // Clean up empty sets
  if (connections.size === 0) {
    userConnections.delete(userId);
  }

  return sent;
}

/**
 * Broadcast to all users with specific role
 */
export function broadcastToRole(role, event, data) {
  const message = JSON.stringify({ event, data });
  let count = 0;

  connectionUsers.forEach((userInfo, ws) => {
    if (userInfo.role === role && ws.readyState === 1) {
      try {
        ws.send(message);
        count++;
      } catch (error) {
        logger.error(`Error broadcasting to role ${role}:`, error);
        const userId = userInfo.userId;
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
        }
        connectionUsers.delete(ws);
      }
    }
  });

  return count;
}

/**
 * Broadcast to all connected users
 */
export function broadcastToAll(event, data) {
  const message = JSON.stringify({ event, data });
  let count = 0;

  connectionUsers.forEach((userInfo, ws) => {
    if (ws.readyState === 1) {
      try {
        ws.send(message);
        count++;
      } catch (error) {
        logger.error('Error broadcasting to all:', error);
        const userId = userInfo.userId;
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
        }
        connectionUsers.delete(ws);
      }
    }
  });

  return count;
}

/**
 * Get connected user IDs
 */
export function getConnectedUsers() {
  return Array.from(userConnections.keys());
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info, callback) => {
      // Authenticate during handshake
      const userInfo = await authenticateConnection(info.req);
      if (!userInfo) {
        callback(false, 401, 'Authentication required');
        return;
      }
      // Store user info in request for later use
      info.req.userInfo = userInfo;
      callback(true);
    }
  });

  wss.on('connection', async (ws, req) => {
    const userInfo = req.userInfo;
    
    if (!userInfo) {
      ws.close(1008, 'Authentication failed');
      return;
    }

    const { userId } = userInfo;

    logger.info(`WebSocket connection established for user ${userId} (${userInfo.username})`);

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);
    connectionUsers.set(ws, userInfo);

    // Send welcome message
    ws.send(JSON.stringify({
      event: 'connected',
      data: { message: 'WebSocket connected', userId }
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { event, payload } = data;

        switch (event) {
          case 'subscribe:notifications':
            // User subscribes to notifications (already handled by connection)
            ws.send(JSON.stringify({
              event: 'subscribed',
              data: { type: 'notifications' }
            }));
            break;

          case 'subscribe:chat:thread':
            // User subscribes to specific chat thread
            if (payload?.threadId) {
              ws.send(JSON.stringify({
                event: 'subscribed',
                data: { type: 'chat', threadId: payload.threadId }
              }));
            }
            break;

          case 'chat:typing':
            // Forward typing indicator to other participants
            if (payload?.threadId) {
              // This will be handled by chat route when sending messages
              // For now, just acknowledge
              ws.send(JSON.stringify({
                event: 'typing:ack',
                data: { threadId: payload.threadId }
              }));
            }
            break;

          case 'ping':
            // Heartbeat
            ws.send(JSON.stringify({ event: 'pong' }));
            break;

          default:
            logger.warn(`Unknown WebSocket event: ${event}`);
        }
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          event: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      logger.info(`WebSocket connection closed for user ${userId}`);
      
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
      connectionUsers.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
      connectionUsers.delete(ws);
    });

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Every 30 seconds

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  logger.info('WebSocket server initialized');
  return wss;
}

