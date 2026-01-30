import express from "express";
import { q } from "../db.js";
import { SessionManager } from "../session.js";
import { comparePassword, generateSecureSessionId } from "../utils/security.js";
import { AccountLockout, checkAccountLockout } from "../middleware/account-lockout.js";
import { CSRFProtection } from "../middleware/csrf.js";

const r = express.Router();

// Cookie options for cross-origin session cookie (mirrors auth-mfa.js)
const isProd = process.env.NODE_ENV === 'production';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin in prod, 'lax' for local HTTP dev
  maxAge: 8 * 60 * 60 * 1000, // 8 hours (legacy route)
  path: '/'
};

// Simple login endpoint for single admin user
r.post("/login", checkAccountLockout, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    console.log('Login attempt:', username);
    
    // Check if user exists and employee status allows login
    // Terminated employees cannot log in; Active and On Leave can
    const userResult = await q(`
      SELECT u.id, u.email, u.username, u.password_hash, u.is_active,
             COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
             COALESCE(r.role_name, 'user') as role,
             u.employee_id,
             e.sales_role, e.status as employee_status
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE (u.username = $1 OR u.email = $1) 
        AND u.is_active = true
        AND (u.employee_id IS NULL OR e.status IN ('Active', 'On Leave'))
      LIMIT 1
    `, [username]);
    
    if (userResult.rows.length === 0) {
      console.log('Login failed: User not found:', username);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const user = userResult.rows[0];
    console.log('Found user:', user.username);
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      
      // Record failed attempt and check for lockout
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const lockoutResult = AccountLockout.recordFailedAttempt(username, ipAddress, userAgent);
      
      if (lockoutResult.locked) {
        return res.status(429).json({ 
          error: "Account locked",
          message: `Too many failed attempts. Account locked until ${lockoutResult.lockoutEndsAt.toISOString()}`,
          lockedUntil: lockoutResult.lockoutEndsAt
        });
      }
      
      return res.status(401).json({ 
        error: "Invalid credentials",
        attemptsRemaining: lockoutResult.attemptsRemaining
      });
    }
    
    // Create session
    const sessionId = generateSecureSessionId();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    
    // Store session in database
    try {
      await q(`
        INSERT INTO user_sessions (id, user_id, expires_at)
        VALUES ($1, $2, $3)
      `, [sessionId, user.id, expiresAt]);
    } catch (err) {
      console.log('Session table error (might not exist):', err.message);
    }
    
    // Store in memory with session fingerprint
    const fingerprint = SessionManager.generateSessionFingerprint(req);
    SessionManager.createSession(user.id, user.username, fingerprint);
    
    // Set session cookie (uses SameSite=None in prod for cross-origin)
    res.cookie('sessionId', sessionId, SESSION_COOKIE_OPTIONS);
    
    // Clear any failed attempts on successful login
    const ipAddress = req.ip || req.connection.remoteAddress;
    AccountLockout.clearFailedAttempts(username, ipAddress);
    
    // Generate CSRF token for this session
    const csrfToken = CSRFProtection.generateToken(sessionId);
    
    console.log('✅ Login successful:', user.username);
    
    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        sales_role: user.sales_role
      },
      sessionId,
      csrfToken // CSRF token for secure state-changing operations
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// Logout endpoint
r.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (sessionId) {
    try {
      // Delete from database
      await q(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
      
      // Delete from memory
      SessionManager.destroySession(sessionId);
      
      // Clear cookie (must match same options for reliable clearing)
      res.clearCookie('sessionId', { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
      
      console.log('Logout successful');
    } catch (err) {
      console.log('Logout error:', err.message);
    }
  }
  
  res.json({ message: "Logged out successfully" });
});

// Check session endpoint
r.get("/session", async (req, res) => {
  const sessionId = req.headers['x-session-id'] || 
                    req.headers['X-Session-ID'] ||
                    req.cookies?.sessionId || 
                    req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  try {
    // Check database - also enforce user active status and employee status (terminated employees denied)
    const sessionResult = await q(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.username,
             COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
             COALESCE(r.role_name, 'user') as role,
             u.employee_id,
             e.sales_role, e.status as employee_status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE s.id = $1 
        AND s.expires_at > NOW()
        AND u.is_active = true
        AND (u.employee_id IS NULL OR e.status IN ('Active', 'On Leave'))
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expired or access denied" });
    }
    
    const session = sessionResult.rows[0];
    
    // Update last activity
    await q(`
      UPDATE user_sessions 
      SET last_activity = NOW() 
      WHERE id = $1
    `, [sessionId]);
    
    res.json({
      user: {
        id: session.user_id,
        username: session.username,
        full_name: session.full_name,
        email: session.email,
        role: session.role,
        employee_id: session.employee_id,
        sales_role: session.sales_role
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    
    // Fall back to memory session
    const memorySession = SessionManager.getSession(sessionId);
    if (memorySession) {
      return res.json({
        user: {
          id: memorySession.userId,
          username: memorySession.username,
          role: 'Admin'
        }
      });
    }
    
    res.status(401).json({ error: "Invalid session" });
  }
});

// Manual admin fix endpoint (for when auto-fix fails)
r.post("/fix-admin", async (req, res) => {
  const { ensureAdminUser } = await import("../utils/ensureAdminUser.js");
  
  try {
    await ensureAdminUser();
    res.json({ 
      success: true, 
      message: "Admin user fixed successfully",
      credentials: {
        username: "Avneet",
        password: "password123"
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fix admin user", 
      details: error.message 
    });
  }
});

export default r;
// Trigger redeploy - simplified auth
