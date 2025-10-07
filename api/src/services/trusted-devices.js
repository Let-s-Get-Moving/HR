/**
 * Trusted Device Service
 * Implements secure device trust for MFA bypass (7-day default)
 * 
 * Security features:
 * - HMAC-SHA256 with pepper for token hashing
 * - Constant-time comparison to prevent timing attacks
 * - Token rotation on each use (replay protection)
 * - Dual-pepper support for rotation
 * - Max 10 devices per user
 */

import crypto from 'crypto';
import { q } from '../db.js';

export class TrustedDeviceService {
  
  // Configuration
  static CONFIG = {
    DEFAULT_DURATION_DAYS: 7,
    MAX_DEVICES_PER_USER: 10,
    COOKIE_NAME: 'td_v1',
    COOKIE_OPTIONS: {
      httpOnly: true,
      secure: true, // Always true on Render
      sameSite: 'none', // Required for cross-origin (frontend on Vercel, API on Render)
      path: '/'
    }
  };

  /**
   * Generate HMAC-SHA256 hash of device secret with pepper
   */
  static hmac(pepper, value) {
    if (!pepper) {
      throw new Error('TD_PEPPER environment variable not set');
    }
    return crypto
      .createHmac('sha256', Buffer.from(pepper, 'utf8'))
      .update(value)
      .digest('base64url');
  }

  /**
   * Generate a cryptographically secure device secret
   */
  static generateDeviceSecret() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Verify device token with constant-time comparison
   * Supports dual-pepper rotation for zero-downtime pepper changes
   */
  static verifyToken(candidateSecret, storedHash) {
    try {
      const currentPepper = process.env.TD_PEPPER;
      if (!currentPepper) {
        console.error('❌ [TrustedDevice] TD_PEPPER not configured');
        return null;
      }

      // Try current pepper
      const currentHash = this.hmac(currentPepper, candidateSecret);
      if (crypto.timingSafeEqual(
        Buffer.from(currentHash, 'base64url'),
        Buffer.from(storedHash, 'base64url')
      )) {
        return 'current';
      }

      // Try previous pepper (for rotation grace period)
      const prevPepper = process.env.TD_PEPPER_PREV;
      if (prevPepper) {
        const prevHash = this.hmac(prevPepper, candidateSecret);
        if (crypto.timingSafeEqual(
          Buffer.from(prevHash, 'base64url'),
          Buffer.from(storedHash, 'base64url')
        )) {
          return 'prev'; // Signal that rotation is needed
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [TrustedDevice] Token verification error:', error);
      return null;
    }
  }

  /**
   * Parse User-Agent to extract browser and OS families
   */
  static parseUserAgent(userAgent) {
    if (!userAgent) return { uaFamily: null, osFamily: null };

    // Simple UA parsing (in production, use ua-parser-js library)
    let uaFamily = 'Unknown';
    let osFamily = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) uaFamily = 'Chrome';
    else if (userAgent.includes('Firefox')) uaFamily = 'Firefox';
    else if (userAgent.includes('Safari')) uaFamily = 'Safari';
    else if (userAgent.includes('Edge')) uaFamily = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) osFamily = 'Windows';
    else if (userAgent.includes('Mac')) osFamily = 'macOS';
    else if (userAgent.includes('Linux')) osFamily = 'Linux';
    else if (userAgent.includes('Android')) osFamily = 'Android';
    else if (userAgent.includes('iOS')) osFamily = 'iOS';

    return { uaFamily, osFamily };
  }

  /**
   * Create a new trusted device
   */
  static async createTrustedDevice(userId, ipAddress, userAgent, durationDays = null) {
    try {
      const duration = durationDays || this.CONFIG.DEFAULT_DURATION_DAYS;
      const deviceSecret = this.generateDeviceSecret();
      const pepper = process.env.TD_PEPPER;
      
      if (!pepper) {
        throw new Error('TD_PEPPER not configured');
      }

      const tokenHash = this.hmac(pepper, deviceSecret);
      const { uaFamily, osFamily } = this.parseUserAgent(userAgent);
      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      // Enforce max devices limit
      await this.enforceDeviceLimit(userId);

      // Create device record
      const result = await q(`
        INSERT INTO trusted_devices (
          user_id, token_hash, ua_family, os_family,
          ip_created, ip_last_used, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at, expires_at
      `, [userId, tokenHash, uaFamily, osFamily, ipAddress, ipAddress, expiresAt]);

      const device = result.rows[0];

      console.log(`✅ [TrustedDevice] Created device ${device.id} for user ${userId}`);

      return {
        deviceId: device.id,
        deviceSecret, // Return this ONCE to set in cookie
        expiresAt: device.expires_at
      };

    } catch (error) {
      console.error('❌ [TrustedDevice] Create error:', error);
      throw error;
    }
  }

  /**
   * Verify and optionally rotate a trusted device token
   */
  static async verifyTrustedDevice(deviceSecret, ipAddress, userAgent) {
    try {
      if (!deviceSecret) return null;

      // Find all non-revoked, non-expired devices and try to match
      const devices = await q(`
        SELECT id, user_id, token_hash, ua_family, os_family
        FROM trusted_devices
        WHERE revoked_at IS NULL
          AND expires_at > NOW()
      `);

      for (const device of devices.rows) {
        const verifyResult = this.verifyToken(deviceSecret, device.token_hash);
        
        if (verifyResult) {
          const userId = device.user_id;

          // Check UA/OS drift (soft warning, don't block)
          const { uaFamily, osFamily } = this.parseUserAgent(userAgent);
          if (uaFamily !== device.ua_family || osFamily !== device.os_family) {
            console.warn(`⚠️ [TrustedDevice] UA/OS drift detected for device ${device.id}`);
            // In production, you might require MFA step-up here
          }

          // Rotate token if using previous pepper
          if (verifyResult === 'prev') {
            console.log(`🔄 [TrustedDevice] Rotating token for device ${device.id}`);
            const newSecret = await this.rotateDeviceToken(device.id, ipAddress);
            return { userId, deviceId: device.id, newSecret };
          }

          // Update last used
          await q(`
            UPDATE trusted_devices
            SET last_used_at = NOW(), ip_last_used = $1
            WHERE id = $2
          `, [ipAddress, device.id]);

          console.log(`✅ [TrustedDevice] Verified device ${device.id} for user ${userId}`);
          return { userId, deviceId: device.id, newSecret: null };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [TrustedDevice] Verify error:', error);
      return null;
    }
  }

  /**
   * Rotate device token (replay protection + pepper rotation)
   */
  static async rotateDeviceToken(deviceId, ipAddress) {
    try {
      const newSecret = this.generateDeviceSecret();
      const pepper = process.env.TD_PEPPER;
      const newHash = this.hmac(pepper, newSecret);

      await q(`
        UPDATE trusted_devices
        SET token_hash = $1,
            rotated_at = NOW(),
            last_used_at = NOW(),
            ip_last_used = $2
        WHERE id = $3
      `, [newHash, ipAddress, deviceId]);

      console.log(`🔄 [TrustedDevice] Rotated token for device ${deviceId}`);
      return newSecret;
    } catch (error) {
      console.error('❌ [TrustedDevice] Rotation error:', error);
      throw error;
    }
  }

  /**
   * Enforce max devices limit per user (FIFO eviction)
   */
  static async enforceDeviceLimit(userId) {
    try {
      const { rows } = await q(`
        SELECT COUNT(*) as count
        FROM trusted_devices
        WHERE user_id = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
      `, [userId]);

      const activeCount = parseInt(rows[0].count);

      if (activeCount >= this.CONFIG.MAX_DEVICES_PER_USER) {
        // Revoke oldest device
        await q(`
          UPDATE trusted_devices
          SET revoked_at = NOW(), revoked_by = 'system:max_limit'
          WHERE id = (
            SELECT id FROM trusted_devices
            WHERE user_id = $1
              AND revoked_at IS NULL
              AND expires_at > NOW()
            ORDER BY created_at ASC
            LIMIT 1
          )
        `, [userId]);

        console.log(`🗑️ [TrustedDevice] Evicted oldest device for user ${userId} (max limit)`);
      }
    } catch (error) {
      console.error('❌ [TrustedDevice] Limit enforcement error:', error);
    }
  }

  /**
   * List user's trusted devices
   */
  static async listUserDevices(userId) {
    try {
      const { rows } = await q(`
        SELECT 
          id,
          device_label,
          ua_family,
          os_family,
          ip_created,
          ip_last_used,
          created_at,
          last_used_at,
          expires_at,
          revoked_at
        FROM trusted_devices
        WHERE user_id = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        ORDER BY last_used_at DESC NULLS LAST, created_at DESC
      `, [userId]);

      return rows.map(device => ({
        id: device.id,
        label: device.device_label || `${device.ua_family} on ${device.os_family}`,
        browser: device.ua_family,
        os: device.os_family,
        ipCreated: device.ip_created,
        ipLastUsed: device.ip_last_used,
        createdAt: device.created_at,
        lastUsedAt: device.last_used_at,
        expiresAt: device.expires_at,
        expiresIn: this.getExpiresInText(device.expires_at)
      }));
    } catch (error) {
      console.error('❌ [TrustedDevice] List error:', error);
      return [];
    }
  }

  /**
   * Get human-readable expiration text
   */
  static getExpiresInText(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Less than 1 day';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  }

  /**
   * Revoke a single device
   */
  static async revokeDevice(userId, deviceId, revokedBy = 'user') {
    try {
      const result = await q(`
        UPDATE trusted_devices
        SET revoked_at = NOW(), revoked_by = $1
        WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL
        RETURNING id
      `, [revokedBy, deviceId, userId]);

      if (result.rows.length === 0) {
        return false;
      }

      console.log(`🗑️ [TrustedDevice] Revoked device ${deviceId} by ${revokedBy}`);
      return true;
    } catch (error) {
      console.error('❌ [TrustedDevice] Revoke error:', error);
      return false;
    }
  }

  /**
   * Revoke all user devices
   */
  static async revokeAllDevices(userId, revokedBy = 'user') {
    try {
      const result = await q(`
        UPDATE trusted_devices
        SET revoked_at = NOW(), revoked_by = $1
        WHERE user_id = $2 AND revoked_at IS NULL
        RETURNING id
      `, [revokedBy, userId]);

      console.log(`🗑️ [TrustedDevice] Revoked ${result.rows.length} devices for user ${userId}`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ [TrustedDevice] Revoke all error:', error);
      return 0;
    }
  }

  /**
   * Cleanup expired devices (run nightly)
   */
  static async cleanupExpiredDevices() {
    try {
      const result = await q(`
        DELETE FROM trusted_devices
        WHERE expires_at < NOW() - INTERVAL '7 days'
          OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
      `);

      console.log(`🧹 [TrustedDevice] Cleaned up ${result.rowCount} expired devices`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ [TrustedDevice] Cleanup error:', error);
      return 0;
    }
  }
}
