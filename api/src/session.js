import { q } from "./db.js";
import { validateSessionMetadata } from "./utils/security.js";

// Session configuration
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes idle timeout

/**
 * SessionManager - kept for legacy/non-browser client compatibility only
 * Browser clients MUST use DB sessions via cookies. This fallback is disabled by default.
 * @deprecated Use database sessions instead
 */
const ENABLE_MEMORY_SESSIONS = process.env.ENABLE_MEMORY_SESSIONS === 'true';
const sessions = new Map();
const SESSION_TIMEOUT = 60 * 60 * 1000;

export class SessionManager {
  static createSession(userId, username, fingerprint = null) {
    if (!ENABLE_MEMORY_SESSIONS) {
      throw new Error('Memory sessions are disabled. Use database sessions.');
    }
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
    
    const session = {
      id: sessionId,
      userId,
      username,
      fingerprint,
      createdAt: new Date(),
      expiresAt,
      lastActivity: new Date()
    };
    
    sessions.set(sessionId, session);
    this.cleanupExpiredSessions();
    return sessionId;
  }
  
  static getSession(sessionId, fingerprint = null) {
    if (!ENABLE_MEMORY_SESSIONS) return null;
    
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    
    if (fingerprint && session.fingerprint && session.fingerprint !== fingerprint) {
      sessions.delete(sessionId);
      return null;
    }
    
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
  
  static generateSessionFingerprint(req) {
    const crypto = require('crypto');
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex');
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

/**
 * Authentication middleware - requires valid session
 * Sessions are validated against PostgreSQL (primary) only.
 * Returns 401 if session is missing, invalid, or expired.
 */
export const requireAuth = async (req, res, next) => {
  // Check cookies FIRST (standard for web apps), then headers (for API clients)
  const sessionId = req.cookies?.sessionId ||
                   req.headers['x-session-id'] ||
                   req.headers['X-Session-ID'] ||
                   req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Validate session against database only
    // Enforce user active status and employee termination checks
    const sessionResult = await q(`
      SELECT 
        s.id, 
        s.user_id, 
        s.expires_at,
        s.idle_timeout_at,
        s.user_agent_hash,
        s.ip_address,
        s.ip_prefix,
        u.email, 
        u.username,
        u.employee_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
        COALESCE(r.role_name, 'user') as role,
        e.status as employee_status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE s.id = $1 
        AND s.expires_at > NOW()
        AND (s.idle_timeout_at IS NULL OR s.idle_timeout_at > NOW())
        AND u.is_active = true
        AND (u.employee_id IS NULL OR e.status IN ('Active', 'On Leave'))
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const dbSession = sessionResult.rows[0];
    
    // Validate session metadata (user agent binding)
    const metaValidation = validateSessionMetadata(dbSession, req);
    if (!metaValidation.valid) {
      // Delete the compromised session
      await q(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
      return res.status(401).json({ 
        error: 'Session security violation',
        reason: metaValidation.detail || 'Session fingerprint mismatch'
      });
    }
    
    // Update last activity and extend idle timeout
    const newIdleTimeout = new Date(Date.now() + IDLE_TIMEOUT_MS);
    await q(`
      UPDATE user_sessions 
      SET last_activity = NOW(),
          idle_timeout_at = $2
      WHERE id = $1
    `, [sessionId, newIdleTimeout]);
    
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
    
    return next();
    
  } catch (error) {
    console.error('[Auth] Session validation error:', error.message);
    return res.status(401).json({ error: 'Session validation failed' });
  }
};

/**
 * Optional authentication middleware - attaches user if session exists but doesn't fail
 */
export const optionalAuth = async (req, res, next) => {
  const sessionId = req.cookies?.sessionId ||
                   req.headers['x-session-id'] ||
                   req.headers['X-Session-ID'] ||
                   req.headers.authorization?.replace('Bearer ', '');
  
  if (sessionId) {
    try {
      const sessionResult = await q(`
        SELECT 
          s.id, 
          s.user_id, 
          s.expires_at,
          s.idle_timeout_at,
          s.user_agent_hash,
          s.ip_address,
          s.ip_prefix,
          u.email, 
          u.username,
          u.employee_id,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
          COALESCE(r.role_name, 'user') as role,
          e.status as employee_status
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN hr_roles r ON u.role_id = r.id
        LEFT JOIN employees e ON u.employee_id = e.id
        WHERE s.id = $1 
          AND s.expires_at > NOW()
          AND (s.idle_timeout_at IS NULL OR s.idle_timeout_at > NOW())
          AND u.is_active = true
          AND (u.employee_id IS NULL OR e.status IN ('Active', 'On Leave'))
      `, [sessionId]);
      
      if (sessionResult.rows.length > 0) {
        const dbSession = sessionResult.rows[0];
        
        // Validate session metadata - for optional auth, just skip if invalid
        const metaValidation = validateSessionMetadata(dbSession, req);
        if (metaValidation.valid) {
          // Update last activity and extend idle timeout
          const newIdleTimeout = new Date(Date.now() + IDLE_TIMEOUT_MS);
          await q(`
            UPDATE user_sessions 
            SET last_activity = NOW(),
                idle_timeout_at = $2
            WHERE id = $1
          `, [sessionId, newIdleTimeout]);
          
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
        }
      }
    } catch (error) {
      // Don't fail on optional auth errors, just continue without auth
    }
  }
  
  next();
};
