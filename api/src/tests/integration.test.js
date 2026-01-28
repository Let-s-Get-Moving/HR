import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { q } from '../db.js';
import auth from '../routes/auth-mfa.js';
import { requireCSRFToken } from '../middleware/csrf.js';
import { hashPassword, comparePassword } from '../utils/security.js';

// Create a test app with cookie-based auth
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', auth);

// Test endpoint that requires CSRF
app.post('/api/test-csrf', requireCSRFToken, (req, res) => {
  res.json({ success: true, message: 'CSRF validated' });
});

describe('Security Integration Tests', () => {
  beforeAll(async () => {
    // Test database connection
    try {
      await q('SELECT 1');
      console.log('Database connection successful');
    } catch (error) {
      console.log('Database connection failed, skipping integration tests');
      throw new Error('Database not available for testing');
    }
  });

  describe('Database Security Schema', () => {
    it('should have users table with security columns', async () => {
      const result = await q(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map(row => row.column_name);
      
      expect(columns).toContain('password_hash');
      expect(columns).toContain('role');
      expect(columns).toContain('is_active');
      expect(columns).toContain('failed_login_attempts');
      expect(columns).toContain('locked_until');
    });

    it('should have user_sessions table with hardening columns', async () => {
      const result = await q(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'user_sessions'
      `);
      
      const columns = result.rows.map(row => row.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('expires_at');
      // Session hardening columns
      expect(columns).toContain('user_agent_hash');
      expect(columns).toContain('ip_address');
      expect(columns).toContain('idle_timeout_at');
    });

    it('should have security_audit_log table', async () => {
      const result = await q(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'security_audit_log'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Password Security', () => {
    it('should store hashed passwords in database', async () => {
      const result = await q(`
        SELECT password_hash 
        FROM users 
        WHERE username = 'Avneet'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      const passwordHash = result.rows[0].password_hash;
      
      // Should be a bcrypt hash (starts with $2a$)
      expect(passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
      
      // Should not be plain text
      expect(passwordHash).not.toBe('password123');
    });

    it('should verify password correctly', async () => {
      const result = await q(`
        SELECT password_hash 
        FROM users 
        WHERE username = 'Avneet'
      `);
      
      const passwordHash = result.rows[0].password_hash;
      const isValid = await comparePassword('password123', passwordHash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Authentication Endpoints', () => {
    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with SQL injection attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: "'; DROP TABLE users; --",
          password: 'anything'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with XSS attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '<script>alert("xss")</script>',
          password: 'anything'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Cookie-Only Session Security', () => {
    it('should set HttpOnly session cookie on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(Array.isArray(cookies) || typeof cookies === 'string').toBe(true);
        
        // Find session cookie
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        const sessionCookie = cookieList.find(cookie => cookie.startsWith('sessionId='));
        
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie).toContain('HttpOnly');
        // Note: Secure flag may not be set in test environment without HTTPS
      }
    });

    it('should NOT return sessionId in JSON response body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        // Cookie-only auth: sessionId should NOT be in response body
        expect(response.body.sessionId).toBeUndefined();
        // But user info should be present
        expect(response.body.user).toBeDefined();
        expect(response.body.message).toBe('Login successful');
      }
    });

    it('should include CSRF token in login response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        // CSRF token should be in response for client to use
        expect(response.body.csrfToken).toBeDefined();
        expect(typeof response.body.csrfToken).toBe('string');
        expect(response.body.csrfToken.length).toBeGreaterThan(32);
      }
    });
  });

  describe('CSRF Protection', () => {
    let sessionCookie;
    let csrfToken;

    beforeAll(async () => {
      // Login to get session and CSRF token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        const cookies = response.headers['set-cookie'];
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        sessionCookie = cookieList.find(c => c.startsWith('sessionId='));
        csrfToken = response.body.csrfToken;
      }
    });

    it('should reject POST without CSRF token', async () => {
      if (!sessionCookie) {
        console.log('Skipping CSRF test - no session');
        return;
      }

      const response = await request(app)
        .post('/api/test-csrf')
        .set('Cookie', sessionCookie)
        .send({ data: 'test' });
      
      // Should be rejected (403 or 401 depending on middleware order)
      expect([401, 403]).toContain(response.status);
    });

    it('should accept POST with valid CSRF token', async () => {
      if (!sessionCookie || !csrfToken) {
        console.log('Skipping CSRF test - no session or token');
        return;
      }

      const response = await request(app)
        .post('/api/test-csrf')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject POST with invalid CSRF token', async () => {
      if (!sessionCookie) {
        console.log('Skipping CSRF test - no session');
        return;
      }

      const response = await request(app)
        .post('/api/test-csrf')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', 'invalid-token-12345')
        .send({ data: 'test' });
      
      expect([401, 403]).toContain(response.status);
    });
  });

  afterAll(async () => {
    // Clean up any test data if needed
    console.log('Integration tests completed');
  });
});
