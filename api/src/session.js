import { q } from "./db.js";

// In-memory session store (in production, use Redis)
const sessions = new Map();

// Session configuration
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export class SessionManager {
  static createSession(userId, username) {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
    
    const session = {
      id: sessionId,
      userId,
      username,
      createdAt: new Date(),
      expiresAt,
      lastActivity: new Date()
    };
    
    sessions.set(sessionId, session);
    
    // Clean up expired sessions
    this.cleanupExpiredSessions();
    
    return sessionId;
  }
  
  static getSession(sessionId) {
    const session = sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session has expired
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    sessions.set(sessionId, session);
    
    return session;
  }
  
  static destroySession(sessionId) {
    sessions.delete(sessionId);
  }
  
  static extendSession(sessionId) {
    const session = sessions.get(sessionId);
    
    if (session) {
      session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      session.lastActivity = new Date();
      sessions.set(sessionId, session);
    }
  }
  
  static generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  static cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [sessionId, session] of sessions.entries()) {
      if (now > session.expiresAt) {
        sessions.delete(sessionId);
      }
    }
  }
  
  static getActiveSessions() {
    this.cleanupExpiredSessions();
    return Array.from(sessions.values());
  }
}

// Middleware for session authentication
export const requireAuth = (req, res, next) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.sessionId ||
                   req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const session = SessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.session = session;
  req.user = { id: session.userId, username: session.username };
  next();
};

// Optional auth middleware
export const optionalAuth = (req, res, next) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.sessionId ||
                   req.headers['x-session-id'];
  
  if (sessionId) {
    const session = SessionManager.getSession(sessionId);
    if (session) {
      req.session = session;
      req.user = { id: session.userId, username: session.username };
    }
  }
  
  next();
};
