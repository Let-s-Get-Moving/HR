// Enhanced Security Middleware
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { q } from '../db.js';

// Rate limiting configurations
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Strict rate limiting for auth endpoints
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

// General API rate limiting
export const apiRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// File upload rate limiting
export const uploadRateLimit = createRateLimit(60 * 60 * 1000, 10); // 10 uploads per hour

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// SQL injection protection
export const sqlInjectionProtection = (req, res, next) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
    /(\b(OR|AND)\s+1\s*=\s*1)/gi,
    /(UNION\s+SELECT)/gi,
    /(DROP\s+TABLE)/gi,
    /(DELETE\s+FROM)/gi,
    /(INSERT\s+INTO)/gi,
    /(UPDATE\s+SET)/gi,
    /(ALTER\s+TABLE)/gi,
    /(CREATE\s+TABLE)/gi,
    /(EXEC\s*\()/gi,
    /(SCRIPT\b)/gi
  ];

  const checkInput = (input) => {
    if (typeof input === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(input));
    }
    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkInput);
    }
    return false;
  };

  const inputs = [req.body, req.query, req.params];
  for (const input of inputs) {
    if (input && checkInput(input)) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content'
      });
    }
  }

  next();
};

// XSS protection
export const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /<style/gi
  ];

  const checkXSS = (input) => {
    if (typeof input === 'string') {
      return xssPatterns.some(pattern => pattern.test(input));
    }
    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkXSS);
    }
    return false;
  };

  const inputs = [req.body, req.query, req.params];
  for (const input of inputs) {
    if (input && checkXSS(input)) {
      return res.status(400).json({
        error: 'XSS attack detected',
        message: 'Request contains potentially malicious scripts'
      });
    }
  }

  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseInt(maxSize) * 1024 * 1024; // Convert MB to bytes

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds ${maxSize} limit`
      });
    }

    next();
  };
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized'
      });
    }

    next();
  };
};

// Audit logging middleware
export const auditLog = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          await q(`
            INSERT INTO audit_logs (user_id, action, ip_address, user_agent, request_data, response_status, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            req.user?.id || null,
            action,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent') || '',
            JSON.stringify({
              method: req.method,
              url: req.originalUrl,
              body: req.method !== 'GET' ? req.body : null,
              query: req.query
            }),
            res.statusCode,
            new Date()
          ]);
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
      
      originalSend.call(this, data);
    };

    next();
  };
};

// Session security middleware
export const sessionSecurity = (req, res, next) => {
  // Check for session hijacking indicators
  const userAgent = req.get('User-Agent');
  const session = req.session;
  
  if (session && session.userAgent && session.userAgent !== userAgent) {
    // User agent changed - potential session hijacking
    console.warn('Potential session hijacking detected:', {
      userId: session.userId,
      originalUA: session.userAgent,
      currentUA: userAgent,
      ip: req.ip
    });
    
    // Optionally invalidate session
    // SessionManager.destroySession(session.id);
  }
  
  // Update session with current user agent
  if (session) {
    session.userAgent = userAgent;
    session.lastIP = req.ip;
  }
  
  next();
};

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid or missing CSRF token'
    });
  }
  
  next();
};

// Generate CSRF token
export const generateCSRFToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

const calculatePasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (password.length >= 16) score++;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  if (score <= 6) return 'strong';
  return 'very-strong';
};

export default {
  createRateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  securityHeaders,
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  requestSizeLimit,
  ipWhitelist,
  auditLog,
  sessionSecurity,
  csrfProtection,
  generateCSRFToken,
  validatePasswordStrength
};