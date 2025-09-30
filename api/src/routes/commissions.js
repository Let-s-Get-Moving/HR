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

// Debug endpoint to test header detection
r.post("/debug-headers", upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const { loadExcelWorkbook, getWorksheetData, detectAllBlocks } = await import('../utils/excelParser.js');
    
    // Load workbook
    const workbook = loadExcelWorkbook(req.file.buffer);
    console.log('Sheet names:', workbook.SheetNames);
    
    // Get worksheet data  
    const sheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
    const data = getWorksheetData(workbook, sheetName);
    
    console.log('Total rows:', data.length);
    console.log('First 10 rows:');
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
    
    // Test block detection
    const blocks = detectAllBlocks(data);
    
    res.json({
      success: true,
      sheetName,
      totalRows: data.length,
      firstRows: data.slice(0, 10),
      detectedBlocks: {
        main: blocks.main ? {
          type: blocks.main.type,
          headerRow: blocks.main.headerRow,
          startRow: blocks.main.startRow,
          endRow: blocks.main.endRow,
          columns: Object.keys(blocks.main.columns || {})
        } : null,
        agents_us: blocks.agents_us ? {
          type: blocks.agents_us.type,
          headerRow: blocks.agents_us.headerRow
        } : null,
        hourly: blocks.hourly ? {
          type: blocks.hourly.type,
          headerRow: blocks.hourly.headerRow
        } : null
      },
      mainBlockFound: !!blocks.main,
      agentBlockFound: !!blocks.agents_us, 
      hourlyBlockFound: !!blocks.hourly
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Excel import endpoint
r.post("/import", upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const { sheet_name, period_month } = req.body;
    
    console.log(`Starting commission import for file: ${req.file.originalname}`);
    if (period_month) {
      console.log(`Using manual period override: ${period_month}`);
    }
    
    const summary = await importCommissionsFromExcel(
      req.file.buffer, 
      req.file.originalname,
      sheet_name,
      period_month // Pass optional manual period
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
// Returns data with dynamic date periods as JSON
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
      ORDER BY hp.period_month DESC, e.first_name, e.last_name
    `, params);
    
    const formattedRows = rows.map(row => ({
      ...row,
      total_for_month: formatCurrency(row.total_for_month),
      // date_periods is already JSON from DB
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

// Get available periods
r.get("/periods", async (req, res) => {
  try {
    const result = await q(`
      SELECT DISTINCT period_month, 
             TO_CHAR(period_month::date, 'Month YYYY') as period_label,
             COUNT(*) as employee_count
      FROM employee_commission_monthly 
      GROUP BY period_month
      ORDER BY period_month DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching periods:", error);
    if (error.message.includes('does not exist')) {
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch periods" });
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
