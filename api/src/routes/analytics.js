import { Router } from "express";
import { q } from "../db.js";

const r = Router();

// Test route
r.get("/test", (_req, res) => {
  res.json({ message: "Analytics route is working" });
});

// Get dashboard analytics
r.get("/dashboard", async (_req, res) => {
  try {
    const [employeeCount, payrollCount, alertCount, recentHires, terminations, turnoverRate] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM employees WHERE status = 'Active'`),
      q(`SELECT COUNT(*) as count FROM payroll_calculations`),
      q(`SELECT COUNT(*) as count FROM alerts WHERE resolved = false`),
      q(`SELECT COUNT(*) as count FROM employees WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'`),
      q(`SELECT COUNT(*) as count FROM employees WHERE termination_date >= CURRENT_DATE - INTERVAL '30 days'`),
      q(`SELECT ROUND(100.0 * COUNT(*) / GREATEST((SELECT COUNT(*) FROM employees), 1), 2) as rate FROM employees WHERE termination_date >= date_trunc('year', CURRENT_DATE)`)
    ]);

    res.json({
      workforceOverview: {
        total_active_employees: parseInt(employeeCount.rows[0].count)
      },
      newHires: [], // Simplified for now
      terminations: [], // Simplified for now
      turnoverRate: {
        turnover_rate_percentage: parseFloat(turnoverRate.rows[0].rate || 0)
      },
      departmentDistribution: [], // Simplified for now
      upcomingAnniversaries: [], // Simplified for now
      upcomingProbationCompletions: [] // Simplified for now
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({ error: "Failed to fetch dashboard analytics" });
  }
});

export default r;
