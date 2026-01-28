/**
 * CSRF Protection Middleware - MLGA Phase 2
 * Protects against Cross-Site Request Forgery attacks
 */

import crypto from 'crypto';

// In-memory store for CSRF tokens (in production, use Redis or session storage)
const csrfTokens = new Map();

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

export class CSRFProtection {
  /**
   * Generate a CSRF token for a session
   */
  static generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + TOKEN_EXPIRATION;
    
    csrfTokens.set(sessionId, {
      token,
      expiresAt,
      createdAt: Date.now()
    });
    
    // Cleanup expired tokens periodically
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  /**
   * Validate a CSRF token
   */
  static validateToken(sessionId, token) {
    const stored = csrfTokens.get(sessionId);
    
    if (!stored) {
      return false;
    }
    
    // Check expiration
    if (Date.now() > stored.expiresAt) {
      csrfTokens.delete(sessionId);
      return false;
    }
    
    // Compare tokens (timing-safe comparison)
    const expected = Buffer.from(stored.token);
    const actual = Buffer.from(token);
    
    if (expected.length !== actual.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expected, actual);
  }
  
  /**
   * Remove token for a session
   */
  static removeToken(sessionId) {
    csrfTokens.delete(sessionId);
  }
  
  /**
   * Clean up expired tokens
   */
  static cleanupExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
      if (now > data.expiresAt) {
        csrfTokens.delete(sessionId);
      }
    }
  }
}

/**
 * Middleware to require CSRF token for state-changing operations
 */
export const requireCSRFToken = (req, res, next) => {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for auth endpoints that don't have a session yet
  // (login uses credentials, verify-mfa uses tempToken, change-password can use tempToken)
  const skipPaths = [
    '/auth/login',
    '/auth/verify-mfa',
    '/auth/change-password',
    '/auth/logout',  // Logout is safe to allow without CSRF (just destroys session)
    '/auth/create-user', // Uses requireAuth separately
  ];
  
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Get session ID from cookie (primary) or headers (backwards compat for non-browser clients)
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
  
  // Validate token
  if (!CSRFProtection.validateToken(sessionId, csrfToken)) {
    console.warn(`CSRF validation failed for session ${sessionId.substring(0, 8)}...`);
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed'
    });
  }
  
  next();
};

/**
 * Middleware to add CSRF token to login response
 */
export const attachCSRFToken = (req, res, next) => {
  // Override res.json to inject CSRF token
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    // If this is a login response with a sessionId, add CSRF token
    if (data.sessionId) {
      const csrfToken = CSRFProtection.generateToken(data.sessionId);
      data.csrfToken = csrfToken;
    }
    
    return originalJson(data);
  };
  
  next();
};

export default {
  CSRFProtection,
  requireCSRFToken,
  attachCSRFToken
};

