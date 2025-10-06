/**
 * Authentication Routes with MFA Support
 * Handles login, MFA setup, and MFA verification
 */

import express from "express";
import { q } from "../db.js";
import { SessionManager } from "../session.js";
import { comparePassword, generateSecureSessionId } from "../utils/security.js";
import { AccountLockout, checkAccountLockout } from "../middleware/account-lockout.js";
import { CSRFProtection } from "../middleware/csrf.js";
import { MFAService } from "../services/mfa.js";
import { UserManagementService } from "../services/user-management.js";
import { requireAuth } from "../session.js";

const r = express.Router();

/**
 * Step 1: Login with username/password
 * Returns: requiresMFA flag if MFA is enabled
 */
r.post("/login", checkAccountLockout, async (req, res) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    console.log('Login attempt:', username);
    
    // Check if user exists
    const userResult = await q(`
      SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active,
             r.role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE (u.full_name = $1 OR u.email = $1) AND u.is_active = true
      LIMIT 1
    `, [username]);
    
    if (userResult.rows.length === 0) {
      console.log('Login failed: User not found or inactive:', username);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      
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
    
    // Clear failed attempts
    const ipAddress = req.ip || req.connection.remoteAddress;
    AccountLockout.clearFailedAttempts(username, ipAddress);
    
    // Check if MFA is enabled
    const mfaEnabled = await MFAService.isMFAEnabled(user.id);
    
    // Check if device is trusted
    const deviceTrusted = deviceFingerprint 
      ? await MFAService.isDeviceTrusted(user.id, deviceFingerprint)
      : false;
    
    if (mfaEnabled && !deviceTrusted) {
      // MFA required - don't create full session yet
      // Create temporary token for MFA verification
      const tempToken = generateSecureSessionId();
      
      // Store temporary auth state in database
      await q(`
        INSERT INTO user_sessions (id, user_id, expires_at, metadata)
        VALUES ($1, $2, $3, $4)
      `, [
        tempToken, 
        user.id, 
        new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        JSON.stringify({ mfa_pending: true })
      ]);
      
      console.log('✅ Password verified, MFA required:', user.full_name);
      
      return res.json({
        requiresMFA: true,
        tempToken: tempToken,
        message: "MFA verification required"
      });
    }
    
    // No MFA or trusted device - create full session
    const sessionId = generateSecureSessionId();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    
    await q(`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES ($1, $2, $3)
    `, [sessionId, user.id, expiresAt]);
    
    // Update last login
    await UserManagementService.updateLastLogin(user.id);
    
    // Generate CSRF token
    const csrfToken = CSRFProtection.generateToken(sessionId);
    
    // Set cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-origin cookies
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ Login successful (no MFA):', user.full_name);
    
    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.full_name,
        email: user.email,
        role: user.role_name,
        roleDisplayName: user.role_display_name
      },
      sessionId,
      csrfToken
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

/**
 * Step 2: Verify MFA code
 */
r.post("/verify-mfa", async (req, res) => {
  try {
    const { tempToken, code, trustDevice, deviceFingerprint, deviceName } = req.body;
    
    if (!tempToken || !code) {
      return res.status(400).json({ error: "Temporary token and MFA code required" });
    }
    
    // Get temp session
    const tempSession = await q(`
      SELECT user_id, metadata FROM user_sessions
      WHERE id = $1 AND expires_at > NOW()
    `, [tempToken]);
    
    if (tempSession.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    const userId = tempSession.rows[0].user_id;
    const metadata = tempSession.rows[0].metadata;
    
    if (!metadata?.mfa_pending) {
      return res.status(400).json({ error: "Invalid MFA session" });
    }
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Verify MFA code (TOTP or backup code)
    let mfaResult;
    
    if (code.length === 6 && /^\d+$/.test(code)) {
      // TOTP code
      mfaResult = await MFAService.verifyTOTP(userId, code, ipAddress, userAgent);
    } else if (code.length === 8 && /^[A-F0-9]+$/i.test(code)) {
      // Backup code
      mfaResult = await MFAService.verifyBackupCode(userId, code.toUpperCase(), ipAddress, userAgent);
    } else {
      return res.status(400).json({ error: "Invalid code format" });
    }
    
    if (!mfaResult.valid) {
      return res.status(401).json({ 
        error: "Invalid MFA code",
        message: mfaResult.error || "The code you entered is incorrect"
      });
    }
    
    // Delete temp session
    await q(`DELETE FROM user_sessions WHERE id = $1`, [tempToken]);
    
    // Create real session
    const sessionId = generateSecureSessionId();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    
    await q(`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES ($1, $2, $3)
    `, [sessionId, userId, expiresAt]);
    
    // Trust device if requested
    if (trustDevice && deviceFingerprint) {
      await MFAService.trustDevice(
        userId, 
        deviceFingerprint, 
        deviceName || 'Unknown Device',
        ipAddress,
        userAgent
      );
    }
    
    // Update last login
    await UserManagementService.updateLastLogin(userId);
    
    // Get user details
    const user = await UserManagementService.getUserById(userId);
    
    // Generate CSRF token
    const csrfToken = CSRFProtection.generateToken(sessionId);
    
    // Set cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Allow cross-origin cookies
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ MFA verified successfully for user:', user.full_name);
    
    res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.full_name,
        email: user.email,
        role: user.role_name,
        roleDisplayName: user.role_display_name
      },
      sessionId,
      csrfToken
    });
    
  } catch (error) {
    console.error('❌ MFA verification error:', error);
    res.status(500).json({ error: "MFA verification failed: " + error.message });
  }
});

/**
 * Setup MFA for current user
 */
r.post("/mfa/setup", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserManagementService.getUserById(userId);
    
    const mfaData = await MFAService.setupMFA(userId, user.email);
    
    res.json({
      message: "MFA setup initiated. Scan the QR code with your authenticator app.",
      qrCode: mfaData.qrCode,
      secret: mfaData.secret, // Show secret for manual entry
      backupCodes: mfaData.backupCodes
    });
    
  } catch (error) {
    console.error('❌ MFA setup error:', error);
    res.status(500).json({ error: "MFA setup failed: " + error.message });
  }
});

/**
 * Verify and enable MFA
 */
r.post("/mfa/verify", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    if (!code) {
      return res.status(400).json({ error: "Verification code required" });
    }
    
    const verified = await MFAService.verifyAndEnableMFA(userId, code);
    
    if (!verified) {
      return res.status(401).json({ error: "Invalid verification code" });
    }
    
    res.json({
      message: "MFA enabled successfully",
      enabled: true
    });
    
  } catch (error) {
    console.error('❌ MFA enable error:', error);
    res.status(500).json({ error: "MFA enable failed: " + error.message });
  }
});

/**
 * Disable MFA
 */
r.post("/mfa/disable", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await MFAService.disableMFA(userId);
    
    res.json({
      message: "MFA disabled successfully",
      enabled: false
    });
    
  } catch (error) {
    console.error('❌ MFA disable error:', error);
    res.status(500).json({ error: "MFA disable failed: " + error.message });
  }
});

/**
 * Get MFA status
 */
r.get("/mfa/status", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await MFAService.getMFAStatus(userId);
    
    res.json(status);
    
  } catch (error) {
    console.error('❌ MFA status error:', error);
    res.status(500).json({ error: "Failed to get MFA status: " + error.message });
  }
});

/**
 * Regenerate backup codes
 */
r.post("/mfa/regenerate-backup-codes", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const backupCodes = await MFAService.regenerateBackupCodes(userId);
    
    res.json({
      message: "Backup codes regenerated",
      backupCodes
    });
    
  } catch (error) {
    console.error('❌ Backup code regeneration error:', error);
    res.status(500).json({ error: "Failed to regenerate backup codes: " + error.message });
  }
});

/**
 * Get trusted devices
 */
r.get("/mfa/trusted-devices", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await MFAService.getTrustedDevices(userId);
    
    res.json({ devices });
    
  } catch (error) {
    console.error('❌ Get trusted devices error:', error);
    res.status(500).json({ error: "Failed to get trusted devices: " + error.message });
  }
});

/**
 * Remove trusted device
 */
r.delete("/mfa/trusted-devices/:deviceId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceId = parseInt(req.params.deviceId);
    
    await MFAService.removeTrustedDevice(userId, deviceId);
    
    res.json({ message: "Device removed successfully" });
    
  } catch (error) {
    console.error('❌ Remove trusted device error:', error);
    res.status(500).json({ error: "Failed to remove device: " + error.message });
  }
});

// Keep existing logout and session endpoints
r.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
  
  if (sessionId) {
    try {
      await q(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
      SessionManager.destroySession(sessionId);
      res.clearCookie('sessionId', { path: '/' });
      console.log('Logout successful');
    } catch (err) {
      console.log('Logout error:', err.message);
    }
  }
  
  res.json({ message: "Logged out successfully" });
});

r.get("/session", async (req, res) => {
  const sessionId = req.headers['x-session-id'] || 
                    req.headers['X-Session-ID'] ||
                    req.cookies?.sessionId || 
                    req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session" });
  }
  
  try {
    const sessionResult = await q(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.full_name, 
             r.role_name, r.display_name as role_display_name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE s.id = $1 AND s.expires_at > NOW()
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expired" });
    }
    
    const session = sessionResult.rows[0];
    
    await q(`UPDATE user_sessions SET last_activity = NOW() WHERE id = $1`, [sessionId]);
    
    res.json({
      user: {
        id: session.user_id,
        username: session.full_name,
        email: session.email,
        role: session.role_name,
        roleDisplayName: session.role_display_name
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(401).json({ error: "Invalid session" });
  }
});

export default r;

