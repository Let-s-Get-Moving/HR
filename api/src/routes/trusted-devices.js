/**
 * Trusted Devices API Routes
 * Manage user's trusted devices for MFA bypass
 */

import express from 'express';
import { requireAuth } from '../session.js';
import { TrustedDeviceService } from '../services/trusted-devices.js';
import { cleanupExpiredDevices } from '../jobs/cleanup-trusted-devices.js';

const r = express.Router();

/**
 * GET /api/trusted-devices
 * List user's trusted devices
 */
r.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await TrustedDeviceService.listUserDevices(userId);
    
    // Return array directly for simpler frontend handling
    res.json(devices);
  } catch (error) {
    console.error('❌ [TrustedDevices] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list trusted devices'
    });
  }
});

/**
 * DELETE /api/trusted-devices/:deviceId
 * Revoke a specific trusted device
 */
r.delete('/:deviceId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;

    const success = await TrustedDeviceService.revokeDevice(userId, deviceId, 'user');

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Device not found or already revoked'
      });
    }

    res.json({
      success: true,
      message: 'Device revoked successfully'
    });
  } catch (error) {
    console.error('❌ [TrustedDevices] Revoke error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke device'
    });
  }
});

/**
 * POST /api/trusted-devices/revoke-all
 * Revoke all trusted devices for the user
 */
r.post('/revoke-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await TrustedDeviceService.revokeAllDevices(userId, 'user');

    res.json({
      success: true,
      message: `${count} device(s) revoked successfully`,
      count
    });
  } catch (error) {
    console.error('❌ [TrustedDevices] Revoke all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke devices'
    });
  }
});

/**
 * PUT /api/trusted-devices/:deviceId/label
 * Update device label (nickname)
 */
r.put('/:deviceId/label', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;
    const { label } = req.body;

    if (!label || label.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Label must be 1-100 characters'
      });
    }

    const { q } = await import('../db.js');
    const result = await q(`
      UPDATE trusted_devices
      SET device_label = $1
      WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL
      RETURNING id
    `, [label, deviceId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    res.json({
      success: true,
      message: 'Device label updated'
    });
  } catch (error) {
    console.error('❌ [TrustedDevices] Update label error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device label'
    });
  }
});

/**
 * POST /api/trusted-devices/cleanup
 * Admin/Cron endpoint to cleanup expired devices
 * Can be called by Render's scheduled jobs or manually
 */
r.post('/cleanup', async (req, res) => {
  try {
    // Optional: Add authentication check here (e.g., secret token from env)
    const secret = req.headers['x-cleanup-secret'];
    if (process.env.CLEANUP_SECRET && secret !== process.env.CLEANUP_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await cleanupExpiredDevices();

    res.json(result);
  } catch (error) {
    console.error('❌ [TrustedDevices] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

export default r;
