// Security utilities for frontend

// XSS Protection
export class XSSProtection {
  // Sanitize HTML content
  static sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  // Sanitize user input
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate and sanitize URL
  static sanitizeURL(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return null;
      }
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  // Escape HTML entities
  static escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, (s) => map[s]);
  }
}

// CSRF Protection
export class CSRFProtection {
  private static token: string | null = null;

  // Generate CSRF token
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Set CSRF token
  static setToken(token: string): void {
    this.token = token;
  }

  // Get CSRF token
  static getToken(): string | null {
    return this.token;
  }

  // Validate CSRF token
  static validateToken(token: string): boolean {
    return this.token === token;
  }

  // Add CSRF token to headers
  static addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
    if (this.token) {
      return {
        ...headers,
        'X-CSRF-Token': this.token,
      };
    }
    return headers;
  }
}

// Input Validation
export class InputValidator {
  // Validate email
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  static isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // Validate phone number
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // Validate URL
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validate file type
  static isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  // Validate file size
  static isValidFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // Sanitize filename
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }
}

// Content Security Policy
export class CSPManager {
  private static policies: string[] = [];

  // Add CSP policy
  static addPolicy(policy: string): void {
    this.policies.push(policy);
  }

  // Get CSP header value
  static getCSPHeader(): string {
    return this.policies.join('; ');
  }

  // Set default CSP policies
  static setDefaultPolicies(): void {
    this.policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
  }
}

// Rate Limiting (Client-side)
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map();
  private static limits: Map<string, { max: number; window: number }> = new Map();

  // Set rate limit for a key
  static setLimit(key: string, max: number, windowMs: number): void {
    this.limits.set(key, { max, window: windowMs });
  }

  // Check if request is allowed
  static isAllowed(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < limit.window);
    
    // Check if under limit
    if (validRequests.length >= limit.max) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  // Get remaining requests
  static getRemaining(key: string): number {
    const limit = this.limits.get(key);
    if (!limit) return Infinity;

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < limit.window);
    
    return Math.max(0, limit.max - validRequests.length);
  }

  // Reset rate limit for a key
  static reset(key: string): void {
    this.requests.delete(key);
  }
}

// Secure Storage
export class SecureStorage {
  // Encrypt data before storing
  static async encrypt(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      cryptoKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      dataBuffer
    );
    
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...result));
  }

  // Decrypt data after retrieving
  static async decrypt(encryptedData: string, key: string): Promise<string> {
    const decoder = new TextDecoder();
    const keyBuffer = new TextEncoder().encode(key);
    
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      cryptoKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encrypted
    );
    
    return decoder.decode(decrypted);
  }

  // Secure set item
  static async setItem(key: string, value: string, encryptionKey?: string): Promise<void> {
    if (encryptionKey) {
      const encrypted = await this.encrypt(value, encryptionKey);
      localStorage.setItem(key, encrypted);
    } else {
      localStorage.setItem(key, value);
    }
  }

  // Secure get item
  static async getItem(key: string, encryptionKey?: string): Promise<string | null> {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    if (encryptionKey) {
      try {
        return await this.decrypt(value, encryptionKey);
      } catch {
        return null;
      }
    }
    
    return value;
  }
}

// Security Headers
export class SecurityHeaders {
  // Get security headers for API requests
  static getSecurityHeaders(): HeadersInit {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }
}

// Initialize security features
export function initializeSecurity(): void {
  // Set up rate limiting
  RateLimiter.setLimit('api', 100, 60000); // 100 requests per minute
  RateLimiter.setLimit('login', 5, 300000); // 5 login attempts per 5 minutes
  
  // Set up CSP
  CSPManager.setDefaultPolicies();
  
  // Generate CSRF token
  const csrfToken = CSRFProtection.generateToken();
  CSRFProtection.setToken(csrfToken);
  
  console.log('Security features initialized');
}

export default {
  XSSProtection,
  CSRFProtection,
  InputValidator,
  CSPManager,
  RateLimiter,
  SecureStorage,
  SecurityHeaders,
  initializeSecurity,
};
