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
    // Get real recent activity from database
    const [recentHires, recentPayroll, recentLeave, recentPerformance] = await Promise.all([
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
      `),
      
      // Recent leave requests
      q(`
        SELECT 
          'leave' as type,
          CONCAT('Leave request ', status, ' for ', e.first_name, ' ', e.last_name) as description,
          created_at as timestamp,
          lr.id
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE lr.created_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY lr.created_at DESC
        LIMIT 5
      `),
      
      // Recent performance reviews
      q(`
        SELECT 
          'performance' as type,
          CONCAT('Performance review completed for ', e.first_name, ' ', e.last_name) as description,
          review_date as timestamp,
          pr.id
        FROM performance_reviews pr
        JOIN employees e ON pr.employee_id = e.id
        WHERE pr.review_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY pr.review_date DESC
        LIMIT 5
      `)
    ]);
    
    // Combine all activities and sort by timestamp
    const allActivities = [
      ...recentHires.rows,
      ...recentPayroll.rows,
      ...recentLeave.rows,
      ...recentPerformance.rows
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
    
    // Convert time range to SQL interval
    const getTimeInterval = (range) => {
      switch (range) {
        case 'week': return "7 days";
        case 'month': return "30 days";
        case 'quarter': return "90 days";
        case 'year': return "365 days";
        default: return "30 days";
      }
    };
    
    const timeInterval = getTimeInterval(timeRange);
    
    const [
      employeeStats,
      departmentStats,
      recentHires,
      leaveStats,
      performanceStats,
      timeStats
    ] = await Promise.all([
      // Employee statistics with dynamic time range
      q(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees,
          COUNT(CASE WHEN hire_date >= CURRENT_DATE - INTERVAL '${timeInterval}' THEN 1 END) as new_hires_this_period,
          COUNT(CASE WHEN termination_date IS NOT NULL AND termination_date >= CURRENT_DATE - INTERVAL '${timeInterval}' THEN 1 END) as terminations_this_period
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
        WHERE hire_date >= CURRENT_DATE - INTERVAL '${timeInterval}'
        ORDER BY hire_date DESC
        LIMIT 5
      `),
      
      // Leave statistics with dynamic time range
      q(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_requests
        FROM leave_requests
        WHERE created_at >= CURRENT_DATE - INTERVAL '${timeInterval}'
      `),
      
      // Performance statistics with dynamic time range
      q(`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(overall_rating) as average_rating,
          COUNT(CASE WHEN overall_rating >= 4.0 THEN 1 END) as high_performers
        FROM performance_reviews
        WHERE review_date >= CURRENT_DATE - INTERVAL '${timeInterval}'
      `),
      
      // Time tracking statistics with dynamic time range
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
        WHERE work_date >= CURRENT_DATE - INTERVAL '${timeInterval}'
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
