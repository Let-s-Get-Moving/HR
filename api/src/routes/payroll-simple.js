import express from "express";
import { q } from "../db.js";

const r = express.Router();

/**
 * Calculate next pay period based on Friday payday schedule
 * - Week runs Saturday to Friday (Friday is end of week)
 * - Payday is Friday of week 3
 * - Covers weeks 1 & 2 (14 days, Saturday to Friday)
 * - Base: Sep 26, 2025 payday covered Sep 8-19
 */
function getPayPeriod(basePayday = '2025-09-26') {
  const base = new Date(basePayday);
  const today = new Date();
  
  // Find how many weeks have passed since base payday
  const daysSinceBase = Math.floor((today - base) / (1000 * 60 * 60 * 24));
  const weeksSinceBase = Math.floor(daysSinceBase / 7);
  
  // Calculate next payday (always a Friday)
  const nextPayday = new Date(base);
  nextPayday.setDate(base.getDate() + (weeksSinceBase + 1) * 7);
  
  // Pay period ends 2 weeks before payday (Friday before payday - 14 days)
  const periodEnd = new Date(nextPayday);
  periodEnd.setDate(nextPayday.getDate() - 8); // Friday of week 2
  
  // Pay period starts 14 days before period end (Saturday)
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 13); // Saturday of week 1
  
  return {
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    pay_date: nextPayday.toISOString().split('T')[0]
  };
}

/**
 * Calculate payroll on-the-fly from timecards and employee data
 * Sums ALL timecard entries where work_date falls in the pay period
 */
r.get("/calculate-live", async (req, res) => {
  try {
    let { pay_period_start, pay_period_end } = req.query;
    
    // If no dates provided, use next pay period
    if (!pay_period_start || !pay_period_end) {
      const period = getPayPeriod();
      pay_period_start = period.period_start;
      pay_period_end = period.period_end;
    }
    
    // Get all employees with their timecard data for the period
    const { rows: payrolls } = await q(`
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        d.name as department,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        
        -- Sum ALL timecard entries where work_date is in the period
        COALESCE((
          SELECT SUM(te.hours_worked)
          FROM timecard_entries te
          JOIN timecards t ON te.timecard_id = t.id
          WHERE t.employee_id = e.id
            AND te.work_date >= $1::date
            AND te.work_date <= $2::date
            AND t.status = 'Approved'
        ), 0) as total_hours,
        
        -- Calculate overtime (hours over 8 per day)
        COALESCE((
          SELECT SUM(GREATEST(daily_total - 8, 0))
          FROM (
            SELECT 
              te.work_date,
              SUM(te.hours_worked) as daily_total
            FROM timecard_entries te
            JOIN timecards t ON te.timecard_id = t.id
            WHERE t.employee_id = e.id
              AND te.work_date >= $1::date
              AND te.work_date <= $2::date
              AND t.status = 'Approved'
            GROUP BY te.work_date
          ) daily_hours
        ), 0) as overtime_hours,
        
        $1::date as pay_period_start,
        $2::date as pay_period_end
        
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'Active'
      ORDER BY e.last_name, e.first_name
    `, [pay_period_start, pay_period_end]);
    
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
      
      // Calculate pay date (Friday after period end)
      const periodEnd = new Date(emp.pay_period_end);
      const payDate = new Date(periodEnd);
      payDate.setDate(periodEnd.getDate() + 7); // Next Friday
      
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
        pay_date: payDate.toISOString().split('T')[0]
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
 * Groups by 2-week periods ending on Friday
 */
r.get("/periods", async (req, res) => {
  try {
    // Get all approved timecard dates
    const { rows: dates } = await q(`
      SELECT DISTINCT work_date
      FROM timecard_entries te
      JOIN timecards t ON te.timecard_id = t.id
      WHERE t.status = 'Approved'
      ORDER BY work_date DESC
    `);
    
    // Group into 2-week pay periods (Saturday to Friday)
    const periods = [];
    const basePayday = new Date('2025-09-26');
    
    dates.forEach(row => {
      const workDate = new Date(row.work_date);
      
      // Find which pay period this date belongs to
      const daysSinceBase = Math.floor((workDate - basePayday) / (1000 * 60 * 60 * 24));
      const weeksSinceBase = Math.floor(daysSinceBase / 7);
      
      // Calculate the pay period for this date
      const payday = new Date(basePayday);
      payday.setDate(basePayday.getDate() + weeksSinceBase * 7);
      
      const periodEnd = new Date(payday);
      periodEnd.setDate(payday.getDate() - 8);
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 13);
      
      const key = `${periodStart.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}`;
      
      if (!periods.find(p => p.key === key)) {
        periods.push({
          key,
          pay_period_start: periodStart.toISOString().split('T')[0],
          pay_period_end: periodEnd.toISOString().split('T')[0],
          pay_date: payday.toISOString().split('T')[0]
        });
      }
    });
    
    // Get employee counts for each period
    const periodsWithCounts = await Promise.all(
      periods.map(async (period) => {
        const { rows } = await q(`
          SELECT COUNT(DISTINCT t.employee_id) as employee_count
          FROM timecard_entries te
          JOIN timecards t ON te.timecard_id = t.id
          WHERE t.status = 'Approved'
            AND te.work_date >= $1::date
            AND te.work_date <= $2::date
        `, [period.pay_period_start, period.pay_period_end]);
        
        return {
          ...period,
          employee_count: parseInt(rows[0].employee_count || 0)
        };
      })
    );
    
    res.json(periodsWithCounts.sort((a, b) => 
      new Date(b.pay_date) - new Date(a.pay_date)
    ));
  } catch (error) {
    console.error("Error fetching pay periods:", error);
    res.status(500).json({ error: "Failed to fetch pay periods" });
  }
});

/**
 * Get next pay period info
 */
r.get("/next-period", async (req, res) => {
  try {
    const period = getPayPeriod();
    res.json(period);
  } catch (error) {
    console.error("Error getting next pay period:", error);
    res.status(500).json({ error: "Failed to get next pay period" });
  }
});

export default r;

