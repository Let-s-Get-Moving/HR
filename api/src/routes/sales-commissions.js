/**
 * Sales Commissions API Routes
 * 
 * Endpoints for calculating and querying sales agent and manager commissions.
 * 
 * Calculation endpoint: admin/manager only
 * Read endpoints: agents can see own, managers/admin can see all
 */

import { Router } from "express";
import { q } from "../db.js";
import { applyScopeFilter, requireRole, ROLES } from "../middleware/rbac.js";
import { requireAuth } from "../session.js";
import {
    calculateSalesCommissions,
    getAgentCommissions,
    getManagerCommissions,
    getCommissionPeriods,
    computeAgentRate,
    computeManagerBucketRate,
    MANAGER_BUCKETS
} from "../utils/salesCommissionCalculator.js";

const r = Router();

// Apply scope filter to all routes
r.use(applyScopeFilter);

// ============================================================================
// Calculate Commissions
// ============================================================================

/**
 * POST /api/sales-commissions/calculate
 * Calculate sales commissions for a period.
 * Admin/Manager only.
 * 
 * Body: { period_start: "YYYY-MM-DD", period_end: "YYYY-MM-DD", dry_run?: boolean }
 */
r.post("/calculate", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
    try {
        const { period_start, period_end, dry_run = false } = req.body;
        
        // Validate required fields
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: "Missing required fields",
                details: "period_start and period_end are required (YYYY-MM-DD format)"
            });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(period_start) || !dateRegex.test(period_end)) {
            return res.status(400).json({
                error: "Invalid date format",
                details: "Dates must be in YYYY-MM-DD format"
            });
        }
        
        // Check if staging data exists for this period
        const stagingCheck = await q(`
            SELECT COUNT(*) as count 
            FROM sales_performance_staging 
            WHERE period_start = $1 AND period_end = $2
        `, [period_start, period_end]);
        
        if (parseInt(stagingCheck.rows[0].count) === 0) {
            return res.status(400).json({
                error: "No staging data found",
                details: `No sales performance data has been imported for period ${period_start} to ${period_end}. Please import data first.`
            });
        }
        
        console.log(`📊 [SALES-COMM] Starting calculation for ${period_start} to ${period_end} (dry_run: ${dry_run})`);
        
        // Get the user's employee ID for audit
        const calculatedBy = req.employeeId || null;
        
        // Run calculation
        const summary = await calculateSalesCommissions(period_start, period_end, {
            dryRun: dry_run,
            calculatedBy
        });
        
        console.log(`✅ [SALES-COMM] Calculation complete`);
        
        res.json({
            message: dry_run 
                ? "Dry run completed - no data was saved"
                : "Commission calculation completed successfully",
            summary
        });
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Calculation failed:", error);
        res.status(500).json({
            error: "Commission calculation failed",
            details: error.message
        });
    }
});

// ============================================================================
// Query Agent Commissions
// ============================================================================

/**
 * GET /api/sales-commissions/agents
 * Get agent commissions for a period.
 * Agents can see their own; managers/admin can see all.
 * 
 * Query: ?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD&employee_id=123 (optional)
 */
r.get("/agents", async (req, res) => {
    try {
        const { period_start, period_end, employee_id } = req.query;
        
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: "Missing required query parameters",
                details: "period_start and period_end are required"
            });
        }
        
        // RBAC: Users can only see their own commissions
        let filterEmployeeId = employee_id ? parseInt(employee_id) : null;
        
        if (req.userScope === 'own' && req.employeeId) {
            filterEmployeeId = req.employeeId;
            console.log(`🔒 [RBAC] Filtering agent commissions for employee ${req.employeeId}`);
        }
        
        const commissions = await getAgentCommissions(period_start, period_end, filterEmployeeId);
        
        // Format currency values for response
        const formatted = commissions.map(c => ({
            ...c,
            revenue_formatted: `$${parseFloat(c.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            commission_amount_formatted: `$${parseFloat(c.commission_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            vacation_award_formatted: c.vacation_award_value > 0 ? `$${c.vacation_award_value.toLocaleString('en-US')}` : null
        }));
        
        res.json(formatted);
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to fetch agent commissions:", error);
        res.status(500).json({
            error: "Failed to fetch agent commissions",
            details: error.message
        });
    }
});

// ============================================================================
// Query Manager Commissions
// ============================================================================

/**
 * GET /api/sales-commissions/managers
 * Get manager commissions for a period.
 * Managers can see their own; admin can see all.
 * 
 * Query: ?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD&employee_id=123 (optional)
 */
r.get("/managers", async (req, res) => {
    try {
        const { period_start, period_end, employee_id } = req.query;
        
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: "Missing required query parameters",
                details: "period_start and period_end are required"
            });
        }
        
        // RBAC: Users can only see their own (if they're a manager)
        let filterEmployeeId = employee_id ? parseInt(employee_id) : null;
        
        if (req.userScope === 'own' && req.employeeId) {
            filterEmployeeId = req.employeeId;
            console.log(`🔒 [RBAC] Filtering manager commissions for employee ${req.employeeId}`);
        }
        
        const commissions = await getManagerCommissions(period_start, period_end, filterEmployeeId);
        
        // Format currency values for response
        const formatted = commissions.map(c => ({
            ...c,
            pooled_revenue_formatted: `$${parseFloat(c.pooled_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            commission_amount_formatted: `$${parseFloat(c.commission_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            breakdown: c.breakdown?.map(b => ({
                ...b,
                bucket_revenue_formatted: `$${parseFloat(b.bucket_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                bucket_commission_formatted: `$${parseFloat(b.bucket_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }))
        }));
        
        res.json(formatted);
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to fetch manager commissions:", error);
        res.status(500).json({
            error: "Failed to fetch manager commissions",
            details: error.message
        });
    }
});

// ============================================================================
// Query Periods
// ============================================================================

/**
 * GET /api/sales-commissions/periods
 * Get available periods with commission data.
 */
r.get("/periods", async (req, res) => {
    try {
        const periods = await getCommissionPeriods();
        
        // Format for response
        const formatted = periods.map(p => ({
            ...p,
            total_commission_formatted: `$${parseFloat(p.total_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            label: `${p.period_start} to ${p.period_end}`
        }));
        
        res.json(formatted);
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to fetch periods:", error);
        
        // Return empty array if tables don't exist yet
        if (error.message.includes('does not exist')) {
            return res.json([]);
        }
        
        res.status(500).json({
            error: "Failed to fetch periods",
            details: error.message
        });
    }
});

// ============================================================================
// Summary for a period
// ============================================================================

/**
 * GET /api/sales-commissions/summary
 * Get commission summary for a period.
 * 
 * Query: ?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
 */
r.get("/summary", async (req, res) => {
    try {
        const { period_start, period_end } = req.query;
        
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: "Missing required query parameters",
                details: "period_start and period_end are required"
            });
        }
        
        // Get agent totals
        const agentResult = await q(`
            SELECT 
                COUNT(*) as agent_count,
                SUM(commission_amount) as total_agent_commission,
                SUM(vacation_award_value) as total_vacation_awards,
                AVG(commission_pct) as avg_commission_pct
            FROM sales_agent_commissions
            WHERE period_start = $1 AND period_end = $2
        `, [period_start, period_end]);
        
        // Get manager totals
        const managerResult = await q(`
            SELECT 
                COUNT(*) as manager_count,
                SUM(commission_amount) as total_manager_commission,
                MAX(pooled_revenue) as pooled_revenue
            FROM sales_manager_commissions
            WHERE period_start = $1 AND period_end = $2
        `, [period_start, period_end]);
        
        // Get latest audit record
        const auditResult = await q(`
            SELECT unmatched_names, calculated_at
            FROM sales_commission_calc_audit
            WHERE period_start = $1 AND period_end = $2
            ORDER BY calculated_at DESC
            LIMIT 1
        `, [period_start, period_end]);
        
        const agent = agentResult.rows[0];
        const manager = managerResult.rows[0];
        const audit = auditResult.rows[0];
        
        const totalCommission = parseFloat(agent.total_agent_commission || 0) + 
                                parseFloat(manager.total_manager_commission || 0);
        
        res.json({
            period_start,
            period_end,
            agent_count: parseInt(agent.agent_count) || 0,
            manager_count: parseInt(manager.manager_count) || 0,
            total_agent_commission: parseFloat(agent.total_agent_commission) || 0,
            total_manager_commission: parseFloat(manager.total_manager_commission) || 0,
            total_vacation_awards: parseFloat(agent.total_vacation_awards) || 0,
            total_commission: totalCommission,
            pooled_revenue: parseFloat(manager.pooled_revenue) || 0,
            avg_agent_commission_pct: parseFloat(agent.avg_commission_pct) || 0,
            unmatched_names: audit?.unmatched_names || [],
            last_calculated: audit?.calculated_at || null,
            // Formatted values
            total_agent_commission_formatted: `$${(parseFloat(agent.total_agent_commission) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            total_manager_commission_formatted: `$${(parseFloat(manager.total_manager_commission) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            total_commission_formatted: `$${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            pooled_revenue_formatted: `$${(parseFloat(manager.pooled_revenue) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        });
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to fetch summary:", error);
        
        // Return empty summary if tables don't exist
        if (error.message.includes('does not exist')) {
            return res.json({
                period_start: req.query.period_start,
                period_end: req.query.period_end,
                agent_count: 0,
                manager_count: 0,
                total_agent_commission: 0,
                total_manager_commission: 0,
                total_commission: 0
            });
        }
        
        res.status(500).json({
            error: "Failed to fetch summary",
            details: error.message
        });
    }
});

// ============================================================================
// Commission Rules Reference (for UI)
// ============================================================================

/**
 * GET /api/sales-commissions/rules
 * Get commission rules reference for display in UI.
 */
r.get("/rules", async (req, res) => {
    res.json({
        agent_rules: {
            description: "Agent commission based on personal booking % and revenue",
            tiers: [
                { booking_pct: ">55%", revenue: ">$250k", rate: "6.0%", bonus: "Vacation Package up to $5,000" },
                { booking_pct: ">50%", revenue: ">$250k", rate: "6.0%", bonus: null },
                { booking_pct: ">40%", revenue: ">$200k", rate: "5.5%", bonus: null },
                { booking_pct: ">35%", revenue: ">$160k", rate: "5.0%", bonus: null },
                { booking_pct: ">30%", revenue: ">$115k", rate: "4.5%", bonus: null },
                { booking_pct: ">30% OR", revenue: ">$115k", rate: "4.0%", bonus: null },
                { booking_pct: "≤30%", revenue: "≤$115k", rate: "3.5%", bonus: null }
            ]
        },
        manager_rules: {
            description: "Manager commission based on bucket-sum of all agents' revenue",
            buckets: MANAGER_BUCKETS.map(b => ({
                label: b.label,
                min_pct: b.min,
                max_pct: b.max === Infinity ? "100+" : b.max,
                rate: `${b.rate}%`
            })),
            note: "Fixed override available for specific managers (e.g., Sam Lopka: 0.7%)"
        }
    });
});

export default r;
