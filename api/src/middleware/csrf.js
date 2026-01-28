/**
 * CSRF Protection Middleware - DB-backed storage
 * Protects against Cross-Site Request Forgery attacks
 * Tokens are stored as SHA-256 hashes in Postgres for multi-instance support
 */

import crypto from 'crypto';
import { q } from '../db.js';

// Token expiration time (1 hour)
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Hash a token using SHA-256
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class CSRFProtection {
  /**
   * Generate a CSRF token for a session and store hash in DB
   */
  static async generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);
    
    try {
      // Upsert: replace existing token for this session (single token per session)
      await q(`
        INSERT INTO csrf_tokens (session_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          rotated_at = NOW()
      `, [sessionId, tokenHash, expiresAt]);
      
      return token;
    } catch (error) {
      console.error('[CSRF] Failed to store token in DB:', error.message);
      throw new Error('CSRF token generation failed');
    }
  }
  
  /**
   * Validate a CSRF token against DB
   */
  static async validateToken(sessionId, token) {
    if (!sessionId || !token) {
      return false;
    }
    
    const tokenHash = hashToken(token);
    
    try {
      const result = await q(`
        SELECT token_hash, expires_at 
        FROM csrf_tokens 
        WHERE session_id = $1 AND expires_at > NOW()
      `, [sessionId]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const stored = result.rows[0];
      
      // Timing-safe comparison of hashes
      const expected = Buffer.from(stored.token_hash, 'hex');
      const actual = Buffer.from(tokenHash, 'hex');
      
      if (expected.length !== actual.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(expected, actual);
    } catch (error) {
      console.error('[CSRF] Token validation DB error:', error.message);
      return false;
    }
  }
  
  /**
   * Remove token(s) for a session (on logout)
   */
  static async removeToken(sessionId) {
    try {
      await q(`DELETE FROM csrf_tokens WHERE session_id = $1`, [sessionId]);
    } catch (error) {
      console.error('[CSRF] Failed to remove token:', error.message);
    }
  }
  
  /**
   * Clean up expired tokens (called periodically or on generate)
   */
  static async cleanupExpiredTokens() {
    try {
      await q(`DELETE FROM csrf_tokens WHERE expires_at < NOW()`);
    } catch (error) {
      // Non-critical, just log
      console.error('[CSRF] Cleanup error:', error.message);
    }
  }
}

/**
 * Middleware to require CSRF token for state-changing operations
 */
export const requireCSRFToken = async (req, res, next) => {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for auth endpoints that don't have a session yet
  const skipPaths = [
    '/auth/login',
    '/auth/verify-mfa',
    '/auth/change-password',
    '/auth/logout',
    '/auth/create-user',
  ];
  
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Get session ID from cookie (primary) or headers (for non-browser clients)
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Session required for CSRF validation' });
  }
  
  // Get CSRF token from header
  const csrfToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  
  if (!csrfToken) {
    return res.status(403).json({ 
      error: 'CSRF token required',
      message: 'Missing CSRF token in X-CSRF-Token header'
    });
  }
  
  // Validate token against DB
  const isValid = await CSRFProtection.validateToken(sessionId, csrfToken);
  if (!isValid) {
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed'
    });
  }
  
  next();
};

/**
 * Middleware to add CSRF token to login response (deprecated - use GET /api/auth/csrf instead)
 */
export const attachCSRFToken = (req, res, next) => {
  // This middleware is kept for backwards compatibility but
  // the recommended flow is: login -> GET /api/auth/csrf -> store token in memory
  next();
};

export default {
  CSRFProtection,
  requireCSRFToken,
  attachCSRFToken
};
