/**
 * Sales Commissions API Routes
 * 
 * Endpoints for calculating and querying sales agent and manager commissions.
 * Also includes Lead Status and Booked Opportunities import endpoints for
 * commission adjustments (revenue add-ons, deductions, booking bonuses).
 * 
 * Calculation endpoint: admin/manager only
 * Read endpoints: agents can see own, managers/admin can see all
 * Import endpoints: admin/manager only
 */

import { Router } from "express";
import multer from "multer";
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
import { importLeadStatusFromExcel } from "../utils/leadStatusImporter.js";
import { importBookedOpportunitiesFromExcel } from "../utils/bookedOpportunitiesImporter.js";
import { 
    getAdjustmentsByPeriod, 
    getEmptyAdjustments,
    getUnmatchedNamesReport,
    getImportStatus
} from "../utils/commissionAdjustmentsAggregator.js";
import { validateFileContent } from '../utils/fileValidation.js';

const r = Router();

// Configure multer for file uploads (memory storage for Excel files)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const isExcel = file.mimetype.includes('sheet') || 
                        file.originalname.endsWith('.xlsx') || 
                        file.originalname.endsWith('.xls');
        const isCSV = file.mimetype === 'text/csv' || 
                      file.mimetype === 'application/csv' ||
                      file.originalname.endsWith('.csv');
        if (isExcel || isCSV) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel or CSV files are allowed'), false);
        }
    }
});

/**
 * Helper: Format currency for display
 */
function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
 * Now includes 4 adjustment columns from Lead Status/Booked Opportunities imports:
 *   - revenue_add_ons: Amount received from splits/transfers
 *   - revenue_deductions: Amount deducted for splits/transfers to others
 *   - booking_bonus_plus: Booking bonus received
 *   - booking_bonus_minus: Booking bonus deducted
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
        
        // Get adjustments for all employees in this period
        let adjustmentsMap = new Map();
        try {
            adjustmentsMap = await getAdjustmentsByPeriod(period_start, period_end);
        } catch (adjError) {
            // If adjustment tables don't exist yet, continue with empty adjustments
            console.log(`[SALES-COMM] Adjustment tables may not exist yet: ${adjError.message}`);
        }
        
        // Format currency values for response and merge adjustments
        const formatted = commissions.map(c => {
            const adj = adjustmentsMap.get(c.employee_id) || getEmptyAdjustments();
            
            return {
                ...c,
                revenue_formatted: formatCurrency(c.revenue),
                commission_amount_formatted: formatCurrency(c.commission_amount),
                vacation_award_formatted: c.vacation_award_value > 0 ? `$${c.vacation_award_value.toLocaleString('en-US')}` : null,
                // Raw adjustment values
                revenue_add_ons: adj.revenue_add_ons,
                revenue_deductions: adj.revenue_deductions,
                booking_bonus_plus: adj.booking_bonus_plus,
                booking_bonus_minus: adj.booking_bonus_minus,
                // Formatted adjustment values
                revenue_add_ons_formatted: formatCurrency(adj.revenue_add_ons),
                revenue_deductions_formatted: formatCurrency(adj.revenue_deductions),
                booking_bonus_plus_formatted: formatCurrency(adj.booking_bonus_plus),
                booking_bonus_minus_formatted: formatCurrency(adj.booking_bonus_minus)
            };
        });
        
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
 * Now includes 4 adjustment columns from Lead Status/Booked Opportunities imports:
 *   - revenue_add_ons: Amount received from splits/transfers
 *   - revenue_deductions: Amount deducted for splits/transfers to others
 *   - booking_bonus_plus: Booking bonus received
 *   - booking_bonus_minus: Booking bonus deducted
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
        
        // Get adjustments for all employees in this period
        let adjustmentsMap = new Map();
        try {
            adjustmentsMap = await getAdjustmentsByPeriod(period_start, period_end);
        } catch (adjError) {
            // If adjustment tables don't exist yet, continue with empty adjustments
            console.log(`[SALES-COMM] Adjustment tables may not exist yet: ${adjError.message}`);
        }
        
        // Format currency values for response and merge adjustments
        const formatted = commissions.map(c => {
            const adj = adjustmentsMap.get(c.employee_id) || getEmptyAdjustments();
            
            return {
                ...c,
                pooled_revenue_formatted: formatCurrency(c.pooled_revenue),
                commission_amount_formatted: formatCurrency(c.commission_amount),
                breakdown: c.breakdown?.map(b => ({
                    ...b,
                    bucket_revenue_formatted: formatCurrency(b.bucket_revenue),
                    bucket_commission_formatted: formatCurrency(b.bucket_commission)
                })),
                // Raw adjustment values
                revenue_add_ons: adj.revenue_add_ons,
                revenue_deductions: adj.revenue_deductions,
                booking_bonus_plus: adj.booking_bonus_plus,
                booking_bonus_minus: adj.booking_bonus_minus,
                // Formatted adjustment values
                revenue_add_ons_formatted: formatCurrency(adj.revenue_add_ons),
                revenue_deductions_formatted: formatCurrency(adj.revenue_deductions),
                booking_bonus_plus_formatted: formatCurrency(adj.booking_bonus_plus),
                booking_bonus_minus_formatted: formatCurrency(adj.booking_bonus_minus)
            };
        });
        
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

// ============================================================================
// Lead Status and Booked Opportunities Import Endpoints
// ============================================================================

/**
 * POST /api/sales-commissions/import/lead-status
 * Import Lead Status Report Excel file.
 * Admin/Manager only.
 * 
 * Expected columns: Quote #, Branch Name, Status, Lead Status, Service Type, etc.
 * Upserts by quote_id.
 */
r.post("/import/lead-status", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), upload.single('excel_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        console.log(`📥 [SALES-COMM] Starting Lead Status import: ${req.file.originalname}`);
        
        // Validate file type
        const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls');
        const isCSV = req.file.originalname.endsWith('.csv');
        
        if (!isExcel && !isCSV) {
            return res.status(400).json({
                error: "Invalid file type",
                details: "Please upload an Excel (.xlsx, .xls) or CSV file"
            });
        }
        
        // Validate file content
        const fileType = isCSV ? 'csv' : 'excel';
        const fileValidation = await validateFileContent(req.file, fileType);
        if (!fileValidation.valid) {
            return res.status(400).json({
                error: "File validation failed",
                details: fileValidation.message
            });
        }
        
        // Import the file
        const { sheet_name } = req.body;
        const summary = await importLeadStatusFromExcel(
            req.file.buffer,
            req.file.originalname,
            sheet_name
        );
        
        console.log(`✅ [SALES-COMM] Lead Status import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped`);
        
        res.json({
            message: "Lead Status data imported successfully",
            summary: {
                file: summary.file,
                sheet: summary.sheet,
                inserted: summary.inserted,
                updated: summary.updated,
                skipped: summary.skipped,
                errors: summary.errors.length > 0 ? summary.errors.slice(0, 10) : [],
                warnings: summary.warnings
            }
        });
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Lead Status import failed:", error);
        res.status(500).json({
            error: "Lead Status import failed",
            details: error.message
        });
    }
});

/**
 * POST /api/sales-commissions/import/booked-opportunities
 * Import Booked Opportunities by Service Date Report Excel file.
 * Admin/Manager only.
 * 
 * Expected columns: Quote #, Status, Customer Name, Service Date, Invoiced Amount, etc.
 * Upserts by quote_id.
 */
r.post("/import/booked-opportunities", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), upload.single('excel_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        console.log(`📥 [SALES-COMM] Starting Booked Opportunities import: ${req.file.originalname}`);
        
        // Validate file type
        const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls');
        const isCSV = req.file.originalname.endsWith('.csv');
        
        if (!isExcel && !isCSV) {
            return res.status(400).json({
                error: "Invalid file type",
                details: "Please upload an Excel (.xlsx, .xls) or CSV file"
            });
        }
        
        // Validate file content
        const fileType = isCSV ? 'csv' : 'excel';
        const fileValidation = await validateFileContent(req.file, fileType);
        if (!fileValidation.valid) {
            return res.status(400).json({
                error: "File validation failed",
                details: fileValidation.message
            });
        }
        
        // Import the file
        const { sheet_name } = req.body;
        const summary = await importBookedOpportunitiesFromExcel(
            req.file.buffer,
            req.file.originalname,
            sheet_name
        );
        
        console.log(`✅ [SALES-COMM] Booked Opportunities import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped`);
        
        res.json({
            message: "Booked Opportunities data imported successfully",
            summary: {
                file: summary.file,
                sheet: summary.sheet,
                inserted: summary.inserted,
                updated: summary.updated,
                skipped: summary.skipped,
                errors: summary.errors.length > 0 ? summary.errors.slice(0, 10) : [],
                warnings: summary.warnings
            }
        });
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Booked Opportunities import failed:", error);
        res.status(500).json({
            error: "Booked Opportunities import failed",
            details: error.message
        });
    }
});

/**
 * GET /api/sales-commissions/adjustment-status
 * Get status of lead status and booked opportunities imports.
 * Shows how many quotes are ready vs pending invoiced amount.
 */
r.get("/adjustment-status", async (req, res) => {
    try {
        const status = await getImportStatus();
        
        res.json({
            total_lead_status_quotes: parseInt(status.total_lead_status_quotes) || 0,
            total_booked_opportunities_quotes: parseInt(status.total_booked_opportunities_quotes) || 0,
            pending_invoiced_amount: parseInt(status.pending_invoiced_amount) || 0,
            ready_for_calculation: parseInt(status.ready_for_calculation) || 0
        });
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to get adjustment status:", error);
        
        // If tables don't exist yet, return zeros
        if (error.message.includes('does not exist')) {
            return res.json({
                total_lead_status_quotes: 0,
                total_booked_opportunities_quotes: 0,
                pending_invoiced_amount: 0,
                ready_for_calculation: 0
            });
        }
        
        res.status(500).json({
            error: "Failed to get adjustment status",
            details: error.message
        });
    }
});

/**
 * GET /api/sales-commissions/unmatched-names
 * Get names from lead status that don't match any employee nickname.
 * Useful for identifying data quality issues.
 * 
 * Query: ?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
 */
r.get("/unmatched-names", async (req, res) => {
    try {
        const { period_start, period_end } = req.query;
        
        if (!period_start || !period_end) {
            return res.status(400).json({
                error: "Missing required query parameters",
                details: "period_start and period_end are required"
            });
        }
        
        const unmatched = await getUnmatchedNamesReport(period_start, period_end);
        
        res.json(unmatched);
        
    } catch (error) {
        console.error("❌ [SALES-COMM] Failed to get unmatched names:", error);
        
        // If tables don't exist yet, return empty lists
        if (error.message.includes('does not exist')) {
            return res.json({
                original_agents: [],
                targets: []
            });
        }
        
        res.status(500).json({
            error: "Failed to get unmatched names",
            details: error.message
        });
    }
});

export default r;
