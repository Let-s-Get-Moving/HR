/**
 * Sales Commission Calculator
 * 
 * Implements commission calculation rules for Sales Agents and Sales Managers.
 * Uses strict nickname matching - Sales employees (agents AND managers) with matching
 * nicknames are resolved. Terminated employees are also matched (they may have commission owed).
 * 
 * REVENUE SOURCE (v2):
 *   Revenue now comes from Booked Opportunities (sales_booked_opportunities_quotes.invoiced_amount)
 *   filtered by service_date within the commission period, NOT from Sales Performance staging.
 *   Sales Performance staging is still used for booking_pct only.
 *   US branch amounts are already normalized to CAD at import time (×1.25).
 * 
 * Matching:
 *   - Employees must be in Sales department with sales_commission_enabled=true
 *   - sales_role can be 'agent', 'manager', or 'international_closer' (all matched by nickname)
 *   - international_closer is functionally identical to agent for commission calculations
 *   - Rows with booking_pct only but no BO revenue: revenue=0, still assigned to bucket
 * 
 * Agent Rules (personal):
 *   Employees with sales_role='agent' or 'international_closer' get personal commissions.
 *   Based on individual booking_pct (from Sales Performance) and revenue (from Booked Opportunities).
 *   Rate: 3.5% - 6% depending on thresholds.
 *   >55% booking + >$250k revenue = 6% + vacation package up to $5000
 * 
 * Manager Rules (bucket-sum):
 *   All agents with booking_pct contribute to pooled revenue for manager commission.
 *   Revenue for each agent comes from Booked Opportunities.
 *   Manager gets sum of (agent_revenue * bucket_rate) for each booking% bucket.
 *   Fixed percentage override available (e.g., Sam Lopka: 0.7% of total pooled revenue).
 * 
 * Warnings:
 *   - salesPerfNoBO: Agents with booking_pct in Sales Performance but no BO revenue
 *   - boUnmatchedSalesPerson: BO rows with sales_person_raw that couldn't be matched to any employee
 */

import { pool } from '../db.js';
import { normalizeNameKey } from './excelParser.js';

// ============================================================================
// Pure Commission Rate Functions
// ============================================================================

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
 * @param {number} revenue - Booked total revenue
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

// ============================================================================
// Booked Opportunities Revenue Functions
// ============================================================================

/** US flag emoji for branch detection */
const US_FLAG = '🇺🇸';

/**
 * Get aggregated revenue from Booked Opportunities by employee.
 * 
 * Queries sales_booked_opportunities_quotes filtered by service_date within period
 * and invoiced_amount IS NOT NULL. Maps sales_person_raw to employee_id via
 * normalize_nickname() matching against employee nicknames.
 * 
 * @param {Object} client - Database client
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<{
 *   revenueByEmployee: Map<number, { revenue_cad_total: number, revenue_us_flagged_total: number, revenue_non_us_total: number, quote_count: number }>,
 *   unmatchedSalesPersons: Array<{ sales_person_raw: string, quote_count: number, total_revenue: number }>
 * }>}
 */
async function getBookedOpportunitiesRevenueByEmployee(client, periodStart, periodEnd) {
    // Get all BO quotes within the period with invoiced_amount
    const boResult = await client.query(`
        SELECT 
            bo.sales_person_raw,
            bo.branch_name,
            bo.invoiced_amount,
            bo.quote_id
        FROM sales_booked_opportunities_quotes bo
        WHERE bo.service_date >= $1 
          AND bo.service_date <= $2
          AND bo.invoiced_amount IS NOT NULL
    `, [periodStart, periodEnd]);
    
    const boRows = boResult.rows;
    
    if (boRows.length === 0) {
        return {
            revenueByEmployee: new Map(),
            unmatchedSalesPersons: [],
            totalQuotes: 0,
            totalRevenue: 0,
            totalUsRevenue: 0,
            totalNonUsRevenue: 0
        };
    }
    
    // Get all enabled sales employees with their normalized nicknames
    const employeesResult = await client.query(`
        SELECT e.id, e.first_name, e.last_name, e.sales_role,
               e.nickname, e.nickname_2, e.nickname_3,
               normalize_nickname(e.nickname) AS nickname_key_1,
               normalize_nickname(e.nickname_2) AS nickname_key_2,
               normalize_nickname(e.nickname_3) AS nickname_key_3
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role IN ('agent', 'manager', 'international_closer')
          AND (e.nickname IS NOT NULL OR e.nickname_2 IS NOT NULL OR e.nickname_3 IS NOT NULL)
    `);
    
    // Build nickname -> employee map
    const nicknameToEmployee = new Map();
    for (const emp of employeesResult.rows) {
        if (emp.nickname_key_1) {
            nicknameToEmployee.set(emp.nickname_key_1, emp);
        }
        if (emp.nickname_key_2) {
            nicknameToEmployee.set(emp.nickname_key_2, emp);
        }
        if (emp.nickname_key_3) {
            nicknameToEmployee.set(emp.nickname_key_3, emp);
        }
    }
    
    // Get normalized versions of BO sales_person_raw values
    // We need to normalize them using the same DB function
    const uniqueSalesPersons = [...new Set(boRows.map(r => r.sales_person_raw).filter(Boolean))];
    
    const normalizedResult = await client.query(`
        SELECT unnest($1::text[]) AS raw_name,
               normalize_nickname(unnest($1::text[])) AS normalized_name
    `, [uniqueSalesPersons]);
    
    const rawToNormalized = new Map();
    for (const row of normalizedResult.rows) {
        rawToNormalized.set(row.raw_name, row.normalized_name);
    }
    
    // Aggregate revenue by employee
    const revenueByEmployee = new Map(); // employee_id -> { revenue_cad_total, revenue_us_flagged_total, revenue_non_us_total, quote_count }
    const unmatchedAggregates = new Map(); // sales_person_raw -> { quote_count, total_revenue }
    
    let totalRevenue = 0;
    let totalUsRevenue = 0;
    let totalNonUsRevenue = 0;
    
    for (const bo of boRows) {
        const invoicedAmount = parseFloat(bo.invoiced_amount) || 0;
        const isUSFlagged = bo.branch_name && bo.branch_name.includes(US_FLAG);
        
        totalRevenue += invoicedAmount;
        if (isUSFlagged) {
            totalUsRevenue += invoicedAmount;
        } else {
            totalNonUsRevenue += invoicedAmount;
        }
        
        // Try to match sales_person_raw to employee
        const normalizedName = rawToNormalized.get(bo.sales_person_raw);
        const employee = normalizedName ? nicknameToEmployee.get(normalizedName) : null;
        
        if (employee) {
            // Matched employee
            if (!revenueByEmployee.has(employee.id)) {
                revenueByEmployee.set(employee.id, {
                    revenue_cad_total: 0,
                    revenue_us_flagged_total: 0,
                    revenue_non_us_total: 0,
                    quote_count: 0
                });
            }
            const emp = revenueByEmployee.get(employee.id);
            emp.revenue_cad_total += invoicedAmount;
            emp.quote_count += 1;
            if (isUSFlagged) {
                emp.revenue_us_flagged_total += invoicedAmount;
            } else {
                emp.revenue_non_us_total += invoicedAmount;
            }
        } else {
            // Unmatched - aggregate by raw sales_person name
            const key = bo.sales_person_raw || '(blank)';
            if (!unmatchedAggregates.has(key)) {
                unmatchedAggregates.set(key, { quote_count: 0, total_revenue: 0 });
            }
            const agg = unmatchedAggregates.get(key);
            agg.quote_count += 1;
            agg.total_revenue += invoicedAmount;
        }
    }
    
    // Convert unmatched to array
    const unmatchedSalesPersons = Array.from(unmatchedAggregates.entries()).map(([name, data]) => ({
        sales_person_raw: name,
        quote_count: data.quote_count,
        total_revenue: Math.round(data.total_revenue * 100) / 100
    }));
    
    console.log(`[SalesCommission] BO Revenue: ${boRows.length} quotes, $${totalRevenue.toFixed(2)} total (US-flagged: $${totalUsRevenue.toFixed(2)}, non-US: $${totalNonUsRevenue.toFixed(2)})`);
    console.log(`[SalesCommission] BO matched to ${revenueByEmployee.size} employees, ${unmatchedSalesPersons.length} unmatched sales persons`);
    
    return {
        revenueByEmployee,
        unmatchedSalesPersons,
        totalQuotes: boRows.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalUsRevenue: Math.round(totalUsRevenue * 100) / 100,
        totalNonUsRevenue: Math.round(totalNonUsRevenue * 100) / 100
    };
}

// ============================================================================
// Matching Functions
// ============================================================================

/**
 * Match staging rows to employees by any of their 3 nicknames.
 * 
 * NOTE: This now only provides booking_pct from staging. Revenue comes from Booked Opportunities.
 * 
 * Matches employees with:
 * - Sales department
 * - sales_commission_enabled = true
 * - sales_role IN ('agent', 'manager', 'international_closer')
 * - Any of (nickname, nickname_2, nickname_3) normalized matches staging.name_key
 * - Includes terminated employees (they can still have commission owed)
 * 
 * Rows with booked_pct <= 0 are skipped (no booking percentage = not in commission calc).
 * Revenue is no longer sourced from staging - it comes from Booked Opportunities.
 * 
 * @param {Object} client - Database client
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<{ matched: Array, unmatched: Array, skippedNoBookingPct: number }>}
 */
async function matchAgentsToStaging(client, periodStart, periodEnd) {
    // Get all staging rows for the period (booking_pct source only)
    const stagingResult = await client.query(`
        SELECT id, name_raw, name_key, booked_pct, booked_total
        FROM sales_performance_staging
        WHERE period_start = $1 AND period_end = $2
    `, [periodStart, periodEnd]);
    
    const stagingRows = stagingResult.rows;
    
    // Get all enabled sales employees (agents AND managers) with their normalized nicknames
    // Note: Terminated employees are included - they may still have commission owed
    const employeesResult = await client.query(`
        SELECT e.id, e.first_name, e.last_name, e.sales_role,
               e.nickname, e.nickname_2, e.nickname_3,
               normalize_nickname(e.nickname) AS nickname_key_1,
               normalize_nickname(e.nickname_2) AS nickname_key_2,
               normalize_nickname(e.nickname_3) AS nickname_key_3
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role IN ('agent', 'manager', 'international_closer')
          AND (e.nickname IS NOT NULL OR e.nickname_2 IS NOT NULL OR e.nickname_3 IS NOT NULL)
    `);
    
    const employees = employeesResult.rows;
    
    // Create nickname -> employee map (map all 3 keys to the same employee)
    const nicknameToEmployee = new Map();
    for (const emp of employees) {
        if (emp.nickname_key_1) {
            nicknameToEmployee.set(emp.nickname_key_1, emp);
        }
        if (emp.nickname_key_2) {
            nicknameToEmployee.set(emp.nickname_key_2, emp);
        }
        if (emp.nickname_key_3) {
            nicknameToEmployee.set(emp.nickname_key_3, emp);
        }
    }
    
    // Match staging rows - now we only care about booking_pct, not revenue
    const matched = [];
    const unmatched = [];
    let skippedNoBookingPct = 0;
    
    for (const staging of stagingRows) {
        const bookingPct = parseFloat(staging.booked_pct) || 0;
        const stagingRevenue = parseFloat(staging.booked_total) || 0; // Keep for reference/audit only
        
        // Skip rows with zero booking_pct (they have no meaningful contribution)
        if (bookingPct <= 0) {
            skippedNoBookingPct++;
            continue;
        }
        
        const employee = nicknameToEmployee.get(staging.name_key);
        
        if (employee) {
            matched.push({
                staging_id: staging.id,
                employee_id: employee.id,
                employee_name: `${employee.first_name} ${employee.last_name}`,
                staging_name: staging.name_raw,
                sales_role: employee.sales_role,
                booking_pct: bookingPct,
                staging_revenue: stagingRevenue // For audit/comparison only, NOT used for commission
            });
        } else {
            // Store unmatched staging row (has booking_pct but no matched employee)
            unmatched.push({
                staging_name: staging.name_raw,
                booking_pct: bookingPct,
                staging_revenue: stagingRevenue // For audit only
            });
        }
    }
    
    console.log(`[SalesCommission] Staging matched ${matched.length} employees (agents+managers), ${unmatched.length} unmatched, ${skippedNoBookingPct} skipped (no booking_pct)`);
    
    return { matched, unmatched, skippedNoBookingPct };
}

/**
 * Get all enabled sales managers.
 * 
 * @param {Object} client - Database client
 * @returns {Promise<Array>}
 */
async function getSalesManagers(client) {
    const result = await client.query(`
        SELECT e.id, e.first_name, e.last_name, e.nickname,
               e.sales_manager_fixed_pct
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role = 'manager'
          AND e.status <> 'Terminated'
    `);
    
    return result.rows;
}

// ============================================================================
// Main Calculation Orchestrator
// ============================================================================

/**
 * Calculate sales commissions for a period.
 * 
 * Revenue now comes from Booked Opportunities (service_date filtered, invoiced_amount).
 * Booking percentage still comes from Sales Performance staging.
 * 
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @param {Object} options - { dryRun: boolean, calculatedBy: number }
 * @returns {Promise<Object>} Calculation summary
 */
export async function calculateSalesCommissions(periodStart, periodEnd, options = {}) {
    const { dryRun = false, calculatedBy = null } = options;
    
    console.log(`[SalesCommission] Starting calculation for ${periodStart} to ${periodEnd} (dryRun: ${dryRun})`);
    
    const client = await pool.connect();
    
    const summary = {
        period_start: periodStart,
        period_end: periodEnd,
        dry_run: dryRun,
        // Staging stats (booking_pct source)
        total_staging_rows: 0,
        matched_agents: 0,
        matched_managers_in_staging: 0,
        skipped_no_booking_pct_rows: 0,
        unmatched_staging_names: [],
        unmatched_staging_count: 0,
        // BO Revenue stats (revenue source)
        bo_total_quotes: 0,
        bo_revenue_total: 0,
        bo_revenue_us_total: 0,
        bo_revenue_non_us_total: 0,
        // Commission results
        agent_commissions: [],
        manager_commissions: [],
        total_agent_commission: 0,
        total_manager_commission: 0,
        total_vacation_awards: 0,
        // Pooled revenue for managers (from BO)
        pooled_revenue: 0,
        // Warnings for data quality
        warnings: {
            salesPerfNoBO: [],     // Agents with booking_pct but no BO revenue
            boUnmatchedSalesPerson: [] // BO rows that couldn't be matched to any employee
        }
    };
    
    try {
        await client.query('BEGIN');
        
        // Step 1: Match staging rows to employees (agents + managers) for booking_pct
        const { matched, unmatched, skippedNoBookingPct } = await matchAgentsToStaging(client, periodStart, periodEnd);
        
        // Split matched into agents vs managers for different processing
        // international_closer is treated identically to agent for commission purposes
        const matchedAgents = matched.filter(m => m.sales_role === 'agent' || m.sales_role === 'international_closer');
        const matchedManagersInStaging = matched.filter(m => m.sales_role === 'manager');
        
        summary.total_staging_rows = matched.length + unmatched.length;
        summary.matched_agents = matchedAgents.length;
        summary.matched_managers_in_staging = matchedManagersInStaging.length;
        summary.skipped_no_booking_pct_rows = skippedNoBookingPct;
        summary.unmatched_staging_names = unmatched.map(u => u.staging_name);
        summary.unmatched_staging_count = unmatched.length;
        
        // Step 2: Get revenue from Booked Opportunities
        const boRevenue = await getBookedOpportunitiesRevenueByEmployee(client, periodStart, periodEnd);
        
        summary.bo_total_quotes = boRevenue.totalQuotes;
        summary.bo_revenue_total = boRevenue.totalRevenue;
        summary.bo_revenue_us_total = boRevenue.totalUsRevenue;
        summary.bo_revenue_non_us_total = boRevenue.totalNonUsRevenue;
        summary.warnings.boUnmatchedSalesPerson = boRevenue.unmatchedSalesPersons;
        
        // Step 3: Calculate and upsert agent commissions
        // Combine staging booking_pct with BO revenue for each agent
        for (const agent of matchedAgents) {
            // Get BO revenue for this agent (or 0 if none)
            const boData = boRevenue.revenueByEmployee.get(agent.employee_id);
            const revenue = boData ? boData.revenue_cad_total : 0;
            
            // Track warning if agent has booking_pct but no BO revenue
            if (!boData || boData.revenue_cad_total === 0) {
                summary.warnings.salesPerfNoBO.push({
                    employee_id: agent.employee_id,
                    employee_name: agent.employee_name,
                    booking_pct: agent.booking_pct,
                    staging_revenue: agent.staging_revenue // For comparison
                });
            }
            
            const { pct, vacationValue } = computeAgentRate(agent.booking_pct, revenue);
            const commissionAmount = (revenue * pct) / 100;
            
            const agentResult = {
                employee_id: agent.employee_id,
                employee_name: agent.employee_name,
                booking_pct: agent.booking_pct,
                revenue: Math.round(revenue * 100) / 100,
                revenue_us_flagged: boData ? Math.round(boData.revenue_us_flagged_total * 100) / 100 : 0,
                revenue_non_us: boData ? Math.round(boData.revenue_non_us_total * 100) / 100 : 0,
                quote_count: boData ? boData.quote_count : 0,
                commission_pct: pct,
                commission_amount: Math.round(commissionAmount * 100) / 100,
                vacation_award_value: vacationValue
            };
            
            summary.agent_commissions.push(agentResult);
            summary.total_agent_commission += agentResult.commission_amount;
            summary.total_vacation_awards += vacationValue;
            
            if (!dryRun) {
                await client.query(`
                    INSERT INTO sales_agent_commissions (
                        period_start, period_end, employee_id, staging_row_id,
                        booking_pct, revenue, commission_pct, commission_amount, vacation_award_value
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (period_start, period_end, employee_id)
                    DO UPDATE SET
                        staging_row_id = EXCLUDED.staging_row_id,
                        booking_pct = EXCLUDED.booking_pct,
                        revenue = EXCLUDED.revenue,
                        commission_pct = EXCLUDED.commission_pct,
                        commission_amount = EXCLUDED.commission_amount,
                        vacation_award_value = EXCLUDED.vacation_award_value,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    periodStart, periodEnd, agent.employee_id, agent.staging_id,
                    agent.booking_pct, agentResult.revenue, pct, agentResult.commission_amount, vacationValue
                ]);
            }
        }
        
        // Step 4: Calculate manager commissions
        // Pooled revenue = sum of all BO revenue for agents with booking_pct
        const managers = await getSalesManagers(client);
        
        // Build list of all agents with booking_pct (matched from staging) + their BO revenue
        // This includes unmatched staging names for bucket assignment, but they have revenue=0 from BO perspective
        const allAgentsForManager = [];
        
        // Matched agents: use BO revenue
        for (const agent of matched) {
            const boData = boRevenue.revenueByEmployee.get(agent.employee_id);
            const revenue = boData ? boData.revenue_cad_total : 0;
            allAgentsForManager.push({
                booking_pct: agent.booking_pct,
                revenue: revenue
            });
        }
        
        // Unmatched staging names: they have booking_pct but can't be mapped to BO
        // Revenue = 0 for them (no employee match = can't link to BO)
        for (const u of unmatched) {
            allAgentsForManager.push({
                booking_pct: u.booking_pct,
                revenue: 0
            });
        }
        
        const pooledRevenue = allAgentsForManager.reduce((sum, a) => sum + a.revenue, 0);
        summary.pooled_revenue = Math.round(pooledRevenue * 100) / 100;
        
        for (const manager of managers) {
            let commissionAmount = 0;
            let calculationMethod = 'bucket_sum';
            const breakdown = [];
            
            // Check for fixed override (e.g., Sam Lopka)
            if (manager.sales_manager_fixed_pct !== null && manager.sales_manager_fixed_pct !== undefined) {
                calculationMethod = 'fixed_override';
                commissionAmount = (pooledRevenue * parseFloat(manager.sales_manager_fixed_pct)) / 100;
            } else {
                // Bucket-sum calculation
                const bucketTotals = new Map();
                
                // Initialize buckets
                for (const bucket of MANAGER_BUCKETS) {
                    bucketTotals.set(bucket.label, { 
                        revenue: 0, 
                        count: 0,
                        bucket 
                    });
                }
                
                // Assign each agent to their bucket based on booking_pct, accumulate BO revenue
                for (const agent of allAgentsForManager) {
                    const { bucket } = computeManagerBucketRate(agent.booking_pct);
                    const totals = bucketTotals.get(bucket.label);
                    totals.revenue += agent.revenue;
                    totals.count += 1;
                }
                
                // Calculate commission per bucket
                for (const [label, totals] of bucketTotals) {
                    const bucketCommission = (totals.revenue * totals.bucket.rate) / 100;
                    commissionAmount += bucketCommission;
                    
                    breakdown.push({
                        bucket_label: label,
                        bucket_min_pct: totals.bucket.min,
                        bucket_max_pct: totals.bucket.max === Infinity ? 100 : totals.bucket.max,
                        bucket_rate_pct: totals.bucket.rate,
                        agent_count: totals.count,
                        bucket_revenue: Math.round(totals.revenue * 100) / 100,
                        bucket_commission: Math.round(bucketCommission * 100) / 100
                    });
                }
            }
            
            commissionAmount = Math.round(commissionAmount * 100) / 100;
            
            const managerResult = {
                employee_id: manager.id,
                employee_name: `${manager.first_name} ${manager.last_name}`,
                commission_pct_override: manager.sales_manager_fixed_pct,
                pooled_revenue: Math.round(pooledRevenue * 100) / 100,
                commission_amount: commissionAmount,
                calculation_method: calculationMethod,
                breakdown: breakdown
            };
            
            summary.manager_commissions.push(managerResult);
            summary.total_manager_commission += commissionAmount;
            
            if (!dryRun) {
                // Upsert manager commission
                const managerInsert = await client.query(`
                    INSERT INTO sales_manager_commissions (
                        period_start, period_end, employee_id,
                        commission_pct_override, pooled_revenue, commission_amount, calculation_method
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (period_start, period_end, employee_id)
                    DO UPDATE SET
                        commission_pct_override = EXCLUDED.commission_pct_override,
                        pooled_revenue = EXCLUDED.pooled_revenue,
                        commission_amount = EXCLUDED.commission_amount,
                        calculation_method = EXCLUDED.calculation_method,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [
                    periodStart, periodEnd, manager.id,
                    manager.sales_manager_fixed_pct, pooledRevenue, commissionAmount, calculationMethod
                ]);
                
                const managerCommissionId = managerInsert.rows[0].id;
                
                // Clear old breakdown and insert new
                await client.query(`
                    DELETE FROM sales_manager_commission_breakdown
                    WHERE manager_commission_id = $1
                `, [managerCommissionId]);
                
                for (const bucket of breakdown) {
                    await client.query(`
                        INSERT INTO sales_manager_commission_breakdown (
                            manager_commission_id, bucket_label, bucket_min_pct, bucket_max_pct,
                            bucket_rate_pct, agent_count, bucket_revenue, bucket_commission
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        managerCommissionId, bucket.bucket_label, bucket.bucket_min_pct,
                        bucket.bucket_max_pct, bucket.bucket_rate_pct, bucket.agent_count,
                        bucket.bucket_revenue, bucket.bucket_commission
                    ]);
                }
            }
        }
        
        // Step 5: Write audit record
        if (!dryRun) {
            await client.query(`
                INSERT INTO sales_commission_calc_audit (
                    period_start, period_end, total_staging_rows, matched_agents, matched_managers,
                    unmatched_names, total_agent_commission, total_manager_commission,
                    total_vacation_awards, calculated_by, dry_run
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                periodStart, periodEnd, summary.total_staging_rows, summary.matched_agents,
                managers.length, JSON.stringify(summary.unmatched_staging_names),
                summary.total_agent_commission, summary.total_manager_commission,
                summary.total_vacation_awards, calculatedBy, dryRun
            ]);
        }
        
        await client.query('COMMIT');
        
        console.log(`[SalesCommission] Calculation complete:
          - Staging rows (with booking_pct): ${summary.total_staging_rows}
          - Skipped (no booking_pct): ${summary.skipped_no_booking_pct_rows}
          - Matched agents: ${summary.matched_agents}
          - Matched managers in staging: ${summary.matched_managers_in_staging}
          - Unmatched staging names: ${summary.unmatched_staging_count}
          - BO quotes: ${summary.bo_total_quotes}
          - BO revenue (CAD): $${summary.bo_revenue_total} (US-flagged: $${summary.bo_revenue_us_total}, non-US: $${summary.bo_revenue_non_us_total})
          - Pooled revenue: $${summary.pooled_revenue}
          - Total agent commission: $${summary.total_agent_commission}
          - Total manager commission: $${summary.total_manager_commission}
          - Total vacation awards: $${summary.total_vacation_awards}
          - Warnings: ${summary.warnings.salesPerfNoBO.length} agents with no BO revenue, ${summary.warnings.boUnmatchedSalesPerson.length} unmatched BO sales persons`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[SalesCommission] Calculation failed:', error);
        throw error;
    } finally {
        client.release();
    }
    
    return summary;
}

/**
 * Get agent commissions for a period.
 * 
 * @param {string} periodStart - Period start date
 * @param {string} periodEnd - Period end date
 * @param {number|null} employeeId - Optional: filter by employee
 * @returns {Promise<Array>}
 */
export async function getAgentCommissions(periodStart, periodEnd, employeeId = null) {
    let query = `
        SELECT sac.*, 
               e.first_name, e.last_name, e.nickname,
               e.first_name || ' ' || e.last_name AS employee_name
        FROM sales_agent_commissions sac
        JOIN employees e ON sac.employee_id = e.id
        WHERE sac.period_start = $1 AND sac.period_end = $2
    `;
    
    const params = [periodStart, periodEnd];
    
    if (employeeId) {
        query += ` AND sac.employee_id = $3`;
        params.push(employeeId);
    }
    
    query += ` ORDER BY sac.commission_amount DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get manager commissions for a period.
 * 
 * @param {string} periodStart - Period start date
 * @param {string} periodEnd - Period end date
 * @param {number|null} employeeId - Optional: filter by employee
 * @returns {Promise<Array>}
 */
export async function getManagerCommissions(periodStart, periodEnd, employeeId = null) {
    let query = `
        SELECT smc.*, 
               e.first_name, e.last_name, e.nickname,
               e.first_name || ' ' || e.last_name AS employee_name
        FROM sales_manager_commissions smc
        JOIN employees e ON smc.employee_id = e.id
        WHERE smc.period_start = $1 AND smc.period_end = $2
    `;
    
    const params = [periodStart, periodEnd];
    
    if (employeeId) {
        query += ` AND smc.employee_id = $3`;
        params.push(employeeId);
    }
    
    query += ` ORDER BY smc.commission_amount DESC`;
    
    const result = await pool.query(query, params);
    
    // Fetch breakdown for each manager
    for (const manager of result.rows) {
        const breakdownResult = await pool.query(`
            SELECT * FROM sales_manager_commission_breakdown
            WHERE manager_commission_id = $1
            ORDER BY bucket_min_pct
        `, [manager.id]);
        
        manager.breakdown = breakdownResult.rows;
    }
    
    return result.rows;
}

/**
 * Get available periods with commission data.
 * 
 * @returns {Promise<Array>}
 */
export async function getCommissionPeriods() {
    const result = await pool.query(`
        SELECT DISTINCT period_start, period_end,
               COUNT(DISTINCT employee_id) as agent_count,
               SUM(commission_amount) as total_commission
        FROM sales_agent_commissions
        GROUP BY period_start, period_end
        ORDER BY period_start DESC
    `);
    
    return result.rows;
}
