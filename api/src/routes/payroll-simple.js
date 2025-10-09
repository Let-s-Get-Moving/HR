import express from "express";
import { q } from "../db.js";

const r = express.Router();

/**
 * Calculate payroll on-the-fly from timecards and employee data
 * No need for complex triggers - just show the data!
 */
r.get("/calculate-live", async (req, res) => {
  try {
    const { pay_period_start, pay_period_end } = req.query;
    
    // Get all employees with their rates
    const { rows: payrolls } = await q(`
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        d.name as department,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        
        -- Get timecard hours for this period (if dates provided)
        CASE 
          WHEN $1::date IS NOT NULL AND $2::date IS NOT NULL THEN
            COALESCE((
              SELECT SUM(total_hours)
              FROM timecards t
              WHERE t.employee_id = e.id
                AND t.status = 'Approved'
                AND t.pay_period_start >= $1::date
                AND t.pay_period_end <= $2::date
            ), 0)
          ELSE
            COALESCE((
              SELECT SUM(total_hours)
              FROM timecards t
              WHERE t.employee_id = e.id
                AND t.status = 'Approved'
            ), 0)
        END as total_hours,
        
        -- Get overtime hours
        CASE 
          WHEN $1::date IS NOT NULL AND $2::date IS NOT NULL THEN
            COALESCE((
              SELECT SUM(overtime_hours)
              FROM timecards t
              WHERE t.employee_id = e.id
                AND t.status = 'Approved'
                AND t.pay_period_start >= $1::date
                AND t.pay_period_end <= $2::date
            ), 0)
          ELSE
            COALESCE((
              SELECT SUM(overtime_hours)
              FROM timecards t
              WHERE t.employee_id = e.id
                AND t.status = 'Approved'
            ), 0)
        END as overtime_hours,
        
        -- Get pay period dates from timecards
        CASE 
          WHEN $1::date IS NOT NULL THEN $1::date
          ELSE (
            SELECT MIN(pay_period_start)
            FROM timecards t
            WHERE t.employee_id = e.id AND t.status = 'Approved'
          )
        END as pay_period_start,
        
        CASE 
          WHEN $2::date IS NOT NULL THEN $2::date
          ELSE (
            SELECT MAX(pay_period_end)
            FROM timecards t
            WHERE t.employee_id = e.id AND t.status = 'Approved'
          )
        END as pay_period_end
        
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'Active'
      ORDER BY e.last_name, e.first_name
    `, [pay_period_start || null, pay_period_end || null]);
    
    // Calculate pay for each employee
    const results = payrolls.map(emp => {
      const totalHours = parseFloat(emp.total_hours || 0);
      const overtimeHours = parseFloat(emp.overtime_hours || 0);
      const regularHours = totalHours - overtimeHours;
      const hourlyRate = parseFloat(emp.hourly_rate || 0);
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const grossPay = regularPay + overtimePay;
      
      // 4% vacation
      const vacationHours = totalHours * 0.04;
      const vacationPay = grossPay * 0.04;
      
      const netPay = grossPay; // No deductions for now
      
      return {
        ...emp,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        total_hours: totalHours,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        gross_pay: grossPay,
        vacation_hours_accrued: vacationHours,
        vacation_pay_accrued: vacationPay,
        deductions: 0,
        net_pay: netPay,
        pay_date: emp.pay_period_end ? new Date(emp.pay_period_end).toISOString().split('T')[0] : null
      };
    }).filter(p => p.total_hours > 0); // Only show employees with hours
    
    res.json(results);
  } catch (error) {
    console.error("Error calculating live payroll:", error);
    res.status(500).json({ error: "Failed to calculate payroll: " + error.message });
  }
});

/**
 * Get all unique pay periods from approved timecards
 */
r.get("/periods", async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT DISTINCT
        pay_period_start,
        pay_period_end,
        pay_period_end + INTERVAL '1 day' as pay_date,
        COUNT(DISTINCT employee_id) as employee_count
      FROM timecards
      WHERE status = 'Approved'
      GROUP BY pay_period_start, pay_period_end
      ORDER BY pay_period_start DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pay periods:", error);
    res.status(500).json({ error: "Failed to fetch pay periods" });
  }
});

export default r;

