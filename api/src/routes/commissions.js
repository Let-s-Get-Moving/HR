import { Router } from "express";
import multer from "multer";
import { q } from "../db.js";
import { z } from "zod";
import { formatCurrency, formatNumber } from "../utils/formatting.js";
import { importCommissionsFromExcel } from "../utils/commissionImporter.js";

const r = Router();

// Configure multer for file uploads (memory storage for Excel files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('sheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// Excel import endpoint
r.post("/import", upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const { sheet_name } = req.body;
    
    console.log(`Starting commission import for file: ${req.file.originalname}`);
    
    const summary = await importCommissionsFromExcel(
      req.file.buffer, 
      req.file.originalname,
      sheet_name
    );
    
    console.log(`Commission import completed:`, summary);
    
    res.json({
      message: "Commission import completed successfully",
      summary: summary
    });
    
  } catch (error) {
    console.error("Commission import failed:", error);
    res.status(500).json({ 
      error: "Commission import failed", 
      details: error.message 
    });
  }
});

// Get monthly commission data
r.get("/monthly", async (req, res) => {
  try {
    const { period_month, employee_id } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    if (period_month) {
      params.push(period_month);
      whereClause += ` AND ecm.period_month = $${params.length}`;
    }
    
    if (employee_id) {
      params.push(employee_id);
      whereClause += ` AND ecm.employee_id = $${params.length}`;
    }
    
    const { rows } = await q(`
      SELECT 
        ecm.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title
      FROM employee_commission_monthly ecm
      JOIN employees e ON ecm.employee_id = e.id
      ${whereClause}
      ORDER BY ecm.period_month DESC, e.first_name, e.last_name
    `, params);
    
    const formattedRows = rows.map(row => ({
      ...row,
      hourly_rate: formatCurrency(row.hourly_rate),
      rev_sm_all_locations: formatCurrency(row.rev_sm_all_locations),
      rev_add_ons: formatCurrency(row.rev_add_ons),
      rev_deduction: formatCurrency(row.rev_deduction),
      total_revenue_all: formatCurrency(row.total_revenue_all),
      booking_pct: formatNumber(row.booking_pct, 1),
      commission_pct: formatNumber(row.commission_pct, 1),
      commission_earned: formatCurrency(row.commission_earned),
      spiff_bonus: formatCurrency(row.spiff_bonus),
      revenue_bonus: formatCurrency(row.revenue_bonus),
      total_due: formatCurrency(row.total_due),
      amount_paid: formatCurrency(row.amount_paid),
      remaining_amount: formatCurrency(row.remaining_amount)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching monthly commissions:", error);
    // If tables don't exist yet, return empty array
    if (error.message.includes('does not exist')) {
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch monthly commissions" });
    }
  }
});

// Get agent US commission data
r.get("/agents-us", async (req, res) => {
  try {
    const { period_month, employee_id } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    if (period_month) {
      params.push(period_month);
      whereClause += ` AND acu.period_month = $${params.length}`;
    }
    
    if (employee_id) {
      params.push(employee_id);
      whereClause += ` AND acu.employee_id = $${params.length}`;
    }
    
    const { rows } = await q(`
      SELECT 
        acu.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title
      FROM agent_commission_us acu
      JOIN employees e ON acu.employee_id = e.id
      ${whereClause}
      ORDER BY acu.period_month DESC, e.first_name, e.last_name
    `, params);
    
    const formattedRows = rows.map(row => ({
      ...row,
      total_us_revenue: formatCurrency(row.total_us_revenue),
      commission_pct: formatNumber(row.commission_pct, 1),
      commission_earned: formatCurrency(row.commission_earned),
      commission_125x: formatCurrency(row.commission_125x),
      bonus: formatCurrency(row.bonus)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching agent US commissions:", error);
    if (error.message.includes('does not exist')) {
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch agent US commissions" });
    }
  }
});

// Get hourly payout data
r.get("/hourly-payouts", async (req, res) => {
  try {
    const { period_month, employee_id } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    if (period_month) {
      params.push(period_month);
      whereClause += ` AND hp.period_month = $${params.length}`;
    }
    
    if (employee_id) {
      params.push(employee_id);
      whereClause += ` AND hp.employee_id = $${params.length}`;
    }
    
    const { rows } = await q(`
      SELECT 
        hp.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.role_title
      FROM hourly_payout hp
      JOIN employees e ON hp.employee_id = e.id
      ${whereClause}
      ORDER BY hp.period_month DESC, e.first_name, e.last_name, hp.period_label
    `, params);
    
    const formattedRows = rows.map(row => ({
      ...row,
      amount: formatCurrency(row.amount),
      total_for_month: formatCurrency(row.total_for_month)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching hourly payouts:", error);
    if (error.message.includes('does not exist')) {
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch hourly payouts" });
    }
  }
});

// Get commission summary by period
r.get("/summary", async (req, res) => {
  try {
    const { period_month } = req.query;
    
    if (!period_month) {
      return res.status(400).json({ error: "period_month parameter is required" });
    }
    
    const { rows } = await q(`
      SELECT 
        COUNT(DISTINCT ecm.employee_id) as total_employees,
        SUM(ecm.commission_earned) as total_commission_earned,
        SUM(ecm.total_revenue_all) as total_revenue,
        SUM(ecm.amount_paid) as total_amount_paid,
        SUM(ecm.remaining_amount) as total_remaining,
        AVG(ecm.commission_pct) as avg_commission_rate
      FROM employee_commission_monthly ecm
      WHERE ecm.period_month = $1
    `, [period_month]);
    
    const summary = rows[0];
    
    res.json({
      period_month,
      total_employees: parseInt(summary.total_employees) || 0,
      total_commission_earned: formatCurrency(summary.total_commission_earned),
      total_revenue: formatCurrency(summary.total_revenue),
      total_amount_paid: formatCurrency(summary.total_amount_paid),
      total_remaining: formatCurrency(summary.total_remaining),
      avg_commission_rate: formatNumber(summary.avg_commission_rate, 2)
    });
  } catch (error) {
    console.error("Error fetching commission summary:", error);
    res.status(500).json({ error: "Failed to fetch commission summary" });
  }
});

export default r;
