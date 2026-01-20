/**
 * Sales Commission Calculator
 * 
 * Implements commission calculation rules for Sales Agents and Sales Managers.
 * Uses strict nickname matching - only employees with matching nicknames are included.
 * 
 * Agent Rules (personal):
 *   Based on individual booking_pct and revenue (booked_total).
 *   Rate: 3.5% - 6% depending on thresholds.
 *   >55% booking + >$250k revenue = 6% + vacation package up to $5000
 * 
 * Manager Rules (bucket-sum):
 *   Each agent contributes to manager commission based on agent's booking% bucket.
 *   Manager gets sum of (agent_revenue * bucket_rate) for all matched agents.
 *   Sam Lopka override: fixed 0.7% of total pooled revenue.
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
// Matching Functions
// ============================================================================

/**
 * Match staging rows to employees by any of their 3 nicknames.
 * Only matches employees with:
 * - Sales department
 * - sales_commission_enabled = true
 * - sales_role = 'agent'
 * - Any of (nickname, nickname_2, nickname_3) normalized matches staging.name_key
 * 
 * @param {Object} client - Database client
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<{ matched: Array, unmatched: Array }>}
 */
async function matchAgentsToStaging(client, periodStart, periodEnd) {
    // Get all staging rows for the period
    const stagingResult = await client.query(`
        SELECT id, name_raw, name_key, booked_pct, booked_total
        FROM sales_performance_staging
        WHERE period_start = $1 AND period_end = $2
    `, [periodStart, periodEnd]);
    
    const stagingRows = stagingResult.rows;
    
    // Get all enabled sales agents with their normalized nicknames (all 3)
    const agentsResult = await client.query(`
        SELECT e.id, e.first_name, e.last_name, 
               e.nickname, e.nickname_2, e.nickname_3,
               normalize_nickname(e.nickname) AS nickname_key_1,
               normalize_nickname(e.nickname_2) AS nickname_key_2,
               normalize_nickname(e.nickname_3) AS nickname_key_3
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE d.name ILIKE '%sales%'
          AND e.sales_commission_enabled = true
          AND e.sales_role = 'agent'
          AND (e.nickname IS NOT NULL OR e.nickname_2 IS NOT NULL OR e.nickname_3 IS NOT NULL)
          AND e.status <> 'Terminated'
    `);
    
    const agents = agentsResult.rows;
    
    // Create nickname -> employee map (map all 3 keys to the same employee)
    const nicknameToEmployee = new Map();
    for (const agent of agents) {
        if (agent.nickname_key_1) {
            nicknameToEmployee.set(agent.nickname_key_1, agent);
        }
        if (agent.nickname_key_2) {
            nicknameToEmployee.set(agent.nickname_key_2, agent);
        }
        if (agent.nickname_key_3) {
            nicknameToEmployee.set(agent.nickname_key_3, agent);
        }
    }
    
    // Match staging rows
    const matched = [];
    const unmatched = [];
    
    for (const staging of stagingRows) {
        const employee = nicknameToEmployee.get(staging.name_key);
        
        if (employee) {
            matched.push({
                staging_id: staging.id,
                employee_id: employee.id,
                employee_name: `${employee.first_name} ${employee.last_name}`,
                staging_name: staging.name_raw,
                booking_pct: parseFloat(staging.booked_pct) || 0,
                revenue: parseFloat(staging.booked_total) || 0
            });
        } else {
            // Store full data for unmatched rows (needed for manager commission calc)
            unmatched.push({
                staging_name: staging.name_raw,
                booking_pct: parseFloat(staging.booked_pct) || 0,
                revenue: parseFloat(staging.booked_total) || 0
            });
        }
    }
    
    console.log(`[SalesCommission] Matched ${matched.length} agents, ${unmatched.length} unmatched`);
    
    return { matched, unmatched };
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
        total_staging_rows: 0,
        matched_agents: 0,
        unmatched_names: [],
        unmatched_count: 0,
        agent_commissions: [],
        manager_commissions: [],
        total_agent_commission: 0,
        total_manager_commission: 0,
        total_vacation_awards: 0,
        // Revenue breakdown
        total_staging_revenue: 0,
        matched_revenue: 0,
        unmatched_revenue: 0
    };
    
    try {
        await client.query('BEGIN');
        
        // Step 1: Match agents to staging data
        const { matched, unmatched } = await matchAgentsToStaging(client, periodStart, periodEnd);
        
        summary.total_staging_rows = matched.length + unmatched.length;
        summary.matched_agents = matched.length;
        summary.unmatched_names = unmatched.map(u => u.staging_name);
        summary.unmatched_count = unmatched.length;
        
        // Step 2: Calculate and upsert agent commissions
        for (const agent of matched) {
            const { pct, vacationValue } = computeAgentRate(agent.booking_pct, agent.revenue);
            const commissionAmount = (agent.revenue * pct) / 100;
            
            const agentResult = {
                employee_id: agent.employee_id,
                employee_name: agent.employee_name,
                booking_pct: agent.booking_pct,
                revenue: agent.revenue,
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
                    agent.booking_pct, agent.revenue, pct, agentResult.commission_amount, vacationValue
                ]);
            }
        }
        
        // Step 3: Calculate manager commissions
        // IMPORTANT: Managers get commission from ALL agents in staging (matched + unmatched)
        // even though only matched employees receive personal agent commissions
        const managers = await getSalesManagers(client);
        
        // Combine all staging agents for manager calculations
        const allStagingAgents = [
            ...matched.map(a => ({ booking_pct: a.booking_pct, revenue: a.revenue })),
            ...unmatched
        ];
        
        const pooledRevenue = allStagingAgents.reduce((sum, a) => sum + a.revenue, 0);
        
        // Track revenue breakdown for transparency
        summary.total_staging_revenue = pooledRevenue;
        summary.matched_revenue = matched.reduce((sum, a) => sum + a.revenue, 0);
        summary.unmatched_revenue = unmatched.reduce((sum, a) => sum + a.revenue, 0);
        
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
                
                // Assign each agent to their bucket (ALL agents, not just matched)
                for (const agent of allStagingAgents) {
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
        
        // Step 4: Write audit record
        if (!dryRun) {
            await client.query(`
                INSERT INTO sales_commission_calc_audit (
                    period_start, period_end, total_staging_rows, matched_agents, matched_managers,
                    unmatched_names, total_agent_commission, total_manager_commission,
                    total_vacation_awards, calculated_by, dry_run
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                periodStart, periodEnd, summary.total_staging_rows, summary.matched_agents,
                managers.length, JSON.stringify(unmatched.map(u => u.staging_name)),
                summary.total_agent_commission, summary.total_manager_commission,
                summary.total_vacation_awards, calculatedBy, dryRun
            ]);
        }
        
        await client.query('COMMIT');
        
        console.log(`[SalesCommission] Calculation complete:
          - Total staging rows: ${summary.total_staging_rows}
          - Matched agents: ${summary.matched_agents}
          - Unmatched agents: ${summary.unmatched_count} (still included in manager calc)
          - Total staging revenue: $${summary.total_staging_revenue}
          - Matched revenue: $${summary.matched_revenue}
          - Unmatched revenue: $${summary.unmatched_revenue}
          - Total agent commission: $${summary.total_agent_commission}
          - Total manager commission: $${summary.total_manager_commission}
          - Total vacation awards: $${summary.total_vacation_awards}`);
        
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
