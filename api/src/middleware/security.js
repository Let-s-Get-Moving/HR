// Corporate-Grade Security Middleware
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { q } from '../db.js';

// Create DOMPurify instance for server-side use
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Enhanced rate limiting configurations
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health' || req.path === '/health';
    },
    keyGenerator: (req) => {
      // Use IP + User Agent for more accurate rate limiting
      return `${req.ip}-${req.get('User-Agent')}`;
    }
  });
};

// Strict rate limiting for auth endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

// General API rate limiting
export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 requests
  'Too many requests from this IP. Please try again later.'
);

// File upload rate limiting
export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many file uploads. Please try again later.'
);

// Admin operations rate limiting
export const adminRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20, // 20 requests
  'Too many admin operations. Please try again later.'
);

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api-hr.onrender.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// XSS prevention using DOMPurify
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return DOMPurify.sanitize(str);
};

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input data' });
  }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  } else if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  return obj;
};

// Password strength validation
export const passwordStrength = (req, res, next) => {
  const { password } = req.body;
  if (password) {
    const strength = calculatePasswordStrength(password);
    if (strength.score < 3) {
      return res.status(400).json({ 
        error: 'Password is too weak',
        score: strength.score,
        feedback: strength.feedback,
        suggestions: strength.suggestions
      });
    }
  }
  next();
};

// Password strength calculator
const calculatePasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    common: !['password', '123456', 'qwerty', 'admin'].includes(password.toLowerCase())
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const feedback = [];
  const suggestions = [];
  
  if (!checks.length) {
    feedback.push('Password must be at least 8 characters long');
    suggestions.push('Use at least 8 characters');
  }
  if (!checks.lowercase) {
    feedback.push('Password must contain lowercase letters');
    suggestions.push('Add lowercase letters (a-z)');
  }
  if (!checks.uppercase) {
    feedback.push('Password must contain uppercase letters');
    suggestions.push('Add uppercase letters (A-Z)');
  }
  if (!checks.numbers) {
    feedback.push('Password must contain numbers');
    suggestions.push('Add numbers (0-9)');
  }
  if (!checks.symbols) {
    feedback.push('Password must contain special characters');
    suggestions.push('Add special characters (!@#$%^&*)');
  }
  if (!checks.common) {
    feedback.push('Password is too common');
    suggestions.push('Use a unique password');
  }
  
  return { score, feedback, suggestions };
};

// Enhanced audit logging
export const auditLog = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'anonymous';
    const action = `${req.method} ${req.originalUrl}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    
    // Log to console for monitoring
    console.log(`AUDIT: ${timestamp} - User ${username} (ID: ${userId}) performed ${action} from ${ipAddress}`);
    
    // Log to database
    await q(`
      INSERT INTO audit_logs (user_id, username, action, ip_address, user_agent, timestamp, request_body)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId, 
      username, 
      action, 
      ipAddress, 
      userAgent, 
      timestamp,
      JSON.stringify(req.body || {}).substring(0, 1000) // Limit body size
    ]).catch(err => {
      console.error("Failed to write audit log to DB:", err.message);
    });
    
  } catch (error) {
    console.error("Error in audit logging middleware:", error);
  } finally {
    next();
  }
};

// Session security middleware
export const sessionSecurity = (req, res, next) => {
  // Check for session hijacking indicators
  const currentIP = req.ip;
  const currentUserAgent = req.headers['user-agent'];
  
  if (req.session) {
    if (req.session.ipAddress && req.session.ipAddress !== currentIP) {
      console.warn(`Potential session hijacking detected for user ${req.session.userId}: IP changed from ${req.session.ipAddress} to ${currentIP}`);
      // In a real implementation, you might want to invalidate the session
    }
    
    if (req.session.userAgent && req.session.userAgent !== currentUserAgent) {
      console.warn(`Potential session hijacking detected for user ${req.session.userId}: User-Agent changed`);
      // In a real implementation, you might want to invalidate the session
    }
    
    // Update session with current IP and User-Agent
    req.session.ipAddress = currentIP;
    req.session.userAgent = currentUserAgent;
  }
  
  next();
};

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // In a real implementation, validate against database
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      return res.status(413).json({ 
        error: 'Request too large',
        maxSize: maxSize,
        received: `${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB`
      });
    }
    
    next();
  };
};

// Parse size string to bytes
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  
  if (!match) {
    throw new Error('Invalid size format');
  }
  
  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
};

// SQL injection prevention
export const sqlInjectionPrevention = (req, res, next) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(\b(OR|AND)\s+1\s*=\s*1)/i,
    /(\b(OR|AND)\s+0\s*=\s*0)/i,
    /(\b(OR|AND)\s+true)/i,
    /(\b(OR|AND)\s+false)/i,
    /(UNION\s+SELECT)/i,
    /(DROP\s+TABLE)/i,
    /(DELETE\s+FROM)/i,
    /(INSERT\s+INTO)/i,
    /(UPDATE\s+SET)/i,
    /(ALTER\s+TABLE)/i,
    /(CREATE\s+TABLE)/i,
    /(EXEC\s*\()/i,
    /(SCRIPT\s*\()/i
  ];
  
  const checkObject = (obj, path = '') => {
    // Check if obj is null, undefined, or not an object
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            console.warn(`Potential SQL injection attempt detected at ${currentPath}: ${value}`);
            return res.status(400).json({ 
              error: 'Invalid input detected',
              field: currentPath
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };
  
  const result = checkObject(req.body) || checkObject(req.query) || checkObject(req.params);
  if (result) return result;
  
  next();
};

// CORS security enhancement
export const corsSecurity = (req, res, next) => {
  // Allowed origins
  const allowedOrigins = [
    'https://hr-web.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'https://hr-web.onrender.com');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Session-ID, x-session-id, X-CSRF-Token, X-API-Key');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Export all security middleware
export default {
  createRateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  adminRateLimit,
  securityHeaders,
  sanitizeInput,
  passwordStrength,
  auditLog,
  sessionSecurity,
  validateApiKey,
  requestSizeLimit,
  sqlInjectionPrevention,
  corsSecurity
};