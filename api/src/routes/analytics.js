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
    // Return mock recent activity data for now
    const recentActivity = [
      {
        id: 1,
        description: "New employee John Doe was hired",
        timestamp: new Date().toISOString(),
        type: "hire"
      },
      {
        id: 2,
        description: "Payroll processed for August 2025",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: "payroll"
      },
      {
        id: 3,
        description: "Leave request approved for Jane Smith",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: "leave"
      }
    ];
    
    res.json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get dashboard analytics
r.get("/dashboard", async (_req, res) => {
  try {
    const [
      employeeStats,
      departmentStats,
      recentHires,
      leaveStats,
      performanceStats,
      timeStats
    ] = await Promise.all([
      // Employee statistics
      q(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees,
          COUNT(CASE WHEN hire_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_hires_this_month,
          COUNT(CASE WHEN termination_date IS NOT NULL AND termination_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as terminations_this_month
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
      
      // Recent hires
      q(`
        SELECT first_name, last_name, hire_date, role_title
        FROM employees
        WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY hire_date DESC
        LIMIT 5
      `),
      
      // Leave statistics
      q(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_requests
        FROM leave_requests
        WHERE start_date >= CURRENT_DATE - INTERVAL '30 days'
      `),
      
      // Performance statistics
      q(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(overall_rating) as average_rating,
          COUNT(CASE WHEN overall_rating >= 4.0 THEN 1 END) as high_performers
        FROM performance_reviews
        WHERE review_date >= CURRENT_DATE - INTERVAL '90 days'
      `),
      
      // Time tracking statistics
      q(`
        SELECT 
          COUNT(*) as total_entries,
          AVG(
            CASE 
              WHEN hours_worked IS NOT NULL THEN hours_worked
              WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (clock_out - clock_in))/3600
              ELSE 8.0
            END
          ) as avg_hours_per_day,
          SUM(COALESCE(overtime_hours, 0)) as total_overtime
        FROM time_entries
        WHERE work_date >= CURRENT_DATE - INTERVAL '30 days'
      `)
    ]);

    // Calculate turnover rate (terminations in last 12 months / average employees)
    const totalEmployees = parseInt(employeeStats.rows[0].total_employees);
    const terminationsThisMonth = parseInt(employeeStats.rows[0].terminations_this_month);
    const turnoverRate = totalEmployees > 0 ? ((terminationsThisMonth * 12) / totalEmployees * 100) : 0;

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
      newHiresThisMonth: parseInt(employeeStats.rows[0].new_hires_this_month),
      turnoverRate: formatNumber(turnoverRate, 1),
      departmentBreakdown,
      recentActivities,
      leaveStats: {
        totalRequests: parseInt(leaveStats.rows[0].total_requests),
        pendingRequests: parseInt(leaveStats.rows[0].pending_requests),
        approvedRequests: parseInt(leaveStats.rows[0].approved_requests)
      },
      performanceStats: {
        totalReviews: parseInt(performanceStats.rows[0].total_reviews),
        averageRating: formatRating(performanceStats.rows[0].average_rating),
        highPerformers: parseInt(performanceStats.rows[0].high_performers)
      },
      timeStats: {
        totalEntries: parseInt(timeStats.rows[0].total_entries),
        avgHoursPerDay: formatHours(timeStats.rows[0].avg_hours_per_day),
        totalOvertime: formatHours(timeStats.rows[0].total_overtime)
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default r;
