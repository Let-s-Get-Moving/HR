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
export const requireAuth = async (req, res, next) => {
  console.log('🔍 [AUTH] requireAuth middleware triggered');
  console.log('🔍 [AUTH] Request path:', req.path);
  console.log('🔍 [AUTH] Request method:', req.method);
  console.log('🔍 [AUTH] Headers:', JSON.stringify({
    authorization: req.headers.authorization ? 'present' : 'missing',
    'x-session-id': req.headers['x-session-id'] ? req.headers['x-session-id'].substring(0, 10) + '...' : 'missing',
    'X-Session-ID': req.headers['X-Session-ID'] ? req.headers['X-Session-ID'].substring(0, 10) + '...' : 'missing',
    cookie: req.headers.cookie ? 'present' : 'missing'
  }, null, 2));
  
  const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.sessionId ||
                   req.headers['x-session-id'] ||
                   req.headers['X-Session-ID'];
  
  console.log('🔍 [AUTH] Extracted session ID:', sessionId ? sessionId.substring(0, 15) + '...' : 'NONE');
  
  if (!sessionId) {
    console.log('❌ [AUTH] No session ID found - returning 401');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    console.log('🔍 [AUTH] Checking database for session...');
    // First check database for persistent sessions
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
    
    console.log('🔍 [AUTH] Database query result:', sessionResult.rows.length, 'sessions found');
    
    if (sessionResult.rows.length > 0) {
      const dbSession = sessionResult.rows[0];
      console.log('✅ [AUTH] Session found in database');
      console.log('🔍 [AUTH] User ID:', dbSession.user_id);
      console.log('🔍 [AUTH] Username:', dbSession.username);
      console.log('🔍 [AUTH] Role:', dbSession.role);
      
      // Update last activity
      await q(`
        UPDATE user_sessions 
        SET last_activity = NOW() 
        WHERE id = $1
      `, [sessionId]);
      
      req.session = {
        id: dbSession.id,
        userId: dbSession.user_id,
        username: dbSession.username || dbSession.full_name
      };
      req.user = { 
        id: dbSession.user_id, 
        username: dbSession.username,
        full_name: dbSession.full_name,
        email: dbSession.email,
        role: dbSession.role
      };
      console.log('✅ [AUTH] Session validated, calling next()');
      return next();
    }
    
    console.log('⚠️ [AUTH] No session found in database, checking memory...');
    
    // Fall back to memory session
    const memorySession = SessionManager.getSession(sessionId);
    if (memorySession) {
      console.log('✅ [AUTH] Session found in memory');
      req.session = memorySession;
      req.user = { id: memorySession.userId, username: memorySession.username };
      return next();
    }
    
    // No valid session found
    console.log('❌ [AUTH] No valid session found - returning 401');
    return res.status(401).json({ error: 'Invalid or expired session' });
  } catch (error) {
    console.error('❌ [AUTH] Session validation error:', error);
    
    // Try memory session as fallback
    const memorySession = SessionManager.getSession(sessionId);
    if (memorySession) {
      console.log('✅ [AUTH] Session found in memory (fallback)');
      req.session = memorySession;
      req.user = { id: memorySession.userId, username: memorySession.username };
      return next();
    }
    
    console.log('❌ [AUTH] Session validation failed - returning 401');
    return res.status(401).json({ error: 'Session validation failed' });
  }
};

// Optional auth middleware
export const optionalAuth = (req, res, next) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.sessionId ||
                   req.headers['x-session-id'] ||
                   req.headers['X-Session-ID'];
  
  if (sessionId) {
    const session = SessionManager.getSession(sessionId);
    if (session) {
      req.session = session;
      req.user = { id: session.userId, username: session.username };
    }
  }
  
  next();
};
