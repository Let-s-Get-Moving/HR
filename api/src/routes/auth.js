import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { SessionManager } from "../session.js";
import { 
  comparePassword, 
  sanitizeString, 
  logSecurityEvent,
  generateSecureSessionId,
  loginSchema 
} from "../utils/security.js";

const r = express.Router();

// Login endpoint
r.post("/login", async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeString(username);
    
    // Check if user exists and is not locked
    const userResult = await q(`
      SELECT id, username, email, password_hash, role, is_active, 
             failed_login_attempts, locked_until
      FROM users 
      WHERE username = $1 AND is_active = true
    `, [sanitizedUsername]);
    
    if (userResult.rows.length === 0) {
      logSecurityEvent('LOGIN_FAILED', {
        username: sanitizedUsername,
        reason: 'User not found',
        ip: clientIP,
        userAgent
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const user = userResult.rows[0];
    
    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      logSecurityEvent('LOGIN_BLOCKED', {
        username: sanitizedUsername,
        reason: 'Account locked',
        lockedUntil: user.locked_until,
        ip: clientIP,
        userAgent
      });
      return res.status(423).json({ 
        error: "Account temporarily locked due to multiple failed attempts" 
      });
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      // Handle failed login attempt
      await q(`
        SELECT handle_failed_login($1)
      `, [sanitizedUsername]);
      
      logSecurityEvent('LOGIN_FAILED', {
        username: sanitizedUsername,
        reason: 'Invalid password',
        failedAttempts: user.failed_login_attempts + 1,
        ip: clientIP,
        userAgent
      });
      
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Reset failed login attempts on successful login
    await q(`
      SELECT reset_failed_logins($1)
    `, [user.id]);
    
    // Create secure session
    const sessionId = generateSecureSessionId();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    // Store session in database
    await q(`
      INSERT INTO user_sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [sessionId, user.id, expiresAt, clientIP, userAgent]);
    
    // Also store in memory for backward compatibility
    SessionManager.createSession(user.id, user.username);
    
    // Set secure cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true, // Prevent XSS
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      path: '/'
    });
    
    logSecurityEvent('LOGIN_SUCCESS', {
      username: sanitizedUsername,
      userId: user.id,
      ip: clientIP,
      userAgent
    });
    
    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      },
      sessionId
    });
  } catch (error) {
    logSecurityEvent('LOGIN_ERROR', {
      error: error.message,
      ip: clientIP,
      userAgent
    });
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Invalid request format",
        details: error.errors 
      });
    }
    
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout endpoint
r.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (sessionId) {
    // Log security event
    logSecurityEvent('LOGOUT', {
      sessionId,
      ip: clientIP
    });
    
    // Remove from database
    await q(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE id = $1
    `, [sessionId]);
    
    // Remove from memory
    SessionManager.destroySession(sessionId);
  }
  
  res.clearCookie('sessionId');
  res.json({ message: "Logout successful" });
});

// Check session endpoint
r.get("/session", async (req, res) => {
  const sessionId = req.cookies?.sessionId || 
                   req.headers.authorization?.replace('Bearer ', '') ||
                   req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  try {
    // Check database session first
    const sessionResult = await q(`
      SELECT s.id, s.user_id, s.created_at, s.expires_at, s.last_activity,
             u.username, u.email, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    const session = sessionResult.rows[0];
    
    // Update last activity
    await q(`
      UPDATE user_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [sessionId]);
    
    res.json({
      user: { 
        id: session.user_id, 
        username: session.username,
        email: session.email,
        role: session.role
      },
      session: {
        id: session.id,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        lastActivity: session.last_activity
      }
    });
  } catch (error) {
    logSecurityEvent('SESSION_CHECK_ERROR', {
      sessionId,
      error: error.message,
      ip: req.ip
    });
    
    console.error("Session check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Extend session endpoint
r.post("/extend", async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  try {
    // Check if session exists and is valid
    const sessionResult = await q(`
      SELECT id, user_id, expires_at
      FROM user_sessions 
      WHERE id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    const session = sessionResult.rows[0];
    const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    // Extend session in database
    await q(`
      UPDATE user_sessions 
      SET expires_at = $1, last_activity = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [newExpiresAt, sessionId]);
    
    // Also extend in memory
    SessionManager.extendSession(sessionId);
    
    // Update cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });
    
    res.json({ message: "Session extended" });
  } catch (error) {
    logSecurityEvent('SESSION_EXTEND_ERROR', {
      sessionId,
      error: error.message,
      ip: req.ip
    });
    
    console.error("Session extend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default r;
