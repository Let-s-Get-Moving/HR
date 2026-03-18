/**
 * SmartMoving API Client
 * 
 * Fetches quote subtotals from the SmartMoving External API v1.
 * Implements caching in the smartmoving_quote_cache table to avoid repeated API calls.
 * 
 * Base URL: https://api-public.smartmoving.com/v1
 * Auth: X-Api-Key + X-ClientId headers
 * 
 * USD amounts are automatically converted to CAD at 1.25 rate.
 */

import { pool } from '../db.js';

const SMARTMOVING_BASE_URL = 'https://api-public.smartmoving.com/v1';
const SMARTMOVING_API_KEY = process.env.SMARTMOVING_API_KEY || '29f2beddae514bff84a60a1578f8df83';
const SMARTMOVING_CLIENT_ID = process.env.SMARTMOVING_CLIENT_ID || 'b0db4e2b-74af-44e2-8ecd-6f4921ec836f';

const USD_TO_CAD_RATE = 1.25;

/**
 * Get quote subtotal (cached)
 * 
 * @param {number} quoteNumber - The quote number to fetch
 * @returns {Promise<number>} Subtotal in CAD
 */
export async function getQuoteSubtotal(quoteNumber) {
    // Check cache first
    const cached = await pool.query(
        'SELECT subtotal_cad, fetched_at FROM smartmoving_quote_cache WHERE quote_number = $1',
        [quoteNumber]
    );
    
    if (cached.rows.length > 0) {
        const subtotal = parseFloat(cached.rows[0].subtotal_cad) || 0;
        return subtotal;
    }
    
    // Cache miss - fetch from API
    try {
        const response = await fetch(`${SMARTMOVING_BASE_URL}/api/opportunities/quote/${quoteNumber}`, {
            method: 'GET',
            headers: {
                'X-Api-Key': SMARTMOVING_API_KEY,
                'X-ClientId': SMARTMOVING_CLIENT_ID,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            // If 404 or other error, cache as 0
            console.warn(`SmartMoving API error for quote ${quoteNumber}: ${response.status} ${response.statusText}`);
            await cacheSubtotal(quoteNumber, 0, null, 'CAD');
            return 0;
        }
        
        const data = await response.json();
        
        // Extract subtotal from estimatedTotal.subtotal
        const subtotalRaw = data?.estimatedTotal?.subtotal || 0;
        const branch = data?.branchName || data?.branch || null;
        
        // Determine currency and convert if needed
        // US branches start with "US-" or contain "USA"
        const isUSBranch = branch && (
            branch.toUpperCase().startsWith('US-') || 
            branch.toUpperCase().includes('USA') ||
            branch.toUpperCase().includes('UNITED STATES')
        );
        
        let subtotalCAD = parseFloat(subtotalRaw) || 0;
        let currencyCode = 'CAD';
        
        if (isUSBranch) {
            // Convert USD to CAD
            subtotalCAD = subtotalCAD * USD_TO_CAD_RATE;
            currencyCode = 'USD';
        }
        
        // Round to 2 decimals
        subtotalCAD = Math.round(subtotalCAD * 100) / 100;
        
        // Cache the result
        await cacheSubtotal(quoteNumber, subtotalCAD, branch, currencyCode);
        
        return subtotalCAD;
        
    } catch (error) {
        console.error(`Failed to fetch quote ${quoteNumber} from SmartMoving:`, error);
        // Cache as 0 to avoid repeated failed requests
        await cacheSubtotal(quoteNumber, 0, null, 'CAD');
        return 0;
    }
}

/**
 * Get subtotals for multiple quotes in batch
 * Returns a Map of quoteNumber -> subtotalCAD
 * 
 * @param {number[]} quoteNumbers - Array of quote numbers
 * @returns {Promise<Map<number, number>>} Map of quote number to subtotal
 */
export async function getQuoteSubtotalsBatch(quoteNumbers) {
    if (!quoteNumbers || quoteNumbers.length === 0) {
        return new Map();
    }
    
    const results = new Map();
    
    // Fetch from cache first
    const cached = await pool.query(
        'SELECT quote_number, subtotal_cad FROM smartmoving_quote_cache WHERE quote_number = ANY($1)',
        [quoteNumbers]
    );
    
    const cachedSet = new Set();
    for (const row of cached.rows) {
        results.set(row.quote_number, parseFloat(row.subtotal_cad) || 0);
        cachedSet.add(row.quote_number);
    }
    
    // Determine which quotes need to be fetched
    const uncachedQuotes = quoteNumbers.filter(q => !cachedSet.has(q));
    
    if (uncachedQuotes.length === 0) {
        return results;
    }
    
    // Fetch uncached quotes in parallel with rate limiting
    // Limit to 5 concurrent requests to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let i = 0; i < uncachedQuotes.length; i += BATCH_SIZE) {
        const batch = uncachedQuotes.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(quoteNum => getQuoteSubtotal(quoteNum));
        const batchResults = await Promise.all(batchPromises);
        
        batch.forEach((quoteNum, idx) => {
            results.set(quoteNum, batchResults[idx]);
        });
    }
    
    return results;
}

/**
 * Cache a subtotal result
 * 
 * @param {number} quoteNumber
 * @param {number} subtotalCAD
 * @param {string|null} branch
 * @param {string} currencyCode
 */
async function cacheSubtotal(quoteNumber, subtotalCAD, branch, currencyCode) {
    await pool.query(`
        INSERT INTO smartmoving_quote_cache (quote_number, subtotal_cad, branch, currency_code, fetched_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (quote_number) 
        DO UPDATE SET 
            subtotal_cad = EXCLUDED.subtotal_cad,
            branch = EXCLUDED.branch,
            currency_code = EXCLUDED.currency_code,
            fetched_at = NOW()
    `, [quoteNumber, subtotalCAD, branch, currencyCode]);
}

/**
 * Clear cache for specific quotes (useful for testing or when quotes are updated)
 * 
 * @param {number[]} quoteNumbers - Optional array of quote numbers to clear. If empty, clears all.
 */
export async function clearQuoteCache(quoteNumbers = []) {
    if (quoteNumbers.length === 0) {
        await pool.query('DELETE FROM smartmoving_quote_cache');
    } else {
        await pool.query('DELETE FROM smartmoving_quote_cache WHERE quote_number = ANY($1)', [quoteNumbers]);
    }
}

/**
 * Get cache statistics
 * 
 * @returns {Promise<object>} Stats about the cache
 */
export async function getCacheStats() {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_cached,
            COUNT(*) FILTER (WHERE subtotal_cad > 0) as non_zero_cached,
            MIN(fetched_at) as oldest_fetch,
            MAX(fetched_at) as newest_fetch
        FROM smartmoving_quote_cache
    `);
    
    return result.rows[0];
}
