/**
 * Sales Commission Rate Calculator (DB-Backed)
 * 
 * Loads commission structure from application_settings table.
 * Used by the NEW commission draft system.
 */

import { pool } from '../db.js';

// Cache for loaded commission structure settings
let settingsCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load commission structure settings from application_settings table.
 * Results are cached for 1 minute.
 * 
 * @returns {Promise<{ agentThresholds: Array, managerThresholds: Array, vacationValue: number }>}
 */
async function loadCommissionSettings() {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (settingsCache && (now - lastCacheTime) < CACHE_TTL) {
        return settingsCache;
    }
    
    try {
        const result = await pool.query(`
            SELECT key, value 
            FROM application_settings 
            WHERE key LIKE 'sales_agent_threshold_%' 
               OR key LIKE 'sales_manager_threshold_%'
               OR key = 'sales_agent_vacation_package_value'
            ORDER BY key
        `);
        
        const agentThresholds = [];
        const managerThresholds = [];
        let vacationValue = 5000; // Default
        
        for (const row of result.rows) {
            if (row.key === 'sales_agent_vacation_package_value') {
                vacationValue = parseFloat(row.value) || 5000;
            } else if (row.key.startsWith('sales_agent_threshold_')) {
                const [leadPct, revenueThreshold, commissionPct] = row.value.split(',').map(v => parseFloat(v));
                agentThresholds.push({ leadPct, revenueThreshold, commissionPct });
            } else if (row.key.startsWith('sales_manager_threshold_')) {
                const [minBooking, maxBooking, commissionPct] = row.value.split(',').map(v => parseFloat(v));
                managerThresholds.push({ minBooking, maxBooking, commissionPct });
            }
        }
        
        settingsCache = { agentThresholds, managerThresholds, vacationValue };
        lastCacheTime = now;
        
        console.log(`[commissionRateCalculator] Loaded ${agentThresholds.length} agent thresholds, ${managerThresholds.length} manager thresholds`);
        
        return settingsCache;
    } catch (error) {
        console.error('[commissionRateCalculator] Failed to load settings, using hardcoded fallback:', error);
        
        // Fallback to hardcoded values
        return {
            agentThresholds: [
                { leadPct: 55, revenueThreshold: 250000, commissionPct: 6.0 },
                { leadPct: 40, revenueThreshold: 200000, commissionPct: 5.5 },
                { leadPct: 35, revenueThreshold: 160000, commissionPct: 5.0 },
                { leadPct: 30, revenueThreshold: 115000, commissionPct: 4.5 },
                { leadPct: 30, revenueThreshold: 115000, commissionPct: 4.0 },
                { leadPct: 0, revenueThreshold: 0, commissionPct: 3.5 }
            ],
            managerThresholds: [
                { minBooking: 40, maxBooking: 100, commissionPct: 0.45 },
                { minBooking: 35, maxBooking: 39, commissionPct: 0.40 },
                { minBooking: 30, maxBooking: 34, commissionPct: 0.35 },
                { minBooking: 25, maxBooking: 29, commissionPct: 0.30 },
                { minBooking: 20, maxBooking: 24, commissionPct: 0.275 },
                { minBooking: 0, maxBooking: 19, commissionPct: 0.25 }
            ],
            vacationValue: 5000
        };
    }
}

/**
 * Compute agent commission rate based on booking percentage and revenue.
 * Now loads from application_settings table.
 * 
 * @param {number} bookingPct - Booking conversion percentage (0-100)
 * @param {number} revenue - Total revenue
 * @returns {Promise<{ pct: number, vacationValue: number }>} Commission rate and vacation award
 */
export async function computeAgentRate(bookingPct, revenue) {
    const settings = await loadCommissionSettings();
    const pct = bookingPct || 0;
    const rev = revenue || 0;
    
    // Find the best matching threshold (highest commission that agent qualifies for)
    // Thresholds are stored as: leadPct >= X AND revenueThreshold >= Y → commissionPct
    let bestMatch = { commissionPct: 3.5, hasVacation: false }; // Default lowest rate
    
    for (const threshold of settings.agentThresholds) {
        const meetsLeadReq = pct >= threshold.leadPct;
        const meetsRevenueReq = rev >= threshold.revenueThreshold;
        
        if (meetsLeadReq && meetsRevenueReq && threshold.commissionPct > bestMatch.commissionPct) {
            bestMatch = {
                commissionPct: threshold.commissionPct,
                hasVacation: (pct >= 55 && rev >= 250000) // Vacation only for top tier
            };
        }
    }
    
    return {
        pct: bestMatch.commissionPct,
        vacationValue: bestMatch.hasVacation ? settings.vacationValue : 0
    };
}

/**
 * Get manager commission rate for an agent's booking percentage.
 * Now loads from application_settings table.
 * 
 * @param {number} bookingPct - Agent's booking conversion percentage (0-100)
 * @returns {Promise<number>} Commission rate percentage
 */
export async function computeManagerBucketRate(bookingPct) {
    const settings = await loadCommissionSettings();
    const pct = bookingPct || 0;
    
    for (const threshold of settings.managerThresholds) {
        if (pct >= threshold.minBooking && pct <= threshold.maxBooking) {
            return threshold.commissionPct;
        }
    }
    
    // Fallback to lowest tier
    return 0.25;
}
