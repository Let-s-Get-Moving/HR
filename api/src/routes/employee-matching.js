/**
 * Employee Matching API
 * Compare employees from timecards vs commissions for a pay period
 */

import { Router } from "express";
import { q } from "../db.js";

const r = Router();

/**
 * GET /api/employee-matching/compare/:periodStart/:periodEnd
 * Compare employees in timecards vs commissions for a specific period
 */
r.get("/compare/:periodStart/:periodEnd", async (req, res) => {
    try {
        const { periodStart, periodEnd } = req.params;
        
        console.log(`[Employee Matching] Comparing period ${periodStart} to ${periodEnd}`);
        
        // Get employees with timecards for this period
        const timecardEmployees = await q(`
            SELECT DISTINCT 
                e.id,
                e.first_name,
                e.last_name,
                e.first_name || ' ' || e.last_name as full_name,
                e.email,
                e.status
            FROM timecards tc
            JOIN employees e ON e.id = tc.employee_id
            WHERE tc.pay_period_start = $1 AND tc.pay_period_end = $2
            ORDER BY e.last_name, e.first_name
        `, [periodStart, periodEnd]);
        
        // Get employees with commissions for this period (from agent_commission table)
        // Period month format is YYYY-MM, so we need to match it with the period dates
        const periodMonth = periodStart.substring(0, 7); // e.g., "2025-08" from "2025-08-25"
        
        const commissionEmployees = await q(`
            SELECT DISTINCT 
                e.id,
                e.first_name,
                e.last_name,
                e.first_name || ' ' || e.last_name as full_name,
                e.email,
                e.status
            FROM agent_commission ac
            JOIN employees e ON e.id = ac.employee_id
            WHERE ac.period_month = $1
            ORDER BY e.last_name, e.first_name
        `, [periodMonth]);
        
        // Calculate differences
        const timecardIds = new Set(timecardEmployees.rows.map(e => e.id));
        const commissionIds = new Set(commissionEmployees.rows.map(e => e.id));
        
        // Employees in timecards but NOT in commissions (expected - not everyone gets commissions)
        const inTimecardsOnly = timecardEmployees.rows.filter(e => !commissionIds.has(e.id));
        
        // Employees in commissions but NOT in timecards (WARNING - shouldn't get paid if didn't work!)
        const inCommissionsOnly = commissionEmployees.rows.filter(e => !timecardIds.has(e.id));
        
        // Employees in BOTH (normal case for commission earners)
        const inBoth = timecardEmployees.rows.filter(e => commissionIds.has(e.id));
        
        const result = {
            period: {
                start: periodStart,
                end: periodEnd,
                month: periodMonth
            },
            summary: {
                total_timecard_employees: timecardEmployees.rows.length,
                total_commission_employees: commissionEmployees.rows.length,
                in_both: inBoth.length,
                in_timecards_only: inTimecardsOnly.length,
                in_commissions_only: inCommissionsOnly.length
            },
            employees: {
                timecards: timecardEmployees.rows,
                commissions: commissionEmployees.rows,
                in_both: inBoth,
                in_timecards_only: inTimecardsOnly,
                in_commissions_only: inCommissionsOnly
            },
            warnings: inCommissionsOnly.length > 0 ? [
                `⚠️ ${inCommissionsOnly.length} employee(s) have commissions but NO timecard entries!`,
                `These employees should not receive pay if they didn't work.`
            ] : [],
            notes: [
                `✅ ${inBoth.length} employees appear in both timecards and commissions (normal)`,
                `ℹ️ ${inTimecardsOnly.length} employees worked but received no commissions (expected for non-commission roles)`
            ]
        };
        
        console.log(`[Employee Matching] Results:`, result.summary);
        
        res.json(result);
        
    } catch (error) {
        console.error("[Employee Matching] Error:", error);
        res.status(500).json({ 
            error: "Failed to compare employees", 
            details: error.message 
        });
    }
});

/**
 * GET /api/employee-matching/periods
 * Get all available pay periods with timecard/commission data
 */
r.get("/periods", async (req, res) => {
    try {
        const periods = await q(`
            SELECT DISTINCT
                tc.pay_period_start,
                tc.pay_period_end,
                COUNT(DISTINCT tc.employee_id) as timecard_count
            FROM timecards tc
            GROUP BY tc.pay_period_start, tc.pay_period_end
            ORDER BY tc.pay_period_start DESC
        `);
        
        res.json(periods.rows);
    } catch (error) {
        console.error("[Employee Matching] Error fetching periods:", error);
        res.status(500).json({ 
            error: "Failed to fetch periods", 
            details: error.message 
        });
    }
});

export default r;

