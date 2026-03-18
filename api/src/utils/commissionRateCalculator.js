/**
 * Sales Commission Rate Calculator (Pure Functions)
 * 
 * Contains pure mathematical functions for calculating commission rates.
 * Used by the NEW commission draft system.
 * 
 * IMPORTANT: This file contains ONLY pure calculation logic.
 * All database operations are in commissionDraftEngine.js
 */

/**
 * Compute agent commission rate based on booking percentage and revenue.
 * 
 * Rules (ordered highest-first, "more than" means >):
 * - booking_pct > 55 AND revenue > 250000: 6.0% + vacation $5000
 * - booking_pct > 50 AND revenue > 250000: 6.0%
 * - booking_pct > 40 AND revenue > 200000: 5.5%
 * - booking_pct > 35 AND revenue > 160000: 5.0%
 * - booking_pct > 30 AND revenue > 115000: 4.5%
 * - (booking_pct > 30 AND revenue <= 115000) OR (booking_pct <= 30 AND revenue > 115000): 4.0%
 * - else: 3.5%
 * 
 * @param {number} bookingPct - Booking conversion percentage (0-100)
 * @param {number} revenue - Total revenue
 * @returns {{ pct: number, vacationValue: number }} Commission rate and vacation award
 */
export function computeAgentRate(bookingPct, revenue) {
    const pct = bookingPct || 0;
    const rev = revenue || 0;
    
    // Highest tier first: 55%+ booking AND 250k+ revenue = 6% + vacation
    if (pct > 55 && rev > 250000) {
        return { pct: 6.0, vacationValue: 5000 };
    }
    
    // 50%+ booking AND 250k+ revenue = 6%
    if (pct > 50 && rev > 250000) {
        return { pct: 6.0, vacationValue: 0 };
    }
    
    // 40%+ booking AND 200k+ revenue = 5.5%
    if (pct > 40 && rev > 200000) {
        return { pct: 5.5, vacationValue: 0 };
    }
    
    // 35%+ booking AND 160k+ revenue = 5%
    if (pct > 35 && rev > 160000) {
        return { pct: 5.0, vacationValue: 0 };
    }
    
    // 30%+ booking AND 115k+ revenue = 4.5%
    if (pct > 30 && rev > 115000) {
        return { pct: 4.5, vacationValue: 0 };
    }
    
    // Mixed: (>30% booking AND <=115k) OR (<=30% booking AND >115k) = 4%
    if ((pct > 30 && rev <= 115000) || (pct <= 30 && rev > 115000)) {
        return { pct: 4.0, vacationValue: 0 };
    }
    
    // Base rate: <30% booking AND <115k revenue = 3.5%
    return { pct: 3.5, vacationValue: 0 };
}

/**
 * Manager bucket rate definitions.
 * Key: bucket label, value: { min, max, rate }
 */
export const MANAGER_BUCKETS = [
    { label: '0-19%', min: 0, max: 19.99, rate: 0.25 },
    { label: '20-24%', min: 20, max: 24.99, rate: 0.275 },
    { label: '25-29%', min: 25, max: 29.99, rate: 0.3 },
    { label: '30-34%', min: 30, max: 34.99, rate: 0.35 },
    { label: '35-39%', min: 35, max: 39.99, rate: 0.4 },
    { label: '40%+', min: 40, max: Infinity, rate: 0.45 }
];

/**
 * Get manager commission rate for an agent's booking percentage.
 * 
 * @param {number} bookingPct - Agent's booking conversion percentage (0-100)
 * @returns {{ bucket: object, rate: number }} Bucket info and rate
 */
export function computeManagerBucketRate(bookingPct) {
    const pct = bookingPct || 0;
    
    for (const bucket of MANAGER_BUCKETS) {
        if (pct >= bucket.min && pct <= bucket.max) {
            return { bucket, rate: bucket.rate };
        }
    }
    
    // Fallback (should never happen with correct bucket definitions)
    return { bucket: MANAGER_BUCKETS[0], rate: 0.25 };
}
