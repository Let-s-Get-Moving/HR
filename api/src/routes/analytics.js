import { Router } from "express";
import { q } from "../db.js";
import { formatNumber, formatRating, formatHours } from "../utils/formatting.js";

const r = Router();

// Test route
r.get("/test", (_req, res) => {
  res.json({ message: "Analytics route is working" });
});

// Get recent activity
r.get("/recent-activity", async (_req, res) => {
  try {
    // Get real recent activity from database - only use tables that exist
    const [recentHires, recentPayroll] = await Promise.all([
      // Recent hires - exclude terminated/deleted employees
      q(`
        SELECT 
          'hire' as type,
          CONCAT('New employee ', first_name, ' ', last_name, ' was hired') as description,
          hire_date as timestamp,
          id
        FROM employees 
        WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
          AND status = 'Active'
        ORDER BY hire_date DESC
        LIMIT 5
      `),
      
      // Recent payroll submissions
      q(`
        SELECT 
          'payroll' as type,
          CONCAT('Payroll processed for ', period_name) as description,
          submission_date as timestamp,
          id
        FROM payroll_submissions 
        WHERE submission_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY submission_date DESC
        LIMIT 5
      `)
    ]);
    
    // Combine all activities and sort by timestamp
    const allActivities = [
      ...recentHires.rows,
      ...recentPayroll.rows
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    
    res.json(allActivities);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get dashboard analytics
r.get("/dashboard", async (req, res) => {
  try {
    // Get time range parameter from query string
    const { timeRange = 'month' } = req.query;
    
    // Convert time range to days
    const getTimeInterval = (range) => {
      switch (range) {
        case 'week': return 7;
        case 'month': return 30;
        case 'quarter': return 90;
        case 'year': return 365;
        default: return 30;
      }
    };
    
    const timeIntervalDays = getTimeInterval(timeRange);
    
    console.log(`📊 [Analytics] Dashboard data requested for time range: ${timeRange} (${timeIntervalDays} days)`);
    
    // Get workforce overview - always total, not filtered by time
    const workforceStats = await q(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as total_active_employees,
        COUNT(CASE WHEN status = 'Terminated' THEN 1 END) as total_terminated,
        COUNT(CASE WHEN employment_type = 'Full-time' AND status = 'Active' THEN 1 END) as full_time,
        COUNT(CASE WHEN employment_type = 'Part-time' AND status = 'Active' THEN 1 END) as part_time,
        COUNT(CASE WHEN employment_type = 'Contract' AND status = 'Active' THEN 1 END) as contract
      FROM employees
    `);

    // Employee stats for the specific time range
    const employeeStats = await q(`
      SELECT 
        COUNT(CASE WHEN hire_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days' THEN 1 END) as new_hires_this_period,
        COUNT(CASE WHEN termination_date IS NOT NULL AND termination_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days' THEN 1 END) as terminations_this_period
      FROM employees
    `);

    // Payroll stats for the specific time range
    const payrollStats = await q(`
      SELECT 
        COUNT(*) as total_calculations,
        COUNT(CASE WHEN status = 'Calculated' THEN 1 END) as completed_calculations,
        ROUND(COALESCE(AVG(CAST(total_gross AS NUMERIC)), 0), 2) as avg_gross_pay,
        ROUND(COALESCE(SUM(CAST(total_gross AS NUMERIC)), 0), 2) as total_payroll_amount
      FROM payroll_calculations
      WHERE calculated_at >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days'
    `);

    // Get real department distribution
    const departmentData = await q(`
      SELECT 
        COALESCE(d.name, 'Unassigned') as department,
        COUNT(e.id) as employee_count,
        ROUND((COUNT(e.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM employees WHERE status = 'Active'), 0)), 1) as percentage
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'Active'
      GROUP BY d.name
      ORDER BY employee_count DESC
      LIMIT 10
    `);

    // Get real attendance metrics from timecard entries
    const attendanceStats = await q(`
      SELECT 
        ROUND(COALESCE(AVG(tce.hours_worked), 0), 1) as avg_hours_per_entry,
        COUNT(DISTINCT tce.work_date) as total_work_days,
        COUNT(DISTINCT tc.employee_id) as employees_with_timecards
      FROM timecard_entries tce
      JOIN timecards tc ON tce.timecard_id = tc.id
      WHERE tce.work_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days'
    `);

    // Get compliance/contract stats
    const complianceStats = await q(`
      SELECT 
        COUNT(CASE WHEN contract_status = 'Signed' THEN 1 END) as contracts_signed,
        COUNT(CASE WHEN contract_status IS NOT NULL THEN 1 END) as contracts_total,
        ROUND((COUNT(CASE WHEN contract_status = 'Signed' THEN 1 END) * 100.0 / 
               NULLIF(COUNT(*), 0)), 1) as contracts_signed_pct
      FROM employees
      WHERE status = 'Active'
    `);

    // Get training completion stats
    const trainingStats = await q(`
      SELECT 
        COUNT(DISTINCT tr.employee_id) as employees_with_training,
        COUNT(*) as total_training_records,
        COUNT(CASE WHEN tr.completed_on >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days' THEN 1 END) as training_completed_this_period
      FROM training_records tr
      WHERE tr.completed_on IS NOT NULL
    `);

    // Parse results
    const workforce = workforceStats.rows[0];
    const employees = employeeStats.rows[0];
    const payroll = payrollStats.rows[0];
    const attendance = attendanceStats.rows[0];
    const compliance = complianceStats.rows[0];
    const training = trainingStats.rows[0];

    const totalEmployees = parseInt(workforce.total_employees) || 0;
    const activeEmployees = parseInt(workforce.total_active_employees) || 0;
    const newHiresThisPeriod = parseInt(employees.new_hires_this_period) || 0;
    const terminationsThisPeriod = parseInt(employees.terminations_this_period) || 0;
    
    // Calculate metrics
    const turnoverRate = activeEmployees > 0 ? Math.round(((terminationsThisPeriod / activeEmployees) * 100) * 10) / 10 : 0;
    const avgHoursPerWeek = attendance.total_work_days > 0 ? Math.round((parseFloat(attendance.avg_hours_per_entry) * attendance.total_work_days / (timeIntervalDays / 7)) * 10) / 10 : 0;
    const trainingCompletionRate = activeEmployees > 0 ? Math.round((parseInt(training.employees_with_training) / activeEmployees * 100) * 10) / 10 : 0;

    const analytics = {
      timeRange: timeRange,
      timeIntervalDays: timeIntervalDays,
      
      // Workforce Overview (always total, not time-filtered)
      totalEmployees: totalEmployees,
      activeEmployees: activeEmployees,
      workforceOverview: {
        total_employees: totalEmployees,
        total_active_employees: activeEmployees,
        total_terminated: parseInt(workforce.total_terminated) || 0,
        full_time: parseInt(workforce.full_time) || 0,
        part_time: parseInt(workforce.part_time) || 0,
        contract: parseInt(workforce.contract) || 0
      },
      
      // Time-filtered metrics
      newHiresThisMonth: newHiresThisPeriod,
      terminationsThisPeriod: terminationsThisPeriod,
      turnoverRate: turnoverRate,
      
      // Payroll stats (time-filtered)
      payrollStats: {
        totalCalculations: parseInt(payroll.total_calculations) || 0,
        completedCalculations: parseInt(payroll.completed_calculations) || 0,
        avgGrossPay: payroll.avg_gross_pay || "0.00",
        totalPayrollAmount: payroll.total_payroll_amount || "0.00"
      },
      
      // Department distribution (always current, not time-filtered)
      departmentDistribution: departmentData.rows.map(dept => ({
        department: dept.department,
        employee_count: parseInt(dept.employee_count),
        percentage: parseFloat(dept.percentage) || 0
      })),
      
      // Attendance metrics (time-filtered)
      attendanceMetrics: {
        avg_hours_per_week: avgHoursPerWeek,
        employees_tracked: parseInt(attendance.employees_with_timecards) || 0,
        total_work_days: parseInt(attendance.total_work_days) || 0
      },
      
      // Compliance (current state, not time-filtered)
      complianceStats: {
        contracts_signed: parseInt(compliance.contracts_signed) || 0,
        contracts_total: parseInt(compliance.contracts_total) || 0,
        contracts_signed_pct: parseFloat(compliance.contracts_signed_pct) || 0
      },
      
      // Training (mixed: total employees with training, recent completions)
      trainingStats: {
        employees_with_training: parseInt(training.employees_with_training) || 0,
        total_training_records: parseInt(training.total_training_records) || 0,
        training_completed_this_period: parseInt(training.training_completed_this_period) || 0,
        completion_rate: trainingCompletionRate
      }
    };
    
    console.log(`✅ [Analytics] Dashboard data returned for ${timeRange}`);
    res.json(analytics);
  } catch (error) {
    console.error("❌ [Analytics] Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch analytics", details: error.message });
  }
});

export default r;
