import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { applyScopeFilter, requireRole, ROLES } from "../middleware/rbac.js";
import { requireAuth } from "../session.js";
import { notificationService } from "../services/notifications.js";

const r = Router();

// Apply scope filter to all leave routes (adds role info, doesn't block)
r.use(applyScopeFilter);

// Get all leave requests
r.get("/requests", async (req, res) => {
  try {
    let query = `
      SELECT lr.*, e.first_name, e.last_name, e.email, lt.name as leave_type_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
    `;
    
    const params = [];
    
    // RBAC: Users can only see their own leave requests
    if (req.userScope === 'own' && req.employeeId) {
      query += ` WHERE lr.employee_id = $1`;
      params.push(req.employeeId);
      console.log(`🔒 [RBAC] Filtering leave requests for employee ${req.employeeId}`);
    }
    
    query += ` ORDER BY lr.requested_at DESC`;
    
    const { rows } = await q(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error getting leave requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee leave requests
r.get("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // RBAC: Users can only view their own leave requests
    if (req.userScope === 'own' && req.employeeId && parseInt(id) !== req.employeeId) {
      console.log(`🚫 [RBAC] User tried to access another employee's leave: ${id}`);
      return res.status(403).json({ error: 'You can only view your own leave requests' });
    }
    
    const { rows } = await q(`
      SELECT lr.*, lt.name as leave_type_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = $1
      ORDER BY lr.requested_at DESC
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error getting employee leave requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leave balances for all employees
r.get("/balances", async (req, res) => {
  try {
    let query = `
      SELECT lb.*, lt.name as leave_type_name, e.first_name, e.last_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      JOIN employees e ON lb.employee_id = e.id
    `;
    
    const params = [];
    
    // RBAC: Users can only see their own balance
    if (req.userScope === 'own' && req.employeeId) {
      query += ` WHERE lb.employee_id = $1`;
      params.push(req.employeeId);
      console.log(`🔒 [RBAC] Filtering leave balances for employee ${req.employeeId}`);
    }
    
    query += ` ORDER BY e.first_name, lt.name`;
    
    const { rows } = await q(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error getting leave balances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leave balances for specific employee
r.get("/balances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // RBAC: Users can only view their own balance
    if (req.userScope === 'own' && req.employeeId && parseInt(id) !== req.employeeId) {
      console.log(`🚫 [RBAC] User tried to access another employee's balance: ${id}`);
      return res.status(403).json({ error: 'You can only view your own leave balance' });
    }
    
    const { rows } = await q(`
      SELECT lb.*, lt.name as leave_type_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1
      ORDER BY lt.name
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error getting employee leave balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create leave request
const leaveRequestSchema = z.object({
  employee_id: z.number().int(),
  leave_type_id: z.number().int(),
  start_date: z.string(),
  end_date: z.string(),
  total_days: z.number().positive(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).default('Pending'),
  request_method: z.enum(['Email', 'Phone', 'In-Person', 'Slack', 'Written', 'Other']).optional(),
  approved_by: z.number().int().optional()
});

r.post("/requests", async (req, res) => {
  try {
    const data = leaveRequestSchema.parse(req.body);
    
    // RBAC: Users can only create leave requests for themselves
    if (req.userScope === 'own' && req.employeeId && data.employee_id !== req.employeeId) {
      console.log(`🚫 [RBAC] User tried to create leave for another employee: ${data.employee_id}`);
      return res.status(403).json({ error: 'You can only create leave requests for yourself' });
    }
    
    // RBAC: Users cannot approve their own leave - force to Pending
    if (req.userScope === 'own') {
      data.status = 'Pending';
      console.log(`🔒 [RBAC] Forcing leave status to Pending for user`);
    }
    
    // Start transaction
    await q('BEGIN');
    
    // Insert leave request
    const { rows } = await q(`
      INSERT INTO leave_requests 
      (employee_id, leave_type_id, start_date, end_date, total_days, reason, notes, status, request_method, approved_by, requested_at, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, 
              CASE WHEN $8 = 'Approved' THEN CURRENT_TIMESTAMP ELSE NULL END)
      RETURNING *
    `, [
      data.employee_id, 
      data.leave_type_id, 
      data.start_date, 
      data.end_date, 
      data.total_days, 
      data.reason || null, 
      data.notes || null, 
      data.status,
      data.request_method || null,
      data.approved_by || null
    ]);
    
    const leaveRequest = rows[0];
    
    // If approved, update leave balances automatically
    if (data.status === 'Approved') {
      const year = new Date(data.start_date).getFullYear();
      
      // Create or update leave balance
      await q(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
        VALUES ($1, $2, $3, 
                (SELECT default_annual_entitlement FROM leave_types WHERE id = $2), 
                $4, 0)
        ON CONFLICT (employee_id, leave_type_id, year)
        DO UPDATE SET used_days = leave_balances.used_days + $4
      `, [data.employee_id, data.leave_type_id, year, data.total_days]);
      
      // Map leave type names to match leaves table constraint
      const leaveTypeMap = {
        'Vacation': 'Vacation',
        'Sick Leave': 'Sick',
        'Personal Leave': 'Other',
        'Bereavement': 'Bereavement',
        'Parental Leave': 'Parental',
        'Jury Duty': 'Other',
        'Military Leave': 'Other'
      };
      
      // Get leave type name and map it
      const leaveTypeName = (await q('SELECT name FROM leave_types WHERE id = $1', [data.leave_type_id])).rows[0]?.name || 'Other';
      const mappedLeaveType = leaveTypeMap[leaveTypeName] || 'Other';
      
      // Also create record in leaves table for backwards compatibility
      await q(`
        INSERT INTO leaves (employee_id, leave_type, start_date, end_date, approved_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        data.employee_id, 
        mappedLeaveType,
        data.start_date, 
        data.end_date, 
        'HR',
        data.notes || null
      ]);
    }
    
    await q('COMMIT');
    
    // Send email notification to HR (non-blocking)
    notificationService.notifyLeaveRequestSubmitted(leaveRequest.id).catch(err => 
      console.error('Failed to send leave notification:', err)
    );
    
    res.status(201).json(leaveRequest);
  } catch (error) {
    await q('ROLLBACK');
    console.error('Error creating leave request:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update leave request status
r.put("/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, approved_by, notes } = req.body;
  
  // RBAC: Only managers/admins can approve leave
  if (req.userScope === 'own') {
    console.log(`🚫 [RBAC] User role cannot approve leave requests`);
    return res.status(403).json({ error: 'Only managers can approve leave requests' });
  }
  
  try {
    await q('BEGIN');
    
    // Get the leave request details first
    const { rows: lrRows } = await q('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (lrRows.length === 0) {
      await q('ROLLBACK');
      return res.status(404).json({ error: "Leave request not found" });
    }
    
    const oldStatus = lrRows[0].status;
    
    // Update leave request status
    const { rows } = await q(`
      UPDATE leave_requests 
      SET status = $1, approved_by = $2, approved_at = CASE WHEN $1 = 'Approved' THEN CURRENT_TIMESTAMP ELSE approved_at END, 
          notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, notes, id]);
    
    const lr = rows[0];
    const year = new Date(lr.start_date).getFullYear();
    
    // Handle status changes and update leave balances accordingly
    if (status === 'Approved' && oldStatus !== 'Approved') {
      // Add to used days when approving
      await q(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
        VALUES ($1, $2, $3, 
                (SELECT default_annual_entitlement FROM leave_types WHERE id = $2), 
                $4, 0)
        ON CONFLICT (employee_id, leave_type_id, year)
        DO UPDATE SET used_days = leave_balances.used_days + $4
      `, [lr.employee_id, lr.leave_type_id, year, lr.total_days]);
      
      // Map leave type names to match leaves table constraint
      const leaveTypeMap = {
        'Vacation': 'Vacation',
        'Sick Leave': 'Sick',
        'Personal Leave': 'Other',
        'Bereavement': 'Bereavement',
        'Parental Leave': 'Parental',
        'Jury Duty': 'Other',
        'Military Leave': 'Other'
      };
      
      // Get leave type name and map it
      const leaveTypeName = (await q('SELECT name FROM leave_types WHERE id = $1', [lr.leave_type_id])).rows[0]?.name || 'Other';
      const mappedLeaveType = leaveTypeMap[leaveTypeName] || 'Other';
      
      // Create leave record
      await q(`
        INSERT INTO leaves (employee_id, leave_type, start_date, end_date, approved_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        lr.employee_id, 
        mappedLeaveType,
        lr.start_date, 
        lr.end_date,
        'HR',
        lr.notes
      ]);
    } else if (status !== 'Approved' && oldStatus === 'Approved') {
      // Subtract from used days when un-approving (rejecting or cancelling previously approved leave)
      await q(`
        UPDATE leave_balances
        SET used_days = GREATEST(0, used_days - $1)
        WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
      `, [lr.total_days, lr.employee_id, lr.leave_type_id, year]);
      
      // Delete leave record
      await q(`
        DELETE FROM leaves 
        WHERE employee_id = $1 AND start_date = $2 AND end_date = $3
      `, [lr.employee_id, lr.start_date, lr.end_date]);
    }
    
    await q('COMMIT');
    
    // Send email to employee (non-blocking)
    const approverName = req.user?.full_name || approved_by || 'HR';
    notificationService.notifyLeaveRequestDecision(id, status, approverName).catch(err =>
      console.error('Failed to send decision notification:', err)
    );
    
    res.json(rows[0]);
  } catch (error) {
    await q('ROLLBACK');
    console.error('Error updating leave request status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leave analytics
r.get("/analytics", async (_req, res) => {
  try {
    const [requests, balances, upcoming] = await Promise.all([
      q(`SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected
         FROM leave_requests`),
      q(`SELECT lt.name, SUM(lb.entitled_days - lb.used_days + lb.carried_over_days) as total_available, SUM(lb.used_days) as total_used
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         GROUP BY lt.id, lt.name`),
      q(`SELECT COUNT(*) as upcoming_leaves
         FROM leave_requests 
         WHERE status = 'Approved' 
         AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`)
    ]);
    
    res.json({
      requests: requests.rows[0],
      balances: balances.rows,
      upcoming: upcoming.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LEAVE TYPES ENDPOINTS ==========

// GET /api/leave/types - Get all leave types
r.get("/types", async (_req, res) => {
  try {
    const { rows } = await q(`SELECT * FROM leave_types ORDER BY name`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// POST /api/leave/types - Create new leave type (manager/admin only)
r.post("/types", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, description, default_annual_entitlement, is_paid, requires_approval, color } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Leave type name is required' });
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Leave type name must be 100 characters or less' });
    }
    
    if (default_annual_entitlement === undefined || default_annual_entitlement < 0) {
      return res.status(400).json({ error: 'Default annual entitlement must be 0 or greater' });
    }
    
    // Validate color format (hex)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (color && !colorRegex.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #3B82F6)' });
    }
    
    // Check if leave type already exists
    const existing = await q(`SELECT id FROM leave_types WHERE name = $1`, [trimmedName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Leave type already exists' });
    }
    
    // Insert new leave type
    const result = await q(`
      INSERT INTO leave_types (name, description, default_annual_entitlement, is_paid, requires_approval, color) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [
      trimmedName,
      description || null,
      default_annual_entitlement || 0,
      is_paid !== undefined ? is_paid : true,
      requires_approval !== undefined ? requires_approval : true,
      color || '#3B82F6'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating leave type:', error);
    res.status(500).json({ error: 'Failed to create leave type' });
  }
});

// PUT /api/leave/types/:id - Update leave type (manager/admin only)
r.put("/types/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    const { name, description, default_annual_entitlement, is_paid, requires_approval, color } = req.body;
    
    if (isNaN(leaveTypeId)) {
      return res.status(400).json({ error: 'Invalid leave type ID' });
    }
    
    // Check if leave type exists
    const deptCheck = await q(`SELECT id FROM leave_types WHERE id = $1`, [leaveTypeId]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }
    
    // Validation
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Leave type name cannot be empty' });
    }
    
    const trimmedName = name ? name.trim() : null;
    
    if (trimmedName && trimmedName.length > 100) {
      return res.status(400).json({ error: 'Leave type name must be 100 characters or less' });
    }
    
    if (default_annual_entitlement !== undefined && default_annual_entitlement < 0) {
      return res.status(400).json({ error: 'Default annual entitlement must be 0 or greater' });
    }
    
    // Validate color format (hex)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (color && !colorRegex.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex color (e.g., #3B82F6)' });
    }
    
    // Check if name is unique (if changing name)
    if (trimmedName) {
      const existing = await q(`SELECT id FROM leave_types WHERE name = $1 AND id != $2`, [trimmedName, leaveTypeId]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Leave type name already exists' });
      }
    }
    
    // Update leave type
    const result = await q(`
      UPDATE leave_types 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        default_annual_entitlement = COALESCE($3, default_annual_entitlement),
        is_paid = COALESCE($4, is_paid),
        requires_approval = COALESCE($5, requires_approval),
        color = COALESCE($6, color)
      WHERE id = $7
      RETURNING *
    `, [
      trimmedName,
      description !== undefined ? description : null,
      default_annual_entitlement !== undefined ? default_annual_entitlement : null,
      is_paid !== undefined ? is_paid : null,
      requires_approval !== undefined ? requires_approval : null,
      color || null,
      leaveTypeId
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating leave type:', error);
    res.status(500).json({ error: 'Failed to update leave type' });
  }
});

// DELETE /api/leave/types/:id - Delete leave type (manager/admin only)
r.delete("/types/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    
    if (isNaN(leaveTypeId)) {
      return res.status(400).json({ error: 'Invalid leave type ID' });
    }
    
    // Check if any leave requests use this leave type
    const requestsCheck = await q(`
      SELECT COUNT(*) as count 
      FROM leave_requests 
      WHERE leave_type_id = $1
    `, [leaveTypeId]);
    
    const requestsCount = parseInt(requestsCheck.rows[0].count, 10);
    
    // Check if any leave balances use this leave type
    const balancesCheck = await q(`
      SELECT COUNT(*) as count 
      FROM leave_balances 
      WHERE leave_type_id = $1
    `, [leaveTypeId]);
    
    const balancesCount = parseInt(balancesCheck.rows[0].count, 10);
    
    if (requestsCount > 0 || balancesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete leave type that is in use',
        requestsCount,
        balancesCount
      });
    }
    
    // Check if leave type exists
    const deptCheck = await q(`SELECT id FROM leave_types WHERE id = $1`, [leaveTypeId]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }
    
    // Delete leave type
    await q(`DELETE FROM leave_types WHERE id = $1`, [leaveTypeId]);
    
    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    res.status(500).json({ error: 'Failed to delete leave type' });
  }
});

// ========== HOLIDAYS ENDPOINTS ==========

// GET /api/leave/holidays - Get all holidays
r.get("/holidays", async (_req, res) => {
  try {
    const { rows } = await q(`
      SELECT * FROM leave_calendar 
      WHERE is_holiday = true 
      ORDER BY date
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/leave/holidays - Add holiday (manager/admin only)
r.post("/holidays", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { date, description, is_company_closure } = req.body;
    
    // Validation
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Holiday description is required' });
    }
    
    const trimmedDescription = description.trim();
    
    if (trimmedDescription.length > 200) {
      return res.status(400).json({ error: 'Description must be 200 characters or less' });
    }
    
    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Check if holiday already exists for this date
    const existing = await q(`SELECT id FROM leave_calendar WHERE date = $1`, [date]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A holiday or event already exists for this date' });
    }
    
    // Insert new holiday
    const result = await q(`
      INSERT INTO leave_calendar (date, description, is_holiday, is_company_closure) 
      VALUES ($1, $2, true, $3) 
      RETURNING *
    `, [date, trimmedDescription, is_company_closure !== undefined ? is_company_closure : true]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// DELETE /api/leave/holidays/:id - Delete holiday (manager/admin only)
r.delete("/holidays/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const holidayId = parseInt(req.params.id, 10);
    
    if (isNaN(holidayId)) {
      return res.status(400).json({ error: 'Invalid holiday ID' });
    }
    
    // Check if holiday exists
    const holidayCheck = await q(`SELECT id FROM leave_calendar WHERE id = $1 AND is_holiday = true`, [holidayId]);
    if (holidayCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    // Delete holiday
    await q(`DELETE FROM leave_calendar WHERE id = $1`, [holidayId]);
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

// Update calendar endpoint to include holidays
r.get("/calendar", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Use current year if no dates provided
    const currentYear = new Date().getFullYear();
    const defaultStart = `${currentYear}-01-01`;
    const defaultEnd = `${currentYear}-12-31`;
    
    const startDate = start_date || defaultStart;
    const endDate = end_date || defaultEnd;
    
    // Get approved leave requests
    let leaveQuery = `
      SELECT lr.*, e.first_name, e.last_name, lt.name as leave_type_name, lt.color,
             'leave_request' as type
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'Approved'
      AND (lr.start_date <= $2 AND lr.end_date >= $1)
    `;
    
    const params = [startDate, endDate];
    
    // RBAC: Users can only see their own leave on calendar
    if (req.userScope === 'own' && req.employeeId) {
      leaveQuery += ` AND lr.employee_id = $3`;
      params.push(req.employeeId);
      console.log(`🔒 [RBAC] Filtering calendar for employee ${req.employeeId}`);
    }
    
    leaveQuery += ` ORDER BY lr.start_date`;
    
    // Get holidays
    const holidaysQuery = `
      SELECT id, date, description, is_holiday, is_company_closure,
             NULL as employee_id, NULL as first_name, NULL as last_name,
             NULL as leave_type_name, NULL as color,
             'holiday' as type
      FROM leave_calendar
      WHERE is_holiday = true
      AND date >= $1 AND date <= $2
      ORDER BY date
    `;
    
    const [leaveRows, holidayRows] = await Promise.all([
      q(leaveQuery, params),
      q(holidaysQuery, [startDate, endDate])
    ]);
    
    // Combine results
    const allEvents = [...leaveRows.rows, ...holidayRows.rows];
    
    // Sort by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.date || a.start_date);
      const dateB = new Date(b.date || b.start_date);
      return dateA - dateB;
    });
    
    res.json(allEvents);
  } catch (error) {
    console.error('Error getting leave calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

export default r;
