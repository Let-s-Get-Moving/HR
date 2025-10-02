import express from "express";
import { q } from "../db.js";
import { SessionManager } from "../session.js";
import { comparePassword, generateSecureSessionId } from "../utils/security.js";

const r = express.Router();

// Simple login endpoint for single admin user
r.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    console.log('Login attempt:', username);
    
    // Check if user exists (lookup by full_name or email)
    const userResult = await q(`
      SELECT id, email, full_name, password_hash, role
      FROM users 
      WHERE full_name = $1 OR email = $1
      LIMIT 1
    `, [username]);
    
    if (userResult.rows.length === 0) {
      console.log('Login failed: User not found:', username);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const user = userResult.rows[0];
    console.log('Found user:', user.full_name);
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: "Invalid credentials" });
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
    
    // Store in memory
    SessionManager.createSession(user.id, user.full_name);
    
    // Set cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ Login successful:', user.full_name);
    
    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.full_name,
        email: user.email,
        role: user.role 
      },
      sessionId
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
      
      // Clear cookie
      res.clearCookie('sessionId', { path: '/' });
      
      console.log('Logout successful');
    } catch (err) {
      console.log('Logout error:', err.message);
    }
  }
  
  res.json({ message: "Logged out successfully" });
});

// Check session endpoint
r.get("/session", async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  try {
    // Check database
    const sessionResult = await q(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.full_name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.expires_at > NOW()
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expired" });
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
        username: session.full_name,
        email: session.email,
        role: session.role
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

export default r;
