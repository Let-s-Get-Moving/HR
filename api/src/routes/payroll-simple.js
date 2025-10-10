import express from "express";
import { q } from "../db.js";
import { applyScopeFilter } from "../middleware/rbac.js";

const r = express.Router();

// Apply scope filter to all payroll routes
r.use(applyScopeFilter);

/**
 * Calculate next pay period based on Friday payday schedule
 * - Pay periods: Saturday to Friday (14 days)
 * - Payday is Friday, 7 days after period ends
 * - Example: Sep 26 payday covers Sep 6-19 work period
 * - Base paydays: Sep 12, Sep 26, Oct 10, Oct 24...
 */
function getPayPeriod(basePayday = '2025-09-26') {
  // Use UTC to avoid timezone issues
  const base = new Date(basePayday + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Find how many 14-day periods have passed since base payday
  const daysSinceBase = Math.floor((today - base) / (1000 * 60 * 60 * 24));
  const periodsSinceBase = Math.floor(daysSinceBase / 14); // Paydays are every 14 days
  
  // Calculate next payday (always a Friday, every 2 weeks)
  const nextPayday = new Date(base);
  nextPayday.setUTCDate(base.getUTCDate() + (periodsSinceBase + 1) * 14);
  
  // Period ends 7 days before payday (Friday of Week 2)
  const periodEnd = new Date(nextPayday);
  periodEnd.setUTCDate(nextPayday.getUTCDate() - 7);
  
  // Period starts 13 days before period end (Saturday of Week 0/1)
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodEnd.getUTCDate() - 13);
  
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
  const startTime = Date.now();
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💰 [PAYROLL] Calculate Live - Request received');
    console.log('💰 [PAYROLL] Timestamp:', new Date().toISOString());
    
    let { pay_period_start, pay_period_end } = req.query;
    console.log('💰 [PAYROLL] Query params:', { pay_period_start, pay_period_end });
    
    // If no dates provided, use next pay period
    if (!pay_period_start || !pay_period_end) {
      const period = getPayPeriod();
      pay_period_start = period.period_start;
      pay_period_end = period.period_end;
      console.log('💰 [PAYROLL] No dates provided, using calculated period:', period);
    }
    
    console.log('💰 [PAYROLL] Period:', `${pay_period_start} to ${pay_period_end}`);
    console.log('💰 [PAYROLL] Fetching employee timecard data...');
    
    // Get all employees with their timecard data for the period
    const queryStartTime = Date.now();
    const { rows: payrolls } = await q(`
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        d.name as department,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        
        -- Sum ALL timecard entries where work_date is in the period (no approval filter)
        COALESCE((
          SELECT SUM(te.hours_worked)
          FROM timecard_entries te
          JOIN timecards t ON te.timecard_id = t.id
          WHERE t.employee_id = e.id
            AND te.work_date >= $1::date
            AND te.work_date <= $2::date
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
    
    const queryTime = Date.now() - queryStartTime;
    console.log(`💰 [PAYROLL] Query completed in ${queryTime}ms`);
    console.log(`💰 [PAYROLL] Found ${payrolls.length} active employees`);
    
    console.log('💰 [PAYROLL] Calculating pay for each employee...');
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
    
    const employeesWithHours = results.length;
    const totalGrossPay = results.reduce((sum, emp) => sum + emp.gross_pay, 0);
    const totalNetPay = results.reduce((sum, emp) => sum + emp.net_pay, 0);
    const totalHours = results.reduce((sum, emp) => sum + emp.total_hours, 0);
    const totalOvertimeHours = results.reduce((sum, emp) => sum + emp.overtime_hours, 0);
    
    const totalTime = Date.now() - startTime;
    console.log(`💰 [PAYROLL] ✅ Calculations complete!`);
    console.log(`💰 [PAYROLL] Total time: ${totalTime}ms`);
    console.log(`💰 [PAYROLL] Employees with hours: ${employeesWithHours} of ${payrolls.length}`);
    console.log(`💰 [PAYROLL] Total hours: ${totalHours.toFixed(2)} (${totalOvertimeHours.toFixed(2)} OT)`);
    console.log(`💰 [PAYROLL] Total gross pay: $${totalGrossPay.toFixed(2)}`);
    console.log(`💰 [PAYROLL] Total net pay: $${totalNetPay.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    res.json(results);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`❌ [PAYROLL] ERROR in calculate-live (${totalTime}ms)`);
    console.error('❌ [PAYROLL] Error:', error.message);
    console.error('❌ [PAYROLL] Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).json({ error: "Failed to calculate payroll: " + error.message });
  }
});

/**
 * Get all unique pay periods from timecards (no approval filter)
 * Groups by 2-week periods ending on Friday
 */
r.get("/periods", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📅 [PAYROLL-PERIODS] Request received');
    console.log('📅 [PAYROLL-PERIODS] Timestamp:', new Date().toISOString());
    
    // Get all timecard dates (no approval filter - if timecards exist, they count)
    console.log('📅 [PAYROLL-PERIODS] Fetching all timecard dates...');
    const { rows: dates } = await q(`
      SELECT DISTINCT work_date
      FROM timecard_entries te
      JOIN timecards t ON te.timecard_id = t.id
      ORDER BY work_date DESC
    `);
    
    console.log(`📅 [PAYROLL-PERIODS] Found ${dates.length} unique work dates`);
    
    console.log('📅 [PAYROLL-PERIODS] Grouping dates into 2-week pay periods...');
    // Group into 2-week pay periods (Saturday to Friday)
    const periods = [];
    const basePayday = new Date('2025-09-26T00:00:00Z');
    console.log('📅 [PAYROLL-PERIODS] Base payday:', basePayday.toISOString().split('T')[0]);
    
    dates.forEach(row => {
      // Handle both string and Date object formats
      const workDateStr = typeof row.work_date === 'string' 
        ? row.work_date 
        : row.work_date.toISOString().split('T')[0];
      const workDate = new Date(workDateStr + 'T00:00:00Z');
      
      // Find which pay period this date belongs to
      // Work weeks end on Friday, pay periods are 14 days (Sat-Fri, Sat-Fri)
      // Payday is 7 days after period ends
      
      // Calculate days from base payday
      const daysSinceBase = Math.floor((workDate - basePayday) / (1000 * 60 * 60 * 24));
      
      // Work date + 7 days = its payday
      // Round this to the nearest 14-day cycle from base
      const daysToPayday = daysSinceBase + 7;
      const periodsSinceBase = Math.round(daysToPayday / 14); // Use Math.round instead of Math.floor
      
      // Calculate the actual payday for this work date
      const payday = new Date(basePayday);
      payday.setUTCDate(basePayday.getUTCDate() + periodsSinceBase * 14);
      
      // Period ends 7 days before payday (Friday of Week 2)
      const periodEnd = new Date(payday);
      periodEnd.setUTCDate(payday.getUTCDate() - 7);
      
      // Period starts 13 days before period end (Saturday of Week 0/1)
      const periodStart = new Date(periodEnd);
      periodStart.setUTCDate(periodEnd.getUTCDate() - 13);
      
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
    
    console.log(`📅 [PAYROLL-PERIODS] Grouped into ${periods.length} unique pay periods`);
    console.log('📅 [PAYROLL-PERIODS] Fetching employee counts for each period...');
    
    // Get employee counts for each period
    const periodsWithCounts = await Promise.all(
      periods.map(async (period) => {
        const { rows } = await q(`
          SELECT COUNT(DISTINCT t.employee_id) as employee_count
          FROM timecard_entries te
          JOIN timecards t ON te.timecard_id = t.id
          WHERE te.work_date >= $1::date
            AND te.work_date <= $2::date
        `, [period.pay_period_start, period.pay_period_end]);
        
        return {
          ...period,
          employee_count: parseInt(rows[0].employee_count || 0)
        };
      })
    );
    
    const sortedPeriods = periodsWithCounts.sort((a, b) => 
      new Date(b.pay_date) - new Date(a.pay_date)
    );
    
    const totalTime = Date.now() - startTime;
    console.log(`📅 [PAYROLL-PERIODS] ✅ Complete in ${totalTime}ms`);
    console.log(`📅 [PAYROLL-PERIODS] Returning ${sortedPeriods.length} periods`);
    if (sortedPeriods.length > 0) {
      console.log('📅 [PAYROLL-PERIODS] Period summary:');
      sortedPeriods.slice(0, 5).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.pay_period_start} to ${p.pay_period_end} (${p.employee_count} employees)`);
      });
      if (sortedPeriods.length > 5) {
        console.log(`   ... and ${sortedPeriods.length - 5} more periods`);
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    
    res.json(sortedPeriods);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error(`❌ [PAYROLL-PERIODS] ERROR (${totalTime}ms)`);
    console.error('❌ [PAYROLL-PERIODS] Error:', error.message);
    console.error('❌ [PAYROLL-PERIODS] Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).json({ error: "Failed to fetch pay periods" });
  }
});

/**
 * Get next pay period info
 */
r.get("/next-period", async (req, res) => {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📆 [PAYROLL-NEXT] Request received');
    console.log('📆 [PAYROLL-NEXT] Timestamp:', new Date().toISOString());
    
    const period = getPayPeriod();
    
    console.log('📆 [PAYROLL-NEXT] ✅ Next pay period calculated:');
    console.log(`   Period: ${period.period_start} to ${period.period_end}`);
    console.log(`   Pay Date: ${period.pay_date}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    res.json(period);
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ [PAYROLL-NEXT] ERROR getting next pay period');
    console.error('❌ [PAYROLL-NEXT] Error:', error.message);
    console.error('❌ [PAYROLL-NEXT] Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).json({ error: "Failed to get next pay period" });
  }
});

export default r;

