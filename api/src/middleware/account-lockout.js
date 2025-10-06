/**
 * Account Lockout Middleware - MLGA Phase 2
 * Prevents brute force attacks by locking accounts after failed attempts
 */

import { q } from '../db.js';

// In-memory store for failed attempts (in production, use Redis)
const failedAttempts = new Map();
const lockedAccounts = new Map();

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export class AccountLockout {
  /**
   * Record a failed login attempt
   */
  static recordFailedAttempt(identifier, ipAddress, userAgent) {
    const key = `${identifier}:${ipAddress}`;
    const now = Date.now();
    
    // Get existing attempts
    let attempts = failedAttempts.get(key) || [];
    
    // Remove attempts outside the window
    attempts = attempts.filter(attempt => now - attempt.timestamp < ATTEMPT_WINDOW);
    
    // Add new attempt
    attempts.push({
      timestamp: now,
      userAgent
    });
    
    failedAttempts.set(key, attempts);
    
    // Check if should lock account
    if (attempts.length >= MAX_FAILED_ATTEMPTS) {
      this.lockAccount(identifier, ipAddress);
      
      // Log to database
      this.logSecurityEvent(identifier, ipAddress, userAgent, 'account_locked');
      
      return {
        locked: true,
        attemptsRemaining: 0,
        lockoutEndsAt: new Date(now + LOCKOUT_DURATION)
      };
    }
    
    // Log to database
    this.logSecurityEvent(identifier, ipAddress, userAgent, 'failed_login');
    
    return {
      locked: false,
      attemptsRemaining: MAX_FAILED_ATTEMPTS - attempts.length,
      lockoutEndsAt: null
    };
  }
  
  /**
   * Lock an account
   */
  static lockAccount(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    const now = Date.now();
    
    lockedAccounts.set(key, {
      lockedAt: now,
      expiresAt: now + LOCKOUT_DURATION,
      identifier,
      ipAddress
    });
    
    console.warn(`🔒 Account locked: ${identifier} from ${ipAddress}`);
  }
  
  /**
   * Check if an account is locked
   */
  static isAccountLocked(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    const lock = lockedAccounts.get(key);
    
    if (!lock) {
      return { locked: false };
    }
    
    const now = Date.now();
    
    // Check if lockout has expired
    if (now >= lock.expiresAt) {
      lockedAccounts.delete(key);
      failedAttempts.delete(key);
      return { locked: false };
    }
    
    const remainingMs = lock.expiresAt - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    
    return {
      locked: true,
      lockedAt: new Date(lock.lockedAt),
      expiresAt: new Date(lock.expiresAt),
      remainingMinutes
    };
  }
  
  /**
   * Clear failed attempts on successful login
   */
  static clearFailedAttempts(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    failedAttempts.delete(key);
    lockedAccounts.delete(key);
  }
  
  /**
   * Log security event to database
   */
  static async logSecurityEvent(identifier, ipAddress, userAgent, eventType) {
    try {
      await q(`
        INSERT INTO failed_login_attempts (ip_address, username, user_agent, attempted_at, is_blocked)
        VALUES ($1, $2, $3, NOW(), $4)
      `, [ipAddress, identifier, userAgent, eventType === 'account_locked']);
    } catch (error) {
      console.error('Failed to log security event:', error.message);
    }
  }
  
  /**
   * Get lockout statistics
   */
  static getStatistics() {
    return {
      failedAttempts: failedAttempts.size,
      lockedAccounts: lockedAccounts.size,
      accounts: Array.from(lockedAccounts.values()).map(lock => ({
        identifier: lock.identifier,
        ipAddress: lock.ipAddress,
        lockedAt: new Date(lock.lockedAt),
        expiresAt: new Date(lock.expiresAt)
      }))
    };
  }
}

/**
 * Middleware to check account lockout before login
 */
export const checkAccountLockout = (req, res, next) => {
  const { username } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  if (!username) {
    return next();
  }
  
  const lockStatus = AccountLockout.isAccountLocked(username, ipAddress);
  
  if (lockStatus.locked) {
    return res.status(429).json({
      error: 'Account temporarily locked due to multiple failed login attempts',
      message: `Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minute(s).`,
      lockedUntil: lockStatus.expiresAt,
      remainingMinutes: lockStatus.remainingMinutes
    });
  }
  
  next();
};

export default {
  AccountLockout,
  checkAccountLockout
};

