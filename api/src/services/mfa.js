/**
 * Multi-Factor Authentication (MFA) Service
 * Implements TOTP (Time-based One-Time Password) for authenticator apps
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { q } from '../db.js';

export class MFAService {
  /**
   * Generate MFA secret and QR code for user
   */
  static async setupMFA(userId, userEmail) {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `HR System (${userEmail})`,
      issuer: 'HR Management System',
      length: 32
    });

    // Generate backup codes
    const backupCodes = [];
    const hashedBackupCodes = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push(await bcrypt.hash(code, 10));
    }

    // Store in database (but don't enable yet - user needs to verify first)
    await q(`
      INSERT INTO user_mfa (user_id, mfa_secret, backup_codes, mfa_enabled)
      VALUES ($1, $2, $3, false)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        mfa_secret = $2,
        backup_codes = $3,
        mfa_enabled = false,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, secret.base32, hashedBackupCodes]);

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataURL,
      backupCodes: backupCodes,
      otpauthUrl: secret.otpauth_url
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  static async verifyAndEnableMFA(userId, token) {
    // Get user's secret
    const result = await q(`
      SELECT mfa_secret FROM user_mfa WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      throw new Error('MFA not set up for this user');
    }

    const secret = result.rows[0].mfa_secret;

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 1 step before/after for clock skew
    });

    if (!verified) {
      // Log failed attempt
      await this.logMFAAttempt(userId, token, false);
      return false;
    }

    // Enable MFA
    await q(`
      UPDATE user_mfa 
      SET mfa_enabled = true, mfa_verified_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId]);

    // Log successful verification
    await this.logMFAAttempt(userId, token, true);

    return true;
  }

  /**
   * Verify TOTP code during login
   */
  static async verifyTOTP(userId, token, ipAddress = null, userAgent = null) {
    // Get user's MFA settings
    const result = await q(`
      SELECT mfa_secret, mfa_enabled FROM user_mfa WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
      return { valid: false, error: 'MFA not enabled' };
    }

    const secret = result.rows[0].mfa_secret;

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    // Log attempt
    await q(`
      INSERT INTO mfa_attempts (user_id, code_entered, success, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, token, verified, ipAddress, userAgent]);

    return { valid: verified };
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId, code, ipAddress = null, userAgent = null) {
    // Get backup codes
    const result = await q(`
      SELECT backup_codes FROM user_mfa WHERE user_id = $1 AND mfa_enabled = true
    `, [userId]);

    if (result.rows.length === 0) {
      return { valid: false, error: 'MFA not enabled' };
    }

    const backupCodes = result.rows[0].backup_codes || [];

    // Check if code matches any backup code
    for (const hashedCode of backupCodes) {
      const matches = await bcrypt.compare(code, hashedCode);
      if (matches) {
        // Check if already used
        const usageCheck = await q(`
          SELECT id FROM mfa_backup_usage
          WHERE user_id = $1 AND code_hash = $2
        `, [userId, hashedCode]);

        if (usageCheck.rows.length > 0) {
          return { valid: false, error: 'Backup code already used' };
        }

        // Mark as used
        await q(`
          INSERT INTO mfa_backup_usage (user_id, code_hash, ip_address, user_agent)
          VALUES ($1, $2, $3, $4)
        `, [userId, hashedCode, ipAddress, userAgent]);

        // Remove from backup codes
        const updatedCodes = backupCodes.filter(c => c !== hashedCode);
        await q(`
          UPDATE user_mfa SET backup_codes = $1 WHERE user_id = $2
        `, [updatedCodes, userId]);

        return { valid: true, codesRemaining: updatedCodes.length };
      }
    }

    return { valid: false, error: 'Invalid backup code' };
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId) {
    await q(`
      UPDATE user_mfa 
      SET mfa_enabled = false, 
          mfa_secret = NULL,
          backup_codes = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId]);

    // Clear trusted devices
    await q(`DELETE FROM trusted_devices WHERE user_id = $1`, [userId]);
  }

  /**
   * Check if user has MFA enabled
   */
  static async isMFAEnabled(userId) {
    const result = await q(`
      SELECT mfa_enabled FROM user_mfa WHERE user_id = $1
    `, [userId]);

    return result.rows.length > 0 && result.rows[0].mfa_enabled;
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId) {
    const result = await q(`
      SELECT 
        mfa_enabled,
        mfa_verified_at,
        array_length(backup_codes, 1) as backup_codes_remaining
      FROM user_mfa
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return { enabled: false, configured: false };
    }

    const row = result.rows[0];
    return {
      enabled: row.mfa_enabled,
      configured: row.mfa_enabled,
      verifiedAt: row.mfa_verified_at,
      backupCodesRemaining: row.backup_codes_remaining || 0
    };
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(userId) {
    const backupCodes = [];
    const hashedBackupCodes = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push(await bcrypt.hash(code, 10));
    }

    await q(`
      UPDATE user_mfa SET backup_codes = $1 WHERE user_id = $2
    `, [hashedBackupCodes, userId]);

    return backupCodes;
  }

  /**
   * Log MFA attempt
   */
  static async logMFAAttempt(userId, code, success, ipAddress = null, userAgent = null) {
    await q(`
      INSERT INTO mfa_attempts (user_id, code_entered, success, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, code, success, ipAddress, userAgent]);
  }

  /**
   * Trust a device (skip MFA for 30 days)
   */
  static async trustDevice(userId, deviceFingerprint, deviceName, ipAddress, userAgent) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await q(`
      INSERT INTO trusted_devices (user_id, device_fingerprint, device_name, ip_address, user_agent, expires_at, last_used)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, device_fingerprint)
      DO UPDATE SET last_used = CURRENT_TIMESTAMP, expires_at = $6
    `, [userId, deviceFingerprint, deviceName, ipAddress, userAgent, expiresAt]);
  }

  /**
   * Check if device is trusted
   */
  static async isDeviceTrusted(userId, deviceFingerprint) {
    const result = await q(`
      SELECT id FROM trusted_devices
      WHERE user_id = $1 
        AND device_fingerprint = $2
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [userId, deviceFingerprint]);

    return result.rows.length > 0;
  }

  /**
   * Get user's trusted devices
   */
  static async getTrustedDevices(userId) {
    const result = await q(`
      SELECT 
        id,
        device_name,
        ip_address,
        trusted_at,
        last_used,
        expires_at
      FROM trusted_devices
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY last_used DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Remove trusted device
   */
  static async removeTrustedDevice(userId, deviceId) {
    await q(`
      DELETE FROM trusted_devices
      WHERE user_id = $1 AND id = $2
    `, [userId, deviceId]);
  }
}

export default MFAService;

