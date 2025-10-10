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
import { TrustedDeviceService } from "../services/trusted-devices.js";
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
      SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active, u.employee_id,
             r.role_name, r.display_name as role_display_name,
             r.permissions->>'scope' as scope
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE (u.username = $1 OR u.full_name = $1 OR u.email = $1) AND u.is_active = true
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
    
    // ============================================================
    // CHECK PASSWORD EXPIRY
    // ============================================================
    const passwordCheckResult = await q(`
      SELECT 
        password_changed_at,
        password_expires_at,
        must_change_password,
        CASE 
          WHEN must_change_password THEN 'MUST_CHANGE'
          WHEN password_expires_at < NOW() THEN 'EXPIRED'
          WHEN password_expires_at < NOW() + INTERVAL '10 days' THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END as password_status,
        EXTRACT(DAY FROM (password_expires_at - NOW())) as days_until_expiry
      FROM users
      WHERE id = $1
    `, [user.id]);
    
    const passwordInfo = passwordCheckResult.rows[0];
    
    // If password expired or must change, require password change
    if (passwordInfo.password_status === 'EXPIRED' || passwordInfo.password_status === 'MUST_CHANGE') {
      console.log(`🔐 Password ${passwordInfo.password_status} for user ${user.id}`);
      
      // Create temporary token for password change
      const tempToken = generateSecureSessionId();
      
      await q(`
        INSERT INTO user_sessions (id, user_id, expires_at, metadata)
        VALUES ($1, $2, $3, $4)
      `, [
        tempToken, 
        user.id, 
        new Date(Date.now() + 30 * 60 * 1000), // 30 minutes to change password
        JSON.stringify({ password_change_required: true })
      ]);
      
      return res.json({
        requiresPasswordChange: true,
        tempToken: tempToken,
        reason: passwordInfo.password_status === 'MUST_CHANGE' 
          ? 'Administrator has required you to change your password'
          : 'Your password has expired',
        passwordStatus: passwordInfo.password_status
      });
    }
    
    // Store password warning for expiring soon
    let passwordWarning = null;
    if (passwordInfo.password_status === 'EXPIRING_SOON') {
      const daysLeft = Math.ceil(passwordInfo.days_until_expiry);
      passwordWarning = {
        message: `Your password expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        daysRemaining: daysLeft,
        expiresAt: passwordInfo.password_expires_at
      };
      console.log(`⚠️ Password expiring soon for user ${user.id}: ${daysLeft} days left`);
    }
    
    // Check if MFA is enabled
    const mfaEnabled = await MFAService.isMFAEnabled(user.id);
    
    // Check if device is trusted (via secure cookie)
    // Device trust only works if user has MFA set up
    const trustedDeviceCookie = req.cookies[TrustedDeviceService.CONFIG.COOKIE_NAME];
    const userAgent = req.headers['user-agent'];
    let deviceTrusted = false;
    let trustedDeviceId = null;
    
    if (mfaEnabled && trustedDeviceCookie) {
      console.log('🔍 [TrustedDevice] Checking trusted device cookie');
      const verifyResult = await TrustedDeviceService.verifyTrustedDevice(
        trustedDeviceCookie,
        ipAddress,
        userAgent
      );
      
      if (verifyResult && verifyResult.userId === user.id) {
        deviceTrusted = true;
        trustedDeviceId = verifyResult.deviceId;
        
        // If token was rotated, set new cookie
        if (verifyResult.newSecret) {
          const expiresAt = new Date(Date.now() + TrustedDeviceService.CONFIG.DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000);
          res.cookie(TrustedDeviceService.CONFIG.COOKIE_NAME, verifyResult.newSecret, {
            ...TrustedDeviceService.CONFIG.COOKIE_OPTIONS,
            expires: expiresAt
          });
          console.log('🔄 [TrustedDevice] Rotated device token');
        }
        
        console.log(`✅ [TrustedDevice] Device ${trustedDeviceId} trusted, bypassing MFA`);
      } else {
        console.log('❌ [TrustedDevice] Cookie invalid or expired');
        // Clear invalid cookie
        res.clearCookie(TrustedDeviceService.CONFIG.COOKIE_NAME);
      }
    }
    
    // MFA required only if enabled AND device is not trusted
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
    if (mfaEnabled && deviceTrusted) {
      console.log(`✅ [Login] Trusted device ${trustedDeviceId}, bypassing MFA for user ${user.full_name}`);
    } else {
      console.log(`✅ [Login] No MFA enabled, password-only login for user ${user.full_name}`);
    }
    
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
    
    const response = {
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.full_name,
        email: user.email,
        role: user.role_name,
        roleDisplayName: user.role_display_name,
        scope: user.scope || 'own',
        employeeId: user.employee_id
      },
      sessionId,
      csrfToken
    };
    
    // Add password warning if expiring soon
    if (passwordWarning) {
      response.passwordWarning = passwordWarning;
    }
    
    res.json(response);
    
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
    
    // Create trusted device if requested
    if (trustDevice) {
      try {
        const deviceResult = await TrustedDeviceService.createTrustedDevice(
          userId,
          ipAddress,
          userAgent,
          TrustedDeviceService.CONFIG.DEFAULT_DURATION_DAYS
        );
        
        // Set secure HttpOnly cookie with device secret
        res.cookie(TrustedDeviceService.CONFIG.COOKIE_NAME, deviceResult.deviceSecret, {
          ...TrustedDeviceService.CONFIG.COOKIE_OPTIONS,
          expires: deviceResult.expiresAt
        });
        
        console.log(`✅ [TrustedDevice] Created trusted device ${deviceResult.deviceId} for user ${userId}`);
      } catch (error) {
        console.error('❌ [TrustedDevice] Failed to create trusted device:', error);
        // Don't fail login if device trust fails
      }
    }
    
    // Old device trust code (deprecated, kept for backwards compatibility)
    if (false && trustDevice && deviceFingerprint) {
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
    
    // Check password expiry status
    const passwordCheckResult = await q(`
      SELECT 
        password_changed_at,
        password_expires_at,
        must_change_password,
        CASE 
          WHEN must_change_password THEN 'MUST_CHANGE'
          WHEN password_expires_at < NOW() THEN 'EXPIRED'
          WHEN password_expires_at < NOW() + INTERVAL '10 days' THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END as password_status,
        EXTRACT(DAY FROM (password_expires_at - NOW())) as days_until_expiry
      FROM users
      WHERE id = $1
    `, [userId]);
    
    const passwordInfo = passwordCheckResult.rows[0];
    let passwordWarning = null;
    
    if (passwordInfo.password_status === 'EXPIRING_SOON') {
      const daysLeft = Math.ceil(passwordInfo.days_until_expiry);
      passwordWarning = {
        message: `Your password expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        daysRemaining: daysLeft,
        expiresAt: passwordInfo.password_expires_at
      };
      console.log(`⚠️ Password expiring soon for user ${userId}: ${daysLeft} days left`);
    }
    
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
    
    const response = {
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
    };
    
    // Add password warning if expiring soon
    if (passwordWarning) {
      response.passwordWarning = passwordWarning;
    }
    
    res.json(response);
    
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

/**
 * Change Password
 * Can be used with tempToken (for forced password change) or with authenticated session
 */
r.post("/change-password", async (req, res) => {
  try {
    const { tempToken, currentPassword, newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    
    let userId;
    let requireCurrentPassword = true;
    
    // Check if using tempToken (forced password change)
    if (tempToken) {
      const tempSession = await q(`
        SELECT user_id, metadata FROM user_sessions
        WHERE id = $1 AND expires_at > NOW()
      `, [tempToken]);
      
      if (tempSession.rows.length === 0) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const metadata = tempSession.rows[0].metadata;
      if (!metadata?.password_change_required) {
        return res.status(400).json({ error: "Invalid token for password change" });
      }
      
      userId = tempSession.rows[0].user_id;
      requireCurrentPassword = false; // Don't require current password for forced change
      
    } else if (req.user) {
      // Authenticated user changing their own password
      userId = req.user.id;
    } else {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Get user
    const userResult = await q(`
      SELECT id, password_hash, password_history
      FROM users
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = userResult.rows[0];
    
    // If current password required, verify it
    if (requireCurrentPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }
      
      const isValid = await comparePassword(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    
    // Check if new password is same as current
    const isSameAsCurrent = await comparePassword(newPassword, user.password_hash);
    if (isSameAsCurrent) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }
    
    // Check password history (prevent reuse of last 5 passwords)
    const passwordHistory = user.password_history || [];
    for (const oldPassword of passwordHistory) {
      if (oldPassword.hash) {
        const isReused = await comparePassword(newPassword, oldPassword.hash);
        if (isReused) {
          return res.status(400).json({ 
            error: "Password has been used recently. Please choose a different password." 
          });
        }
      }
    }
    
    // Hash new password
    const bcrypt = await import('bcrypt');
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password (trigger will automatically handle expiry and history)
    await q(`
      UPDATE users 
      SET password_hash = $1
      WHERE id = $2
    `, [newPasswordHash, userId]);
    
    // Delete temp session if it exists
    if (tempToken) {
      await q(`DELETE FROM user_sessions WHERE id = $1`, [tempToken]);
    }
    
    // Log activity
    await q(`
      INSERT INTO user_activity_log (user_id, action, resource_type, details)
      VALUES ($1, 'password_changed', 'auth', $2)
    `, [userId, JSON.stringify({ self_initiated: !tempToken })]);
    
    console.log(`✅ Password changed successfully for user ${userId}`);
    
    res.json({ 
      message: "Password changed successfully",
      requiresLogin: !!tempToken // If was forced change, need to login again
    });
    
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ error: "Failed to change password: " + error.message });
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

