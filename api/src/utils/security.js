import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

// Password hashing utilities
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Input sanitization
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent injection
    .substring(0, 255); // Limit length
};

export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow valid email characters
    .substring(0, 254);
};

// SQL injection protection
export const escapeSqlString = (str) => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment starts
    .replace(/\*\//g, ''); // Remove block comment ends
};

// XSS protection
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validation schemas
export const userSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email must be less than 254 characters')
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
};

// Audit logging
export const logSecurityEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    level: 'SECURITY'
  };
  
  console.log(`[SECURITY] ${timestamp} - ${event}:`, details);
  
  // In production, this would be sent to a proper logging service
  // For now, we'll just log to console
};

// Session security
export const generateSecureSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash user agent string for session binding
 */
export const hashUserAgent = (userAgent) => {
  if (!userAgent) return null;
  return crypto.createHash('sha256').update(userAgent).digest('hex');
};

/**
 * Extract IP prefix (first 3 octets for IPv4, first 3 groups for IPv6)
 * Used for soft session binding that tolerates mobile IP changes
 */
export const getIpPrefix = (ip) => {
  if (!ip) return null;
  
  // Clean up IPv6-mapped IPv4 addresses
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // IPv4 handling
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanIp)) {
    return cleanIp.replace(/\.\d{1,3}$/, '');
  }
  
  // IPv6 handling - return first 3 groups
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    return parts.slice(0, 3).join(':');
  }
  
  return cleanIp;
};

/**
 * Create session metadata object from request
 */
export const createSessionMetadata = (req) => {
  const userAgent = req.headers['user-agent'] || null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  
  return {
    user_agent_hash: hashUserAgent(userAgent),
    ip_address: ip,
    ip_prefix: getIpPrefix(ip),
    metadata: {
      created_from: 'login',
      browser_info: userAgent ? userAgent.substring(0, 200) : null,
    }
  };
};

/**
 * Validate session metadata against current request
 * Returns { valid: boolean, reason?: string }
 */
export const validateSessionMetadata = (session, req) => {
  // If no metadata stored, skip validation (backwards compat)
  if (!session.user_agent_hash && !session.ip_prefix) {
    return { valid: true };
  }
  
  const currentUserAgent = req.headers['user-agent'] || null;
  const currentIp = req.ip || req.connection?.remoteAddress || null;
  
  // User agent hash must match (strict)
  if (session.user_agent_hash) {
    const currentHash = hashUserAgent(currentUserAgent);
    if (currentHash !== session.user_agent_hash) {
      return { 
        valid: false, 
        reason: 'user_agent_mismatch',
        detail: 'Browser fingerprint changed'
      };
    }
  }
  
  // IP prefix check is soft - only flag, don't reject
  // (users on mobile/VPN may have different IPs)
  if (session.ip_prefix && currentIp) {
    const currentPrefix = getIpPrefix(currentIp);
    if (currentPrefix !== session.ip_prefix) {
      // Log but don't reject - IP changes are common
      console.warn(`[Session] IP prefix changed: ${session.ip_prefix} -> ${currentPrefix}`);
    }
  }
  
  return { valid: true };
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
