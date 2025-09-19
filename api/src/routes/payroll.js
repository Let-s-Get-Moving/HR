import express from "express";
import { z } from "zod";
import { q } from "../db.js";
import { formatCurrency, formatHours } from "../utils/formatting.js";

const r = express.Router();

// Test endpoint to verify API is working
r.get("/test", async (req, res) => {
  try {
    res.json({ 
      message: "Payroll API is working", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all payroll periods
r.get("/periods", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT * FROM payroll_periods ORDER BY start_date DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching payroll periods:", error);
    res.status(500).json({ error: "Failed to fetch payroll periods" });
  }
});

// Get all payroll submissions
r.get("/submissions", async (req, res) => {
  try {
    // First check if payroll_submissions table exists
    const tableCheck = await q(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payroll_submissions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📊 Creating payroll_submissions table...');
      
      // Create payroll_submissions table
      await q(`
        CREATE TABLE IF NOT EXISTS payroll_submissions (
            id SERIAL PRIMARY KEY,
            submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            period_name VARCHAR(255),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'Processed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ payroll_submissions table created');
    }
    
    const { rows } = await q(`
      SELECT 
        ps.*,
        COUNT(pc.id) as employee_count,
        COALESCE(SUM(pc.gross_pay), 0) as total_amount
      FROM payroll_submissions ps
      LEFT JOIN payroll_calculations pc ON ps.id = pc.submission_id
      GROUP BY ps.id
      ORDER BY ps.submission_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching payroll submissions:", error);
    res.status(500).json({ error: "Failed to fetch payroll submissions" });
  }
});

// Create a new payroll submission
r.post("/submissions", async (req, res) => {
  try {
    const { period_name, notes, submission_date } = req.body;
    
    const { rows } = await q(`
      INSERT INTO payroll_submissions (period_name, notes, submission_date, status)
      VALUES ($1, $2, $3, 'Processed')
      RETURNING *
    `, [period_name, notes, submission_date || new Date().toISOString()]);
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error creating payroll submission:", error);
    res.status(500).json({ error: "Failed to create payroll submission" });
  }
});

// Get payroll calculations for a specific submission
r.get("/submissions/:id/calculations", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await q(`
      SELECT 
        pc.*,
        e.first_name, 
        e.last_name, 
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        d.name as department
      FROM payroll_calculations pc
      JOIN employees e ON pc.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE pc.submission_id = $1
      ORDER BY e.last_name, e.first_name
    `, [id]);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching submission calculations:", error);
    res.status(500).json({ error: "Failed to fetch submission calculations" });
  }
});

// Get payroll calculations (handles both general and specific period)
r.get("/calculations", async (req, res) => {
  const { periodId } = req.query;
  
  try {
    let query = `
      SELECT 
        pc.*,
        e.first_name, 
        e.last_name, 
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        d.name as department,
        pp.period_name,
        pp.start_date as period_start,
        pp.end_date as period_end
      FROM payroll_calculations pc
      JOIN employees e ON pc.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_periods pp ON pc.period_id = pp.id
    `;
    
    const params = [];
    
    if (periodId) {
      query += ` WHERE pc.period_id = $1`;
      params.push(periodId);
    }
    
    query += ` ORDER BY pp.start_date DESC, e.last_name, e.first_name`;
    
    const { rows } = await q(query, params);
    
    // Ensure numeric fields are properly converted
    const processedRows = rows.map(row => ({
      ...row,
      base_hours: formatHours(row.base_hours),
      overtime_hours: formatHours(row.overtime_hours),
      regular_rate: formatCurrency(row.regular_rate),
      commission_amount: formatCurrency(row.commission_amount),
      bonus_amount: formatCurrency(row.bonus_amount),
      deductions: formatCurrency(row.deductions),
      regular_pay: formatCurrency(row.regular_pay),
      overtime_pay: formatCurrency(row.overtime_pay),
      total_pay: formatCurrency(row.total_pay),
      net_pay: formatCurrency(row.net_pay)
    }));
    
    res.json(processedRows);
  } catch (error) {
    console.error("Error fetching payroll calculations:", error);
    res.status(500).json({ error: "Failed to fetch payroll calculations" });
  }
});

// Get payroll calculations for specific period (by period ID in URL)
r.get("/calculations/:periodId", async (req, res) => {
  const { periodId } = req.params;
  
  try {
    // First check if the period exists
    const periodCheck = await q(`SELECT id FROM payroll_periods WHERE id = $1`, [periodId]);
    if (periodCheck.rows.length === 0) {
      return res.status(404).json({ error: "Payroll period not found" });
    }

    const query = `
      SELECT 
        pc.*,
        e.first_name, 
        e.last_name, 
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        d.name as department,
        pp.period_name,
        pp.start_date as period_start,
        pp.end_date as period_end
      FROM payroll_calculations pc
      JOIN employees e ON pc.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_periods pp ON pc.period_id = pp.id
      WHERE pc.period_id = $1
      ORDER BY e.last_name, e.first_name
    `;
    
    const { rows } = await q(query, [periodId]);
    
    // If no calculations exist, return empty array instead of error
    if (rows.length === 0) {
      return res.json([]);
    }
    
    // Ensure numeric fields are properly converted
    const processedRows = rows.map(row => ({
      ...row,
      base_hours: formatHours(row.base_hours),
      overtime_hours: formatHours(row.overtime_hours),
      regular_rate: formatCurrency(row.regular_rate),
      commission_amount: formatCurrency(row.commission_amount),
      bonus_amount: formatCurrency(row.bonus_amount),
      deductions: formatCurrency(row.deductions),
      regular_pay: formatCurrency(row.regular_pay),
      overtime_pay: formatCurrency(row.overtime_pay),
      total_pay: formatCurrency(row.total_pay),
      net_pay: formatCurrency(row.net_pay)
    }));
    
    res.json(processedRows);
  } catch (error) {
    console.error("Error fetching payroll calculations for period:", error);
    // Check if it's a database connection issue
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      res.status(500).json({ error: "Database connection failed" });
    } else if (error.code === '42P01') {
      res.status(500).json({ error: "Database table not found" });
    } else {
      res.status(500).json({ error: "Failed to fetch payroll calculations for period" });
    }
  }
});

// Create new payroll period
r.post("/periods", async (req, res) => {
  const schema = z.object({
    period_name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    pay_date: z.string(),
    status: z.enum(["Open", "Processing", "Closed"]).default("Open")
  });

  try {
    const data = schema.parse(req.body);
    const { rows } = await q(
      `INSERT INTO payroll_periods (period_name, start_date, end_date, pay_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.period_name, data.start_date, data.end_date, data.pay_date, data.status]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating payroll period:", error);
    res.status(500).json({ error: "Failed to create payroll period" });
  }
});

// Calculate payroll for a period
r.post("/calculate/:periodId", async (req, res) => {
  const { periodId } = req.params;
  
  try {
    // Get period details
    const periodResult = await q(
      `SELECT * FROM payroll_periods WHERE id = $1`,
      [periodId]
    );
    
    if (periodResult.rows.length === 0) {
      return res.status(404).json({ error: "Payroll period not found" });
    }
    
    const period = periodResult.rows[0];
    
    // Get all active employees
    const employeesResult = await q(
      `SELECT e.*, d.name as department
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.status = 'Active'`
    );
    
    console.log(`Starting payroll calculation for period ${periodId} (${period.period_name})`);
    console.log(`Period dates: ${period.start_date} to ${period.end_date}`);
    console.log(`Found ${employeesResult.rows.length} active employees`);
    
    // Calculate payroll for each employee
    for (const employee of employeesResult.rows) {
      try {
        console.log(`Processing employee ${employee.id}: ${employee.first_name} ${employee.last_name}`);
        
        // Get time entries for the period
        const timeEntriesResult = await q(
          `SELECT 
             COALESCE(SUM(CAST(hours_worked AS NUMERIC)), 0) as total_hours,
             COALESCE(SUM(CAST(overtime_hours AS NUMERIC)), 0) as total_overtime
           FROM time_entries 
           WHERE employee_id = $1 
           AND work_date BETWEEN $2 AND $3`,
          [employee.id, period.start_date, period.end_date]
        );
        
        const timeData = timeEntriesResult.rows[0];
        const totalHours = parseFloat(timeData.total_hours) || 0;
        const totalOvertime = parseFloat(timeData.total_overtime) || 0;
        
        const baseHours = Math.min(totalHours, 40); // Regular hours capped at 40
        const overtimeHours = Math.max(0, totalHours - 40) + totalOvertime;
        const hourlyRate = parseFloat(employee.hourly_rate) || 0;
        
        console.log(`  Time data: ${totalHours} total hours, ${totalOvertime} overtime hours`);
        console.log(`  Calculated: ${baseHours} base hours, ${overtimeHours} overtime hours, $${hourlyRate}/hr`);
        
        // Calculate commission (simplified)
        const commissionAmount = 0; // TODO: Implement commission calculation
        
        // Calculate bonus (simplified)
        const bonusAmount = 0; // TODO: Implement bonus calculation
        
        // Calculate deductions (simplified)
        const deductions = 0; // TODO: Implement deductions
        
        // Insert or update payroll calculation
        await q(
          `INSERT INTO payroll_calculations 
           (employee_id, period_id, base_hours, overtime_hours, regular_rate, 
            commission_amount, bonus_amount, deductions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (employee_id, period_id) 
           DO UPDATE SET 
             base_hours = EXCLUDED.base_hours,
             overtime_hours = EXCLUDED.overtime_hours,
             regular_rate = EXCLUDED.regular_rate,
             commission_amount = EXCLUDED.commission_amount,
             bonus_amount = EXCLUDED.bonus_amount,
             deductions = EXCLUDED.deductions,
             calculated_at = CURRENT_TIMESTAMP`,
          [employee.id, periodId, baseHours, overtimeHours, hourlyRate, 
           commissionAmount, bonusAmount, deductions]
        );
        
        console.log(`  ✅ Payroll calculation saved for employee ${employee.id}`);
        
      } catch (employeeError) {
        console.error(`❌ Error processing employee ${employee.id}:`, employeeError);
        throw employeeError; // Re-throw to stop the whole process
      }
    }
    
    console.log(`✅ Payroll calculation completed for ${employeesResult.rows.length} employees`);
    
    res.json({ message: "Payroll calculated successfully" });
  } catch (error) {
    console.error("Error calculating payroll:", error);
    res.status(500).json({ error: "Failed to calculate payroll" });
  }
});

// Import timesheet CSV
r.post("/import-timesheet", async (req, res) => {
  try {
    // This is a simplified implementation
    // In a real application, you would parse the CSV file
    // and insert the data into time_entries table
    
    const { period_id } = req.body;
    
    // Create import record
    const { rows } = await q(
      `INSERT INTO timesheet_imports (file_name, period_id, total_records, successful_imports, import_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      ["timesheet.csv", period_id, 0, 0, "Completed"]
    );
    
    res.json({
      message: "Timesheet import completed",
      import_id: rows[0].id,
      successful_imports: 0,
      failed_imports: 0
    });
  } catch (error) {
    console.error("Error importing timesheet:", error);
    res.status(500).json({ error: "Failed to import timesheet" });
  }
});

// Export payroll reports
r.post("/export/:periodId", async (req, res) => {
  const { periodId } = req.params;
  const { export_type } = req.body;
  
  try {
    let query = "";
    let filename = "";
    
    switch (export_type) {
      case "Summary":
        query = `
          SELECT 
            pp.period_name,
            COUNT(pc.id) as total_employees,
            SUM(pc.total_gross) as total_gross_pay,
            SUM(pc.commission_amount) as total_commissions,
            SUM(pc.bonus_amount) as total_bonuses,
            SUM(pc.deductions) as total_deductions,
            SUM(pc.net_pay) as total_net_pay
          FROM payroll_periods pp
          LEFT JOIN payroll_calculations pc ON pp.id = pc.period_id
          WHERE pp.id = $1
          GROUP BY pp.id, pp.period_name
        `;
        filename = `payroll_summary_${periodId}.csv`;
        break;
        
      case "Detailed":
        query = `
          SELECT 
            e.first_name,
            e.last_name,
            d.name as department,
            pc.base_hours,
            pc.overtime_hours,
            pc.regular_pay,
            pc.overtime_pay,
            pc.commission_amount,
            pc.bonus_amount,
            pc.total_gross,
            pc.deductions,
            pc.net_pay
          FROM payroll_calculations pc
          JOIN employees e ON pc.employee_id = e.id
          LEFT JOIN departments d ON e.department_id = d.id
          WHERE pc.period_id = $1
          ORDER BY e.last_name, e.first_name
        `;
        filename = `payroll_detailed_${periodId}.csv`;
        break;
        
      case "Bank_Transfer":
        query = `
          SELECT 
            e.first_name,
            e.last_name,
            pc.net_pay,
            'Direct Deposit' as payment_method
          FROM payroll_calculations pc
          JOIN employees e ON pc.employee_id = e.id
          WHERE pc.period_id = $1
          ORDER BY e.last_name, e.first_name
        `;
        filename = `bank_transfer_${periodId}.csv`;
        break;
        
      case "Tax_Report":
        query = `
          SELECT 
            e.first_name,
            e.last_name,
            pc.total_gross,
            pc.deductions,
            pc.net_pay,
            pp.start_date,
            pp.end_date
          FROM payroll_calculations pc
          JOIN employees e ON pc.employee_id = e.id
          JOIN payroll_periods pp ON pc.period_id = pp.id
          WHERE pc.period_id = $1
          ORDER BY e.last_name, e.first_name
        `;
        filename = `tax_report_${periodId}.csv`;
        break;
        
      default:
        return res.status(400).json({ error: "Invalid export type" });
    }
    
    const { rows } = await q(query, [periodId]);
    
    // Convert to CSV format
    const csvData = rows.length > 0 ? 
      Object.keys(rows[0]).join(',') + '\n' +
      rows.map(row => Object.values(row).join(',')).join('\n') :
      'No data available';
    
    // Create export record
    await q(
      `INSERT INTO payroll_exports (period_id, export_type, file_name, exported_by)
       VALUES ($1, $2, $3, $4)`,
      [periodId, export_type, filename, 'system']
    );
    
    res.json({
      message: "Export completed successfully",
      filename,
      data: csvData,
      record_count: rows.length
    });
  } catch (error) {
    console.error("Error exporting payroll:", error);
    res.status(500).json({ error: "Failed to export payroll" });
  }
});

// Get commission structures
r.get("/commission-structures", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT cs.*, d.name as department_name
       FROM commission_structures cs
       JOIN departments d ON cs.department_id = d.id
       WHERE cs.is_active = true
       ORDER BY d.name, cs.structure_name`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching commission structures:", error);
    res.status(500).json({ error: "Failed to fetch commission structures" });
  }
});

// Get bonus structures
r.get("/bonus-structures", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT bs.*, d.name as department_name
       FROM bonus_structures bs
       JOIN departments d ON bs.department_id = d.id
       WHERE bs.is_active = true
       ORDER BY d.name, bs.bonus_name`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching bonus structures:", error);
    res.status(500).json({ error: "Failed to fetch bonus structures" });
  }
});

// Get performance metrics
r.get("/performance-metrics", async (req, res) => {
  const { employee_id, period_id } = req.query;
  
  try {
    let query = `
      SELECT pm.*, e.first_name, e.last_name, d.name as department
      FROM performance_metrics pm
      JOIN employees e ON pm.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    if (employee_id) {
      query += ` AND pm.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }
    
    if (period_id) {
      query += ` AND pm.period_id = $${params.length + 1}`;
      params.push(period_id);
    }
    
    query += ` ORDER BY pm.recorded_date DESC`;
    
    const { rows } = await q(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

export default r;
