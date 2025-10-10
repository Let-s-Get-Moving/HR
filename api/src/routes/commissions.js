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

// Import file validation utilities
import { validateFileContent } from '../utils/fileValidation.js';

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

// Excel import endpoint with comprehensive file validation
r.post("/import", upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    console.log(`🔍 [COMMISSIONS] Starting file validation for: ${req.file.originalname}`);
    
    // 1. COMPREHENSIVE FILE CONTENT VALIDATION
    const fileValidation = await validateFileContent(req.file, 'excel');
    if (!fileValidation.valid) {
      console.log(`❌ [COMMISSIONS] File validation failed:`, fileValidation);
      return res.status(400).json({
        error: "File validation failed",
        details: fileValidation.message,
        validationDetails: fileValidation.details
      });
    }
    
    console.log(`✅ [COMMISSIONS] File validation passed:`, fileValidation.details);

    const { sheet_name, period_month } = req.body;
    
    console.log(`📊 [COMMISSIONS] Starting commission import for validated file: ${req.file.originalname}`);
    if (period_month) {
      console.log(`📅 [COMMISSIONS] Using manual period override: ${period_month}`);
    }
    
    const summary = await importCommissionsFromExcel(
      req.file.buffer, 
      req.file.originalname,
      sheet_name,
      period_month // Pass optional manual period
    );
    
    console.log(`✅ [COMMISSIONS] Commission import completed:`, summary);
    
    res.json({
      message: "Commission import completed successfully",
      summary: summary,
      fileValidation: {
        validated: true,
        fileSize: req.file.size,
        fileType: fileValidation.details?.type || 'excel'
      }
    });
    
  } catch (error) {
    console.error("❌ [COMMISSIONS] Commission import failed:", error);
    res.status(500).json({ 
      error: "Commission import failed", 
      details: error.message 
    });
  }
});

// Get monthly commission data
r.get("/monthly", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📊 [COMMISSIONS] GET /monthly - Request received');
    console.log('📊 [COMMISSIONS] Query params:', req.query);
    
    const { period_month, employee_id } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    if (period_month) {
      params.push(period_month);
      whereClause += ` AND ecm.period_month = $${params.length}`;
      console.log('📊 [COMMISSIONS] Filter by period_month:', period_month);
    }
    
    if (employee_id) {
      params.push(employee_id);
      whereClause += ` AND ecm.employee_id = $${params.length}`;
      console.log('📊 [COMMISSIONS] Filter by employee_id:', employee_id);
    }
    
    const { rows } = await q(`
      SELECT 
        ecm.*,
        COALESCE(e.first_name || ' ' || e.last_name, ecm.name_raw) as employee_name,
        e.role_title
      FROM employee_commission_monthly ecm
      LEFT JOIN employees e ON ecm.employee_id = e.id
      ${whereClause}
      ORDER BY ecm.period_month DESC, COALESCE(e.first_name, ecm.name_raw), e.last_name
    `, params);
    
    console.log(`📊 [COMMISSIONS] Found ${rows.length} monthly commission records`);
    
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
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [COMMISSIONS] GET /monthly completed in ${elapsed}ms`);
    
    res.json(formattedRows);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ [COMMISSIONS] GET /monthly failed after ${elapsed}ms:`, error);
    console.error('❌ [COMMISSIONS] Error stack:', error.stack);
    
    // If tables don't exist yet, return empty array
    if (error.message.includes('does not exist')) {
      console.log('⚠️  [COMMISSIONS] Table does not exist, returning empty array');
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch monthly commissions", details: error.message });
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
        COALESCE(e.first_name || ' ' || e.last_name, acu.name_raw) as employee_name,
        e.role_title
      FROM agent_commission_us acu
      LEFT JOIN employees e ON acu.employee_id = e.id
      ${whereClause}
      ORDER BY acu.period_month DESC, COALESCE(e.first_name, acu.name_raw), e.last_name
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
  const startTime = Date.now();
  try {
    const { period_month, employee_id } = req.query;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`💰 [Hourly Payouts GET] Request received at ${new Date().toISOString()}`);
    console.log(`💰 [Hourly Payouts GET] Filters:`, { period_month, employee_id });
    
    // DIAGNOSTICS: Check table state first
    console.log('🔍 [Hourly Payouts GET] Running diagnostics...');
    const diagnosticStart = Date.now();
    
    const [totalCheck, periodCheck, linkCheck] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM hourly_payout`),
      q(`SELECT DISTINCT period_month FROM hourly_payout ORDER BY period_month DESC`),
      q(`SELECT 
          COUNT(*) as total_records,
          COUNT(employee_id) as with_employee_link,
          COUNT(*) - COUNT(employee_id) as without_employee_link
        FROM hourly_payout`)
    ]);
    
    const diagTime = Date.now() - diagnosticStart;
    console.log(`🔍 [Hourly Payouts GET] Diagnostics completed in ${diagTime}ms:`);
    console.log(`   - Total records in hourly_payout table: ${totalCheck.rows[0].count}`);
    console.log(`   - Records with employee link: ${linkCheck.rows[0].with_employee_link}`);
    console.log(`   - Records without employee link: ${linkCheck.rows[0].without_employee_link}`);
    console.log(`   - Available periods:`, periodCheck.rows.map(r => r.period_month));
    
    if (totalCheck.rows[0].count === '0') {
      console.error('⚠️ [Hourly Payouts GET] TABLE IS EMPTY! Need to re-upload commission spreadsheet.');
    }
    
    let whereClause = "WHERE 1=1";
    const params = [];
    
    if (period_month) {
      params.push(period_month);
      whereClause += ` AND hp.period_month = $${params.length}`;
      console.log(`💰 [Hourly Payouts GET] Added period filter: ${period_month}`);
    }
    
    if (employee_id) {
      params.push(employee_id);
      whereClause += ` AND hp.employee_id = $${params.length}`;
      console.log(`💰 [Hourly Payouts GET] Added employee filter: ${employee_id}`);
    }
    
    console.log(`💰 [Hourly Payouts GET] Query params:`, params);
    
    // Query the table
    const queryStart = Date.now();
    const { rows } = await q(`
      SELECT 
        hp.id,
        hp.employee_id,
        hp.period_month,
        hp.name_raw,
        hp.date_periods,
        hp.total_for_month,
        hp.source_file,
        hp.sheet_name,
        hp.created_at,
        COALESCE(e.first_name || ' ' || e.last_name, hp.name_raw) as employee_name,
        e.role_title
      FROM hourly_payout hp
      LEFT JOIN employees e ON hp.employee_id = e.id
      ${whereClause}
      ORDER BY hp.period_month DESC, COALESCE(e.first_name, hp.name_raw), e.last_name
    `, params);
    
    const queryTime = Date.now() - queryStart;
    console.log(`💰 [Hourly Payouts GET] ✅ Query executed in ${queryTime}ms`);
    console.log(`💰 [Hourly Payouts GET] ✅ Found ${rows.length} records`);
    
    if (rows.length > 0) {
      console.log(`💰 [Hourly Payouts GET] Sample records:`);
      rows.slice(0, 3).forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.employee_name || row.name_raw}`);
        console.log(`      - Period: ${row.period_month}`);
        console.log(`      - Total: $${row.total_for_month}`);
        console.log(`      - Date periods: ${Array.isArray(row.date_periods) ? row.date_periods.length : 'N/A'} entries`);
      });
    } else {
      console.error(`⚠️ [Hourly Payouts GET] NO RECORDS FOUND!`);
      if (period_month) {
        console.error(`   - Requested period: ${period_month}`);
        console.error(`   - Available periods:`, periodCheck.rows.map(r => r.period_month));
      }
    }
    
    // Format the data
    const formattedRows = rows.map(row => {
      const formatted = {
        id: row.id,
        employee_id: row.employee_id,
        period_month: row.period_month,
        name_raw: row.name_raw || row.employee_name,
        employee_name: row.employee_name,
        role_title: row.role_title,
        date_periods: row.date_periods || [],
        total_for_month: parseFloat(row.total_for_month) || 0,
        source_file: row.source_file,
        sheet_name: row.sheet_name,
        created_at: row.created_at
      };
      
      return formatted;
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`💰 [Hourly Payouts GET] ✅ Returning ${formattedRows.length} formatted records`);
    console.log(`💰 [Hourly Payouts GET] ✅ Total request time: ${totalTime}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');
    res.json(formattedRows);
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`❌ [Hourly Payouts GET] ERROR after ${totalTime}ms:`, error.message);
    console.error(`❌ [Hourly Payouts GET] Stack:`, error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    
    if (error.message.includes('does not exist')) {
      console.log("💰 [Hourly Payouts GET] Table doesn't exist, returning empty array");
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch hourly payouts", details: error.message });
    }
  }
});

// Get available periods
r.get("/periods", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📊 [COMMISSIONS] GET /periods - Request received');
    
    const result = await q(`
      SELECT DISTINCT 
             period_start,
             period_end,
             payday_1,
             payday_2,
             period_month,
             CASE WHEN period_start IS NOT NULL THEN TO_CHAR(period_start, 'Mon DD') ELSE NULL END as period_start_label,
             CASE WHEN period_end IS NOT NULL THEN TO_CHAR(period_end, 'Mon DD') ELSE NULL END as period_end_label,
             CASE WHEN payday_1 IS NOT NULL THEN TO_CHAR(payday_1, 'Mon DD, YYYY') ELSE NULL END as payday_1_label,
             CASE WHEN payday_2 IS NOT NULL THEN TO_CHAR(payday_2, 'Mon DD, YYYY') ELSE NULL END as payday_2_label,
             COUNT(*) as employee_count
      FROM employee_commission_monthly
      GROUP BY period_start, period_end, payday_1, payday_2, period_month
      ORDER BY COALESCE(period_start, period_month) DESC
    `);
    
    console.log(`📊 [COMMISSIONS] Found ${result.rows.length} periods`);
    console.log('📊 [COMMISSIONS] Periods:', JSON.stringify(result.rows, null, 2));
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [COMMISSIONS] GET /periods completed in ${elapsed}ms`);
    
    res.json(result.rows);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ [COMMISSIONS] GET /periods failed after ${elapsed}ms`);
    console.error('❌ [COMMISSIONS] Error:', error);
    console.error('❌ [COMMISSIONS] Error message:', error.message);
    console.error('❌ [COMMISSIONS] Error stack:', error.stack);
    
    if (error.message.includes('does not exist')) {
      console.log('⚠️  [COMMISSIONS] Table does not exist, returning empty array');
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to fetch periods", details: error.message });
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
        SUM(ecm.total_due) as total_due,
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
      total_due: formatCurrency(summary.total_due),
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
