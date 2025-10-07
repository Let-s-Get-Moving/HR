/**
 * Nightly Cleanup Job for Trusted Devices
 * Run this via cron or Render's scheduled jobs
 */

import { TrustedDeviceService } from '../services/trusted-devices.js';

export async function cleanupExpiredDevices() {
  console.log('🧹 [Cleanup] Starting trusted devices cleanup...');
  
  try {
    const count = await TrustedDeviceService.cleanupExpiredDevices();
    console.log(`✅ [Cleanup] Cleaned up ${count} expired trusted devices`);
    return { success: true, count };
  } catch (error) {
    console.error('❌ [Cleanup] Failed:', error);
    return { success: false, error: error.message };
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredDevices()
    .then(result => {
      console.log('Cleanup result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}
