/**
 * Admin Cleanup Routes - COMPLETELY DISABLED
 * 
 * These routes have been PERMANENTLY DISABLED due to causing accidental data loss.
 * All endpoints now return 403 Forbidden.
 * 
 * Root Cause:
 * - Someone clicked "Delete All Employees" button in Settings
 * - This triggered CASCADE DELETE that wiped out:
 *   • ALL timecards
 *   • ALL hourly_payout records
 *   • ALL commissions
 *   • ALL time_entries
 * 
 * Fix:
 * - All cleanup endpoints now blocked at middleware level
 * - Frontend buttons completely removed
 * - Data cleanup only via controlled terminal scripts
 * 
 * Date Disabled: 2025-10-03
 */

import { Router } from "express";

const r = Router();

// Middleware to block ALL cleanup routes
r.use((req, res) => {
    console.log(`🚫 [BLOCKED] Attempt to access disabled cleanup endpoint: ${req.method} ${req.path}`);
    return res.status(403).json({
        error: 'ALL cleanup endpoints are permanently disabled',
        reason: 'These endpoints caused accidental data loss and have been removed for safety',
        message: 'If you need to clean data, use terminal scripts with proper safeguards',
        disabled_permanently: true,
        disabled_date: '2025-10-03',
        blocked_endpoint: `${req.method} ${req.path}`
    });
});

// All old endpoint handlers have been removed
// The middleware above blocks everything before reaching any handler

export default r;
