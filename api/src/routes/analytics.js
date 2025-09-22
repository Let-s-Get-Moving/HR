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
      // Recent hires
      q(`
        SELECT 
          'hire' as type,
          CONCAT('New employee ', first_name, ' ', last_name, ' was hired') as description,
          hire_date as timestamp,
          id
        FROM employees 
        WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
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
    
    const [
      employeeStats,
      departmentStats,
      recentHires,
      payrollStats
    ] = await Promise.all([
      // Employee statistics with dynamic time range
      q(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees,
          COUNT(CASE WHEN hire_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days' THEN 1 END) as new_hires_this_period,
          COUNT(CASE WHEN termination_date IS NOT NULL AND termination_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days' THEN 1 END) as terminations_this_period
        FROM employees
      `),
      
      // Department breakdown
      q(`
        SELECT 
          d.name as department,
          COUNT(e.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
      `),
      
      // Recent hires with dynamic time range
      q(`
        SELECT first_name, last_name, hire_date, role_title
        FROM employees
        WHERE hire_date >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days'
        ORDER BY hire_date DESC
        LIMIT 5
      `),
      
      // Payroll statistics with dynamic time range
      q(`
        SELECT 
          COUNT(*) as total_calculations,
          COUNT(CASE WHEN status = 'Calculated' THEN 1 END) as completed_calculations,
          ROUND(AVG(CAST(total_gross AS NUMERIC)), 2) as avg_gross_pay,
          ROUND(SUM(CAST(total_gross AS NUMERIC)), 2) as total_payroll_amount
        FROM payroll_calculations
        WHERE calculated_at >= CURRENT_DATE - INTERVAL '${timeIntervalDays} days'
      `)
    ]);

    // Calculate turnover rate (terminations in last 12 months / average employees)
    const totalEmployees = parseInt(employeeStats.rows[0].total_employees);
    const terminationsThisPeriod = parseInt(employeeStats.rows[0].terminations_this_period);
    const turnoverRate = totalEmployees > 0 ? ((terminationsThisPeriod * 12) / totalEmployees * 100) : 0;

    // Format department breakdown
    const departmentBreakdown = {};
    departmentStats.rows.forEach(dept => {
      departmentBreakdown[dept.department] = parseInt(dept.employee_count);
    });

    // Format recent activities
    const recentActivities = recentHires.rows.map(hire => ({
      type: 'hire',
      employee: `${hire.first_name} ${hire.last_name}`,
      role: hire.role_title,
      date: hire.hire_date
    }));

    const analytics = {
      totalEmployees: totalEmployees,
      activeEmployees: parseInt(employeeStats.rows[0].active_employees),
      newHiresThisMonth: parseInt(employeeStats.rows[0].new_hires_this_period),
      turnoverRate: formatNumber(turnoverRate, 1),
      departmentBreakdown,
      recentActivities,
      payrollStats: {
        totalCalculations: parseInt(payrollStats.rows[0].total_calculations),
        completedCalculations: parseInt(payrollStats.rows[0].completed_calculations),
        avgGrossPay: formatNumber(payrollStats.rows[0].avg_gross_pay, 2),
        totalPayrollAmount: formatNumber(payrollStats.rows[0].total_payroll_amount, 2)
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default r;
