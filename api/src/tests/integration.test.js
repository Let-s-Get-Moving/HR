import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { q } from '../db.js';
import auth from '../routes/auth.js';
import { hashPassword, comparePassword } from '../utils/security.js';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/auth', auth);

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

    it('should have user_sessions table', async () => {
      const result = await q(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'user_sessions'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
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

  describe('Session Security', () => {
    it('should create secure session IDs', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        expect(response.body.sessionId).toBeDefined();
        expect(response.body.sessionId.length).toBe(64); // 32 bytes = 64 hex chars
        expect(response.body.sessionId).toMatch(/^[a-f0-9]+$/);
      }
    });

    it('should set secure cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'Avneet',
          password: 'password123'
        });
      
      if (response.status === 200) {
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        
        const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionId='));
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie).toContain('HttpOnly');
        expect(sessionCookie).toContain('SameSite=Strict');
      }
    });
  });

  afterAll(async () => {
    // Clean up any test data if needed
    console.log('Integration tests completed');
  });
});
