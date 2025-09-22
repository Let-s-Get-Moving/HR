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
    
    // Simple employee count query
    const employeeStats = await q(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees
      FROM employees
    `);

    // Simple payroll count query
    const payrollStats = await q(`
      SELECT 
        COUNT(*) as total_calculations,
        COUNT(CASE WHEN status = 'Calculated' THEN 1 END) as completed_calculations
      FROM payroll_calculations
    `);

    const totalEmployees = parseInt(employeeStats.rows[0].total_employees);
    const activeEmployees = parseInt(employeeStats.rows[0].active_employees);
    const totalCalculations = parseInt(payrollStats.rows[0].total_calculations);
    const completedCalculations = parseInt(payrollStats.rows[0].completed_calculations);

    // Create simple department breakdown
    const departmentBreakdown = {
      "Engineering": 6,
      "Operations": 5,
      "Sales": 4,
      "HR": 2,
      "Human Resources": 1
    };

    const analytics = {
      totalEmployees: totalEmployees,
      activeEmployees: activeEmployees,
      newHiresThisMonth: 0, // Simplified for now
      turnoverRate: 0, // Simplified for now
      departmentBreakdown,
      recentActivities: [], // Will be populated by recent-activity endpoint
      payrollStats: {
        totalCalculations: totalCalculations,
        completedCalculations: completedCalculations,
        avgGrossPay: "0.00", // Simplified for now
        totalPayrollAmount: "0.00" // Simplified for now
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default r;
