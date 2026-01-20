/**
 * Commission Adjustments Aggregator
 * 
 * Computes the 4 adjustment columns (revenue add-ons, revenue deductions, booking bonus, booking deductions)
 * by employee_id for a given period based on service_date.
 * 
 * This module joins:
 *   - sales_lead_status_quotes (directives: who gets what %)
 *   - sales_booked_opportunities_quotes (invoiced_amount, service_date)
 *   - employees (matching by normalized nickname)
 * 
 * Only processes quotes where:
 *   - Lead Status report status_norm = 'completed' or 'closed' (exact)
 *   - Booked Opportunities row exists (has invoiced_amount)
 *   - service_date falls within the selected period
 */

import { pool } from '../db.js';

/**
 * Get adjustment aggregates for all employees in a period
 * 
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<Map<number, object>>} Map of employee_id -> adjustment totals
 */
export async function getAdjustmentsByPeriod(periodStart, periodEnd) {
    const query = `
        WITH eligible_quotes AS (
            -- Join lead status with booked opportunities, filter by status and period
            SELECT 
                ls.quote_id,
                ls.sales_person_key,
                ls.directive_type,
                ls.target_name_key,
                ls.pct,
                ls.amount,
                bo.invoiced_amount,
                bo.service_date
            FROM sales_lead_status_quotes ls
            INNER JOIN sales_booked_opportunities_quotes bo ON ls.quote_id = bo.quote_id
            WHERE ls.status_norm IN ('completed', 'closed')
              AND bo.service_date >= $1
              AND bo.service_date <= $2
              AND bo.invoiced_amount IS NOT NULL
              AND ls.directive_type IS NOT NULL
              AND ls.directive_type <> 'none'
        ),
        -- Match original sales person to employee by nickname
        original_employee AS (
            SELECT 
                eq.quote_id,
                e.id AS employee_id
            FROM eligible_quotes eq
            INNER JOIN employees e ON TRIM(REGEXP_REPLACE(
                REGEXP_REPLACE(
                    LOWER(TRIM(e.nickname)),
                    '[^a-z0-9\\s-]', '', 'g'
                ),
                '\\s+', ' ', 'g'
            )) = eq.sales_person_key
            WHERE e.nickname IS NOT NULL
        ),
        -- Match target person to employee by nickname
        target_employee AS (
            SELECT 
                eq.quote_id,
                e.id AS employee_id
            FROM eligible_quotes eq
            INNER JOIN employees e ON TRIM(REGEXP_REPLACE(
                REGEXP_REPLACE(
                    LOWER(TRIM(e.nickname)),
                    '[^a-z0-9\\s-]', '', 'g'
                ),
                '\\s+', ' ', 'g'
            )) = eq.target_name_key
            WHERE e.nickname IS NOT NULL
        ),
        -- Calculate transfer amounts per quote
        transfers AS (
            SELECT 
                eq.quote_id,
                eq.directive_type,
                oe.employee_id AS original_employee_id,
                te.employee_id AS target_employee_id,
                CASE 
                    WHEN eq.directive_type = 'percent_split' THEN 
                        ROUND((eq.invoiced_amount * eq.pct / 100)::numeric, 2)
                    WHEN eq.directive_type IN ('fixed_rev_transfer', 'fixed_booking_transfer') THEN 
                        eq.amount
                    ELSE 0
                END AS transfer_amount
            FROM eligible_quotes eq
            LEFT JOIN original_employee oe ON eq.quote_id = oe.quote_id
            LEFT JOIN target_employee te ON eq.quote_id = te.quote_id
        ),
        -- Aggregate add-ons for target employees (what they receive)
        target_aggregates AS (
            SELECT 
                target_employee_id AS employee_id,
                SUM(CASE WHEN directive_type IN ('percent_split', 'fixed_rev_transfer') THEN transfer_amount ELSE 0 END) AS revenue_add_ons,
                SUM(CASE WHEN directive_type = 'fixed_booking_transfer' THEN transfer_amount ELSE 0 END) AS booking_bonus_plus
            FROM transfers
            WHERE target_employee_id IS NOT NULL
            GROUP BY target_employee_id
        ),
        -- Aggregate deductions for original employees (what they lose)
        original_aggregates AS (
            SELECT 
                original_employee_id AS employee_id,
                SUM(CASE WHEN directive_type IN ('percent_split', 'fixed_rev_transfer') THEN transfer_amount ELSE 0 END) AS revenue_deductions,
                SUM(CASE WHEN directive_type = 'fixed_booking_transfer' THEN transfer_amount ELSE 0 END) AS booking_bonus_minus
            FROM transfers
            WHERE original_employee_id IS NOT NULL
            GROUP BY original_employee_id
        )
        -- Combine all adjustments per employee
        SELECT 
            COALESCE(ta.employee_id, oa.employee_id) AS employee_id,
            COALESCE(ta.revenue_add_ons, 0) AS revenue_add_ons,
            COALESCE(oa.revenue_deductions, 0) AS revenue_deductions,
            COALESCE(ta.booking_bonus_plus, 0) AS booking_bonus_plus,
            COALESCE(oa.booking_bonus_minus, 0) AS booking_bonus_minus
        FROM target_aggregates ta
        FULL OUTER JOIN original_aggregates oa ON ta.employee_id = oa.employee_id
        WHERE COALESCE(ta.employee_id, oa.employee_id) IS NOT NULL
    `;
    
    const result = await pool.query(query, [periodStart, periodEnd]);
    
    // Convert to Map for easy lookup
    const adjustmentsMap = new Map();
    for (const row of result.rows) {
        adjustmentsMap.set(row.employee_id, {
            revenue_add_ons: parseFloat(row.revenue_add_ons) || 0,
            revenue_deductions: parseFloat(row.revenue_deductions) || 0,
            booking_bonus_plus: parseFloat(row.booking_bonus_plus) || 0,
            booking_bonus_minus: parseFloat(row.booking_bonus_minus) || 0
        });
    }
    
    return adjustmentsMap;
}

/**
 * Get adjustment details for a specific employee
 * Returns individual quote-level breakdown
 * 
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @param {number} employeeId - Employee ID to get details for
 * @returns {Promise<object>} Breakdown of adjustments
 */
export async function getAdjustmentDetailsForEmployee(periodStart, periodEnd, employeeId) {
    // Get employee's nickname
    const empResult = await pool.query(`
        SELECT nickname FROM employees WHERE id = $1
    `, [employeeId]);
    
    if (empResult.rows.length === 0 || !empResult.rows[0].nickname) {
        return { add_ons: [], deductions: [], totals: getEmptyAdjustments() };
    }
    
    const nickname = empResult.rows[0].nickname;
    const nicknameKey = nickname.trim().toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Get quotes where this employee is the target (receives add-ons)
    const addOnsQuery = `
        SELECT 
            ls.quote_id,
            ls.lead_status_raw,
            ls.directive_type,
            ls.pct,
            ls.amount,
            ls.sales_person_raw AS from_person,
            bo.invoiced_amount,
            bo.service_date,
            CASE 
                WHEN ls.directive_type = 'percent_split' THEN 
                    ROUND((bo.invoiced_amount * ls.pct / 100)::numeric, 2)
                WHEN ls.directive_type IN ('fixed_rev_transfer', 'fixed_booking_transfer') THEN 
                    ls.amount
                ELSE 0
            END AS transfer_amount
        FROM sales_lead_status_quotes ls
        INNER JOIN sales_booked_opportunities_quotes bo ON ls.quote_id = bo.quote_id
        WHERE ls.status_norm IN ('completed', 'closed')
          AND bo.service_date >= $1
          AND bo.service_date <= $2
          AND bo.invoiced_amount IS NOT NULL
          AND ls.target_name_key = $3
        ORDER BY bo.service_date DESC
    `;
    
    // Get quotes where this employee is the original (loses to deductions)
    const deductionsQuery = `
        SELECT 
            ls.quote_id,
            ls.lead_status_raw,
            ls.directive_type,
            ls.pct,
            ls.amount,
            ls.target_name_raw AS to_person,
            bo.invoiced_amount,
            bo.service_date,
            CASE 
                WHEN ls.directive_type = 'percent_split' THEN 
                    ROUND((bo.invoiced_amount * ls.pct / 100)::numeric, 2)
                WHEN ls.directive_type IN ('fixed_rev_transfer', 'fixed_booking_transfer') THEN 
                    ls.amount
                ELSE 0
            END AS transfer_amount
        FROM sales_lead_status_quotes ls
        INNER JOIN sales_booked_opportunities_quotes bo ON ls.quote_id = bo.quote_id
        WHERE ls.status_norm IN ('completed', 'closed')
          AND bo.service_date >= $1
          AND bo.service_date <= $2
          AND bo.invoiced_amount IS NOT NULL
          AND ls.sales_person_key = $3
          AND ls.directive_type IS NOT NULL
          AND ls.directive_type <> 'none'
        ORDER BY bo.service_date DESC
    `;
    
    const [addOnsResult, deductionsResult] = await Promise.all([
        pool.query(addOnsQuery, [periodStart, periodEnd, nicknameKey]),
        pool.query(deductionsQuery, [periodStart, periodEnd, nicknameKey])
    ]);
    
    // Calculate totals
    let totals = getEmptyAdjustments();
    
    for (const row of addOnsResult.rows) {
        const amount = parseFloat(row.transfer_amount) || 0;
        if (row.directive_type === 'fixed_booking_transfer') {
            totals.booking_bonus_plus += amount;
        } else {
            totals.revenue_add_ons += amount;
        }
    }
    
    for (const row of deductionsResult.rows) {
        const amount = parseFloat(row.transfer_amount) || 0;
        if (row.directive_type === 'fixed_booking_transfer') {
            totals.booking_bonus_minus += amount;
        } else {
            totals.revenue_deductions += amount;
        }
    }
    
    return {
        add_ons: addOnsResult.rows,
        deductions: deductionsResult.rows,
        totals
    };
}

/**
 * Get empty adjustments object
 */
export function getEmptyAdjustments() {
    return {
        revenue_add_ons: 0,
        revenue_deductions: 0,
        booking_bonus_plus: 0,
        booking_bonus_minus: 0
    };
}

/**
 * Get unmatched names report for a period
 * Returns names from lead status directives that don't match any employee nickname
 * 
 * @param {string} periodStart - Period start date (YYYY-MM-DD)
 * @param {string} periodEnd - Period end date (YYYY-MM-DD)
 * @returns {Promise<object>} Lists of unmatched original and target names
 */
export async function getUnmatchedNamesReport(periodStart, periodEnd) {
    const query = `
        WITH eligible_quotes AS (
            SELECT 
                ls.quote_id,
                ls.sales_person_raw,
                ls.sales_person_key,
                ls.target_name_raw,
                ls.target_name_key
            FROM sales_lead_status_quotes ls
            INNER JOIN sales_booked_opportunities_quotes bo ON ls.quote_id = bo.quote_id
            WHERE ls.status_norm IN ('completed', 'closed')
              AND bo.service_date >= $1
              AND bo.service_date <= $2
              AND bo.invoiced_amount IS NOT NULL
              AND ls.directive_type IS NOT NULL
              AND ls.directive_type <> 'none'
        ),
        all_employee_nicknames AS (
            SELECT TRIM(REGEXP_REPLACE(
                REGEXP_REPLACE(
                    LOWER(TRIM(nickname)),
                    '[^a-z0-9\\s-]', '', 'g'
                ),
                '\\s+', ' ', 'g'
            )) AS nickname_key
            FROM employees
            WHERE nickname IS NOT NULL
        ),
        unmatched_originals AS (
            SELECT DISTINCT 
                eq.sales_person_raw AS name_raw,
                eq.sales_person_key AS name_key,
                'original_agent' AS role
            FROM eligible_quotes eq
            WHERE eq.sales_person_key IS NOT NULL
              AND eq.sales_person_key NOT IN (SELECT nickname_key FROM all_employee_nicknames)
        ),
        unmatched_targets AS (
            SELECT DISTINCT 
                eq.target_name_raw AS name_raw,
                eq.target_name_key AS name_key,
                'target' AS role
            FROM eligible_quotes eq
            WHERE eq.target_name_key IS NOT NULL
              AND eq.target_name_key NOT IN (SELECT nickname_key FROM all_employee_nicknames)
        )
        SELECT * FROM unmatched_originals
        UNION ALL
        SELECT * FROM unmatched_targets
        ORDER BY role, name_raw
    `;
    
    const result = await pool.query(query, [periodStart, periodEnd]);
    
    const unmatched = {
        original_agents: [],
        targets: []
    };
    
    for (const row of result.rows) {
        if (row.role === 'original_agent') {
            unmatched.original_agents.push(row.name_raw);
        } else {
            unmatched.targets.push(row.name_raw);
        }
    }
    
    return unmatched;
}

/**
 * Get import status - quotes pending invoiced amount
 * Shows lead status quotes that don't have matching booked opportunities
 * 
 * @returns {Promise<object>} Stats about pending quotes
 */
export async function getImportStatus() {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM sales_lead_status_quotes) AS total_lead_status_quotes,
            (SELECT COUNT(*) FROM sales_booked_opportunities_quotes) AS total_booked_opportunities_quotes,
            (SELECT COUNT(*) 
             FROM sales_lead_status_quotes ls 
             WHERE ls.status_norm IN ('completed', 'closed')
               AND NOT EXISTS (
                   SELECT 1 FROM sales_booked_opportunities_quotes bo 
                   WHERE bo.quote_id = ls.quote_id
               )
            ) AS pending_invoiced_amount,
            (SELECT COUNT(*) 
             FROM sales_lead_status_quotes ls 
             INNER JOIN sales_booked_opportunities_quotes bo ON ls.quote_id = bo.quote_id
             WHERE ls.status_norm IN ('completed', 'closed')
               AND bo.invoiced_amount IS NOT NULL
               AND ls.directive_type IS NOT NULL
               AND ls.directive_type <> 'none'
            ) AS ready_for_calculation
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
}
