import { describe, it, expect } from 'vitest';
import { 
  hashPassword, 
  comparePassword, 
  sanitizeString, 
  sanitizeEmail, 
  escapeSqlString, 
  escapeHtml, 
  validatePasswordStrength,
  generateSecureSessionId 
} from '../utils/security.js';

describe('Security Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should verify correct passwords', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize strings correctly', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeString(maliciousInput);
      
      expect(sanitized).toBe('scriptalert(xss)/scriptHello World');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should sanitize emails correctly', () => {
      const maliciousEmail = 'test@example.com<script>alert("xss")</script>';
      const sanitized = sanitizeEmail(maliciousEmail);
      
      expect(sanitized).toBe('test@example.comscriptalertxssscript');
      expect(sanitized).toMatch(/^[a-z0-9@._-]+$/);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should escape SQL strings correctly', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const escaped = escapeSqlString(maliciousInput);
      
      expect(escaped).toBe("'' DROP TABLE users ");
      expect(escaped).not.toContain("';");
    });

    it('should remove SQL comments', () => {
      const maliciousInput = "test'; -- comment\n/* block comment */";
      const escaped = escapeSqlString(maliciousInput);
      
      expect(escaped).not.toContain('--');
      expect(escaped).not.toContain('/*');
      expect(escaped).not.toContain('*/');
    });
  });

  describe('XSS Protection', () => {
    it('should escape HTML entities correctly', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const escaped = escapeHtml(maliciousInput);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(escaped).not.toContain('<script>');
    });

    it('should handle various HTML entities', () => {
      const input = 'Test & "quotes" and <tags>';
      const escaped = escapeHtml(input);
      
      expect(escaped).toBe('Test &amp; &quot;quotes&quot; and &lt;tags&gt;');
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'StrongPass123!';
      const result = validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPassword = 'weak';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should identify specific password weaknesses', () => {
      const noUppercase = 'lowercase123!';
      const result = validatePasswordStrength(noUppercase);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });
  });

  describe('Session ID Generation', () => {
    it('should generate secure session IDs', () => {
      const sessionId1 = generateSecureSessionId();
      const sessionId2 = generateSecureSessionId();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(sessionId1).toMatch(/^[a-f0-9]+$/);
    });
  });
});
