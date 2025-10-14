import express from 'express';
import { requireAuth } from '../session.js';
import { applyScopeFilter, requirePermission, PERMISSIONS } from '../middleware/rbac.js';
import { q } from '../db.js';

const router = express.Router();

// Apply authentication and RBAC to all routes
router.use(requireAuth);
router.use(applyScopeFilter);

// Submit a new leave request (user role only)
router.post('/', async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    const employee_id = req.employeeId;

    // Validate required fields
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Leave type, start date, and end date are required' 
      });
    }

    // Validate leave type
    const validLeaveTypes = ['Vacation', 'Sick Leave', 'Personal Leave', 'Bereavement', 'Parental Leave', 'Jury Duty', 'Military Leave'];
    if (!validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid leave type' 
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date cannot be before start date' 
      });
    }

    if (startDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot request leave for past dates' 
      });
    }

    // Calculate total days (inclusive of both start and end date)
    const diffTime = Math.abs(endDate - startDate);
    const total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping requests
    const overlapQuery = `
      SELECT id FROM leave_requests 
      WHERE employee_id = $1 
        AND status = 'Pending'
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
    `;
    const overlapResult = await q(overlapQuery, [employee_id, start_date, end_date]);
    
    if (overlapResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have a pending leave request that overlaps with these dates' 
      });
    }

    // Insert the leave request
    const insertQuery = `
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, total_days)
      VALUES ($1, $2, $3, $4, $5, 'Pending', $6)
      RETURNING *
    `;
    
    const result = await q(insertQuery, [employee_id, leave_type, start_date, end_date, reason, total_days]);
    
    res.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit leave request',
      error: error.message 
    });
  }
});

// Get leave requests (filtered by role)
router.get('/', async (req, res) => {
  try {
    let query, params;
    
    if (req.userScope === 'own') {
      // User role - only their own requests
      query = `
        SELECT lr.*, e.first_name, e.last_name, e.email
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE lr.employee_id = $1
        ORDER BY lr.requested_at DESC
      `;
      params = [req.employeeId];
    } else {
      // HR role - all requests
      query = `
        SELECT lr.*, e.first_name, e.last_name, e.email
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        ORDER BY lr.requested_at DESC
      `;
      params = [];
    }

    const result = await q(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch leave requests',
      error: error.message 
    });
  }
});

// Get pending requests (HR role only)
router.get('/pending', requirePermission(PERMISSIONS.LEAVE_APPROVE), async (req, res) => {
  try {
    const query = `
      SELECT 
        lr.*,
        e.first_name, 
        e.last_name, 
        e.email,
        (SELECT COALESCE(SUM(entitled_days - used_days + carried_over_days), 0) 
         FROM leave_balances lb 
         JOIN leave_types lt ON lb.leave_type_id = lt.id 
         WHERE lb.employee_id = e.id 
           AND lt.name = 'Vacation' 
           AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)) as vacation_balance,
        (SELECT COALESCE(SUM(entitled_days - used_days + carried_over_days), 0) 
         FROM leave_balances lb 
         JOIN leave_types lt ON lb.leave_type_id = lt.id 
         WHERE lb.employee_id = e.id 
           AND lt.name = 'Sick Leave' 
           AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)) as sick_balance,
        (SELECT COALESCE(SUM(entitled_days - used_days + carried_over_days), 0) 
         FROM leave_balances lb 
         JOIN leave_types lt ON lb.leave_type_id = lt.id 
         WHERE lb.employee_id = e.id 
           AND lt.name = 'Personal Leave' 
           AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)) as personal_balance
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.status = 'Pending'
      ORDER BY lr.requested_at ASC
    `;
    
    const result = await q(query);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending requests',
      error: error.message 
    });
  }
});

// Approve or reject a leave request (HR role only)
router.put('/:id/status', requirePermission(PERMISSIONS.LEAVE_APPROVE), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const reviewed_by = req.user.id;

    // Validate status
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status must be either Approved or Rejected' 
      });
    }

    // Update the leave request
    const updateQuery = `
      UPDATE leave_requests 
      SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await q(updateQuery, [status, review_notes, reviewed_by, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Leave request not found' 
      });
    }

    // If approved, we might want to add it to the leave calendar
    // This would integrate with the existing leave system
    if (status === 'Approved') {
      // TODO: Add to leave calendar/leave_entries table
      console.log('Leave request approved - should integrate with calendar');
    }

    res.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating leave request status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update leave request status',
      error: error.message 
    });
  }
});

// Get leave request statistics (HR role only)
router.get('/stats', requirePermission(PERMISSIONS.LEAVE_VIEW), async (req, res) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM leave_requests
      GROUP BY status
    `;
    
    const result = await q(query);
    
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    result.rows.forEach(row => {
      stats[row.status.toLowerCase()] = parseInt(row.count);
    });
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching leave request stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch leave request statistics',
      error: error.message 
    });
  }
});

export default router;
