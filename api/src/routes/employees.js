import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { applyScopeFilter, requireRole, ROLES } from "../middleware/rbac.js";
import { requireAuth } from "../session.js";

const r = Router();

// Apply RBAC scope filtering to all employee routes
r.use(applyScopeFilter);

r.get("/", async (req, res) => {
  let query = `SELECT e.*, 
     e.first_name || ' ' || e.last_name AS name,
     d.name AS department, 
     l.name AS location,
     jt.name AS job_title_name,
     bp.name AS benefits_package_name,
     ws.name AS work_schedule_name,
     op.name AS overtime_policy_name,
     ap.name AS attendance_policy_name,
     rwp.name AS remote_work_policy_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN locations l ON l.id = e.location_id
     LEFT JOIN job_titles jt ON jt.id = e.job_title_id
     LEFT JOIN benefits_packages bp ON bp.id = e.benefits_package_id
     LEFT JOIN work_schedules ws ON ws.id = e.work_schedule_id
     LEFT JOIN overtime_policies op ON op.id = e.overtime_policy_id
     LEFT JOIN attendance_policies ap ON ap.id = e.attendance_policy_id
     LEFT JOIN remote_work_policies rwp ON rwp.id = e.remote_work_policy_id
     WHERE e.status <> 'Terminated'`;
  
  const params = [];
  
  // RBAC: Users can only see themselves as an employee
  if (req.userScope === 'own' && req.employeeId) {
    params.push(req.employeeId);
    query += ` AND e.id = $${params.length}`;
    console.log(`🔒 [RBAC] Filtering employees for employee ${req.employeeId}`);
  }
  
  query += ` ORDER BY e.first_name, e.last_name`;
  
  const { rows } = await q(query, params);
  res.json(rows);
});

r.get("/terminated", async (_req, res) => {
  const { rows } = await q(
    `SELECT e.*, 
     e.first_name || ' ' || e.last_name AS name,
     d.name AS department, 
     l.name AS location,
     jt.name AS job_title_name,
     bp.name AS benefits_package_name,
     ws.name AS work_schedule_name,
     op.name AS overtime_policy_name,
     ap.name AS attendance_policy_name,
     rwp.name AS remote_work_policy_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN locations l ON l.id = e.location_id
     LEFT JOIN job_titles jt ON jt.id = e.job_title_id
     LEFT JOIN benefits_packages bp ON bp.id = e.benefits_package_id
     LEFT JOIN work_schedules ws ON ws.id = e.work_schedule_id
     LEFT JOIN overtime_policies op ON op.id = e.overtime_policy_id
     LEFT JOIN attendance_policies ap ON ap.id = e.attendance_policy_id
     LEFT JOIN remote_work_policies rwp ON rwp.id = e.remote_work_policy_id
     WHERE e.status = 'Terminated'
     ORDER BY e.termination_date DESC NULLS LAST, e.first_name, e.last_name`
  );
  res.json(rows);
});

r.get("/departments", async (_req, res) => {
  const { rows } = await q(`SELECT * FROM departments ORDER BY name`);
  res.json(rows);
});

// POST /api/employees/departments - Create new department (manager/admin only)
r.post("/departments", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Department name must be 100 characters or less' });
    }
    
    // Check if department already exists
    const existing = await q(`SELECT id FROM departments WHERE name = $1`, [trimmedName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Department already exists' });
    }
    
    // Insert new department
    const result = await q(`
      INSERT INTO departments (name) 
      VALUES ($1) 
      RETURNING *
    `, [trimmedName]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// DELETE /api/employees/departments/:id - Delete department (manager/admin only)
r.delete("/departments/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id, 10);
    
    if (isNaN(departmentId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }
    
    // Check if any employees are assigned to this department
    const employeesCheck = await q(`
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE department_id = $1
    `, [departmentId]);
    
    const employeeCount = parseInt(employeesCheck.rows[0].count, 10);
    
    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned employees',
        employeeCount 
      });
    }
    
    // Check if department exists
    const deptCheck = await q(`SELECT id FROM departments WHERE id = $1`, [departmentId]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Delete department
    await q(`DELETE FROM departments WHERE id = $1`, [departmentId]);
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

r.get("/locations", async (req, res) => {
  // Support ?all=true query param to get all locations (for management)
  const all = req.query.all === 'true';
  const query = all 
    ? `SELECT * FROM locations ORDER BY is_active DESC, name`
    : `SELECT * FROM locations WHERE is_active = true ORDER BY name`;
  const { rows } = await q(query);
  res.json(rows);
});

// POST /api/employees/locations - Create new location (manager/admin only)
r.post("/locations", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { name, region, is_active } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Location name must be 100 characters or less' });
    }
    
    // Check if location already exists
    const existing = await q(`SELECT id FROM locations WHERE name = $1`, [trimmedName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Location already exists' });
    }
    
    // Insert new location
    const result = await q(`
      INSERT INTO locations (name, region, is_active) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [
      trimmedName,
      region && typeof region === 'string' ? region.trim() : null,
      is_active !== undefined ? Boolean(is_active) : true
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating location:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Location already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// PUT /api/employees/locations/:id - Update location (manager/admin only)
r.put("/locations/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const locationId = parseInt(req.params.id, 10);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const { name, region, is_active } = req.body;
    
    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Location name cannot be empty' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Location name must be 100 characters or less' });
      }
    }
    
    // Check if location exists
    const existing = await q(`SELECT id FROM locations WHERE id = $1`, [locationId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if new name conflicts with another location
    if (name !== undefined) {
      const trimmedName = name.trim();
      const conflict = await q(`SELECT id FROM locations WHERE name = $1 AND id != $2`, [trimmedName, locationId]);
      if (conflict.rows.length > 0) {
        return res.status(409).json({ error: 'Location name already exists' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (region !== undefined) {
      updates.push(`region = $${paramCount++}`);
      values.push(region && typeof region === 'string' ? region.trim() : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(Boolean(is_active));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(locationId);
    
    const result = await q(`
      UPDATE locations 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Location name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE /api/employees/locations/:id - Delete location (manager/admin only)
r.delete("/locations/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const locationId = parseInt(req.params.id, 10);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    // Check if location exists
    const locationCheck = await q(`SELECT id FROM locations WHERE id = $1`, [locationId]);
    if (locationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Check if any employees are assigned to this location
    const employeeCount = await q(`
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE location_id = $1
    `, [locationId]);
    
    const count = parseInt(employeeCount.rows[0].count, 10);
    if (count > 0) {
      return res.status(409).json({ 
        error: `Cannot delete location: ${count} employee(s) assigned. Please reassign employees first.`,
        employee_count: count
      });
    }
    
    // Delete the location
    await q(`DELETE FROM locations WHERE id = $1`, [locationId]);
    
    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// GET /api/employees/locations/:id/employees - Get employees assigned to location
r.get("/locations/:id/employees", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const locationId = parseInt(req.params.id, 10);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const { rows } = await q(`
      SELECT id, first_name, last_name, email, status
      FROM employees
      WHERE location_id = $1
      ORDER BY first_name, last_name
    `, [locationId]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching location employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

r.get("/time-entries", async (_req, res) => {
  const { rows } = await q(
    `SELECT * FROM time_entries ORDER BY work_date DESC, employee_id`
  );
  res.json(rows);
});

// Strict YYYY-MM-DD date validator (required)
const dateStringRequired = z.string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// Optional date: accepts null/undefined, rejects "", validates YYYY-MM-DD when provided
const dateStringOptional = z
  .union([
    z.null(),
    z.undefined(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  ])
  .transform(val => (val === '' || val === undefined) ? null : val)
  .refine(val => val === null || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format or null'
  });

const employeeSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  work_email: z.string().email(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birth_date: dateStringOptional,
  hire_date: dateStringRequired,
  employment_type: z.enum(["Full-time","Part-time","Contract"]),
  department_id: z.number().int().nullable().optional(),
  location_id: z.number().int().nullable().optional(),
  role_title: z.string().nullable().optional(),
  probation_end: dateStringOptional,
  hourly_rate: z.number().min(0).optional(),
  // Settings foreign keys
  job_title_id: z.number().int().nullable().optional(),
  benefits_package_id: z.number().int().nullable().optional(),
  work_schedule_id: z.number().int().nullable().optional(),
  overtime_policy_id: z.number().int().nullable().optional(),
  attendance_policy_id: z.number().int().nullable().optional(),
  remote_work_policy_id: z.number().int().nullable().optional(),
  // Personal details from onboarding
  full_address: z.string().nullable().optional(),
  sin_number: z.string().nullable().optional(),
  sin_expiry_date: dateStringOptional,
  bank_name: z.string().nullable().optional(),
  bank_account_number: z.string().nullable().optional(),
  bank_transit_number: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  // Nicknames for matching (up to 3)
  nickname: z.string().nullable().optional(),
  nickname_2: z.string().nullable().optional(),
  nickname_3: z.string().nullable().optional(),
  // Sales commission config (Sales dept only)
  sales_role: z.enum(['agent', 'manager']).nullable().optional(),
  sales_commission_enabled: z.boolean().nullable().optional(),
  sales_manager_fixed_pct: z.number().nullable().optional()
});

/**
 * Parse nickname conflict error from PostgreSQL trigger
 * Returns user-friendly error message or null if not a nickname error
 */
function parseNicknameConflictError(error) {
  if (error.code === '23505' || (error.message && error.message.includes('NICKNAME_'))) {
    const msg = error.message || '';
    
    if (msg.includes('NICKNAME_DUPLICATE_SELF')) {
      return 'Cannot use the same nickname in multiple fields';
    }
    
    if (msg.includes('NICKNAME_CONFLICT')) {
      // Extract details from: NICKNAME_CONFLICT: Nickname "Sam" (normalized: "sam") is already used by employee 602 (Sam Lopka)
      const match = msg.match(/Nickname "([^"]+)".*already used by employee \d+ \(([^)]+)\)/);
      if (match) {
        return `Nickname "${match[1]}" is already used by ${match[2]}`;
      }
      return 'This nickname is already used by another employee';
    }
  }
  return null;
}

r.post("/", async (req, res) => {
  // Parse and validate input with Zod
  const parseResult = employeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    console.error('❌ [API] Validation failed:', fieldErrors);
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: fieldErrors 
    });
  }
  
  try {
    const data = parseResult.data;
    
    // Validate foreign keys exist if provided
    if (data.job_title_id) {
      const check = await q('SELECT id FROM job_titles WHERE id = $1', [data.job_title_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid job_title_id' });
      }
    }
    if (data.benefits_package_id) {
      const check = await q('SELECT id FROM benefits_packages WHERE id = $1', [data.benefits_package_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid benefits_package_id' });
      }
    }
    if (data.work_schedule_id) {
      const check = await q('SELECT id FROM work_schedules WHERE id = $1', [data.work_schedule_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid work_schedule_id' });
      }
    }
    if (data.overtime_policy_id) {
      const check = await q('SELECT id FROM overtime_policies WHERE id = $1', [data.overtime_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid overtime_policy_id' });
      }
    }
    if (data.attendance_policy_id) {
      const check = await q('SELECT id FROM attendance_policies WHERE id = $1', [data.attendance_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid attendance_policy_id' });
      }
    }
    if (data.remote_work_policy_id) {
      const check = await q('SELECT id FROM remote_work_policies WHERE id = $1', [data.remote_work_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid remote_work_policy_id' });
      }
    }
    
    // Helper function to convert empty strings to null
    const nullIfEmpty = (value) => (value === '' || value === undefined) ? null : value;
    
    const { rows } = await q(
      `INSERT INTO employees
       (first_name,last_name,work_email,email,phone,gender,birth_date,hire_date,employment_type,department_id,location_id,role_title,probation_end,hourly_rate,job_title_id,benefits_package_id,work_schedule_id,overtime_policy_id,attendance_policy_id,remote_work_policy_id,full_address,sin_number,sin_expiry_date,bank_name,bank_account_number,bank_transit_number,emergency_contact_name,emergency_contact_phone,nickname,nickname_2,nickname_3)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
       RETURNING *`,
      [
        data.first_name, data.last_name, data.work_email, data.email ?? null,
        data.phone ?? null, data.gender ?? null, data.birth_date ?? null, data.hire_date,
        data.employment_type, data.department_id ?? null, data.location_id ?? null,
        data.role_title ?? null, data.probation_end ?? null, data.hourly_rate ?? 25,
        data.job_title_id ?? null, data.benefits_package_id ?? null, data.work_schedule_id ?? null,
        data.overtime_policy_id ?? null, data.attendance_policy_id ?? null, data.remote_work_policy_id ?? null,
        data.full_address ?? null, data.sin_number ?? null, data.sin_expiry_date ?? null,
        data.bank_name ?? null, data.bank_account_number ?? null, data.bank_transit_number ?? null,
        data.emergency_contact_name ?? null, data.emergency_contact_phone ?? null,
        nullIfEmpty(data.nickname), nullIfEmpty(data.nickname_2), nullIfEmpty(data.nickname_3)
      ]
    );
    console.log('✅ [API] Employee created:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('❌ [API] Error creating employee:', error);
    
    // Check for nickname conflict error
    const nicknameError = parseNicknameConflictError(error);
    if (nicknameError) {
      return res.status(409).json({ error: nicknameError, code: 'NICKNAME_CONFLICT' });
    }
    
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
});

r.delete("/:id", requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  await q(`UPDATE employees SET status='Terminated', termination_date=CURRENT_DATE, termination_reason='Terminated via HR system' WHERE id=$1`, [req.params.id]);
  res.sendStatus(204);
});

// Update employee
r.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  // Helper function to convert empty strings to null
  const nullIfEmpty = (value) => (value === '' || value === undefined) ? null : value;
  
  // Helper to trim nicknames (preserve spaces within but not leading/trailing)
  const trimNickname = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  };
  
  try {
    // First, get the existing employee to preserve required fields if not provided
    const existingResult = await q(`SELECT * FROM employees WHERE id = $1`, [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const existing = existingResult.rows[0];
    
    // Validate foreign keys exist if provided
    if (data.job_title_id !== undefined && data.job_title_id !== null) {
      const check = await q('SELECT id FROM job_titles WHERE id = $1', [data.job_title_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid job_title_id' });
      }
    }
    if (data.benefits_package_id !== undefined && data.benefits_package_id !== null) {
      const check = await q('SELECT id FROM benefits_packages WHERE id = $1', [data.benefits_package_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid benefits_package_id' });
      }
    }
    if (data.work_schedule_id !== undefined && data.work_schedule_id !== null) {
      const check = await q('SELECT id FROM work_schedules WHERE id = $1', [data.work_schedule_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid work_schedule_id' });
      }
    }
    if (data.overtime_policy_id !== undefined && data.overtime_policy_id !== null) {
      const check = await q('SELECT id FROM overtime_policies WHERE id = $1', [data.overtime_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid overtime_policy_id' });
      }
    }
    if (data.attendance_policy_id !== undefined && data.attendance_policy_id !== null) {
      const check = await q('SELECT id FROM attendance_policies WHERE id = $1', [data.attendance_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid attendance_policy_id' });
      }
    }
    if (data.remote_work_policy_id !== undefined && data.remote_work_policy_id !== null) {
      const check = await q('SELECT id FROM remote_work_policies WHERE id = $1', [data.remote_work_policy_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid remote_work_policy_id' });
      }
    }
    
    // Restrict hourly_rate and department_id updates for user role
    if (req.userRole === 'user') {
      console.log('🔒 [EMPLOYEES] User role cannot update hourly_rate or department_id - preserving existing values');
    }
    
    // Merge with existing data, preferring new data when provided
    const mergedData = {
      first_name: data.first_name || existing.first_name,
      last_name: data.last_name || existing.last_name,
      work_email: data.work_email || existing.work_email, // Preserve existing if not provided
      email: data.email !== undefined ? (data.email || null) : existing.email,
      phone: data.phone !== undefined ? (data.phone || null) : existing.phone,
      role_title: data.role_title !== undefined ? (data.role_title || null) : existing.role_title,
      hourly_rate: req.userRole === 'user' ? existing.hourly_rate : (data.hourly_rate !== undefined ? (data.hourly_rate || 25) : (existing.hourly_rate || 25)),
      employment_type: data.employment_type || existing.employment_type,
      department_id: req.userRole === 'user' ? existing.department_id : (data.department_id !== undefined ? (data.department_id || null) : existing.department_id),
      location_id: data.location_id !== undefined ? (data.location_id || null) : existing.location_id,
      hire_date: data.hire_date || existing.hire_date,
      gender: data.gender !== undefined ? (data.gender || null) : existing.gender,
      birth_date: data.birth_date !== undefined ? (data.birth_date || null) : existing.birth_date,
      status: data.status || existing.status,
      probation_end: data.probation_end !== undefined ? (data.probation_end || null) : existing.probation_end,
      job_title_id: data.job_title_id !== undefined ? (data.job_title_id || null) : existing.job_title_id,
      benefits_package_id: data.benefits_package_id !== undefined ? (data.benefits_package_id || null) : existing.benefits_package_id,
      work_schedule_id: data.work_schedule_id !== undefined ? (data.work_schedule_id || null) : existing.work_schedule_id,
      overtime_policy_id: data.overtime_policy_id !== undefined ? (data.overtime_policy_id || null) : existing.overtime_policy_id,
      attendance_policy_id: data.attendance_policy_id !== undefined ? (data.attendance_policy_id || null) : existing.attendance_policy_id,
      remote_work_policy_id: data.remote_work_policy_id !== undefined ? (data.remote_work_policy_id || null) : existing.remote_work_policy_id,
      full_address: data.full_address !== undefined ? (data.full_address || null) : existing.full_address,
      emergency_contact_name: data.emergency_contact_name !== undefined ? (data.emergency_contact_name || null) : existing.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone !== undefined ? (data.emergency_contact_phone || null) : existing.emergency_contact_phone,
      sin_number: data.sin_number !== undefined ? (data.sin_number || null) : existing.sin_number,
      sin_expiry_date: data.sin_expiry_date !== undefined ? (data.sin_expiry_date || null) : existing.sin_expiry_date,
      bank_name: data.bank_name !== undefined ? (data.bank_name || null) : existing.bank_name,
      bank_transit_number: data.bank_transit_number !== undefined ? (data.bank_transit_number || null) : existing.bank_transit_number,
      bank_account_number: data.bank_account_number !== undefined ? (data.bank_account_number || null) : existing.bank_account_number,
      contract_status: data.contract_status !== undefined ? (data.contract_status || null) : existing.contract_status,
      contract_signed_date: data.contract_signed_date !== undefined ? (data.contract_signed_date || null) : existing.contract_signed_date,
      gift_card_sent: data.gift_card_sent !== undefined ? data.gift_card_sent : (existing.gift_card_sent || false),
      nickname: data.nickname !== undefined ? trimNickname(data.nickname) : existing.nickname,
      nickname_2: data.nickname_2 !== undefined ? trimNickname(data.nickname_2) : existing.nickname_2,
      nickname_3: data.nickname_3 !== undefined ? trimNickname(data.nickname_3) : existing.nickname_3,
      // Sales commission config (restricted to manager/admin roles)
      sales_role: req.userRole === 'user' ? existing.sales_role : (data.sales_role !== undefined ? nullIfEmpty(data.sales_role) : existing.sales_role),
      sales_commission_enabled: req.userRole === 'user' ? existing.sales_commission_enabled : (data.sales_commission_enabled !== undefined ? (data.sales_commission_enabled ?? false) : (existing.sales_commission_enabled ?? false)),
      sales_manager_fixed_pct: req.userRole === 'user' ? existing.sales_manager_fixed_pct : (data.sales_manager_fixed_pct !== undefined ? (data.sales_manager_fixed_pct || null) : existing.sales_manager_fixed_pct)
    };
    
    const { rows } = await q(
      `UPDATE employees 
       SET first_name = $1, last_name = $2, email = $3, work_email = $4, phone = $5, 
           role_title = $6, hourly_rate = $7, employment_type = $8,
           department_id = $9, location_id = $10, hire_date = $11,
           gender = $12, birth_date = $13, status = $14, probation_end = $15,
           job_title_id = $16, benefits_package_id = $17, work_schedule_id = $18,
           overtime_policy_id = $19, attendance_policy_id = $20, remote_work_policy_id = $21,
           full_address = $22, emergency_contact_name = $23, emergency_contact_phone = $24,
           sin_number = $25, sin_expiry_date = $26, bank_name = $27,
           bank_transit_number = $28, bank_account_number = $29,
           contract_status = $30, contract_signed_date = $31, gift_card_sent = $32,
           nickname = $33, nickname_2 = $34, nickname_3 = $35,
           sales_role = $36, sales_commission_enabled = $37, sales_manager_fixed_pct = $38
       WHERE id = $39
       RETURNING *`,
      [
        mergedData.first_name,
        mergedData.last_name,
        mergedData.email,
        mergedData.work_email,
        mergedData.phone,
        mergedData.role_title,
        mergedData.hourly_rate,
        mergedData.employment_type,
        mergedData.department_id,
        mergedData.location_id,
        mergedData.hire_date,
        mergedData.gender,
        mergedData.birth_date,
        mergedData.status,
        mergedData.probation_end,
        mergedData.job_title_id,
        mergedData.benefits_package_id,
        mergedData.work_schedule_id,
        mergedData.overtime_policy_id,
        mergedData.attendance_policy_id,
        mergedData.remote_work_policy_id,
        mergedData.full_address,
        mergedData.emergency_contact_name,
        mergedData.emergency_contact_phone,
        mergedData.sin_number,
        mergedData.sin_expiry_date,
        mergedData.bank_name,
        mergedData.bank_transit_number,
        mergedData.bank_account_number,
        mergedData.contract_status,
        mergedData.contract_signed_date,
        mergedData.gift_card_sent,
        mergedData.nickname,
        mergedData.nickname_2,
        mergedData.nickname_3,
        mergedData.sales_role,
        mergedData.sales_commission_enabled,
        mergedData.sales_manager_fixed_pct,
        id
      ]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating employee:", error);
    console.error("Error details:", error.message);
    
    // Check for nickname conflict error
    const nicknameError = parseNicknameConflictError(error);
    if (nicknameError) {
      return res.status(409).json({ error: nicknameError, code: 'NICKNAME_CONFLICT' });
    }
    
    res.status(500).json({ error: "Failed to update employee", details: error.message });
  }
});

// Get single employee with department and location info
r.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT e.*, d.name as department_name, l.name as location_name,
              COALESCE(e.hourly_rate, comp.regular_rate) AS hourly_rate,
              jt.name AS job_title_name,
              bp.name AS benefits_package_name,
              ws.name AS work_schedule_name,
              op.name AS overtime_policy_name,
              ap.name AS attendance_policy_name,
              rwp.name AS remote_work_policy_name
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       LEFT JOIN locations l ON e.location_id = l.id 
       LEFT JOIN job_titles jt ON jt.id = e.job_title_id
       LEFT JOIN benefits_packages bp ON bp.id = e.benefits_package_id
       LEFT JOIN work_schedules ws ON ws.id = e.work_schedule_id
       LEFT JOIN overtime_policies op ON op.id = e.overtime_policy_id
       LEFT JOIN attendance_policies ap ON ap.id = e.attendance_policy_id
       LEFT JOIN remote_work_policies rwp ON rwp.id = e.remote_work_policy_id
       LEFT JOIN LATERAL (
         SELECT regular_rate
         FROM employee_compensation ec
         WHERE ec.employee_id = e.id
         ORDER BY ec.effective_date DESC, ec.id DESC
         LIMIT 1
       ) comp ON TRUE
       WHERE e.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
  }
});

// Get employee time entries (from BOTH old time_entries AND new timecard_entries)
r.get("/:id/time-entries", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT 
         te.id,
         te.employee_id,
         te.work_date,
         te.clock_in::text as clock_in,
         te.clock_out::text as clock_out,
         te.hours_worked,
         te.overtime_hours,
         te.was_late,
         NULL as notes,
         'old' as source
       FROM time_entries te
       WHERE te.employee_id = $1
       
       UNION ALL
       
       SELECT 
         tce.id,
         tc.employee_id,
         tce.work_date,
         tce.clock_in::text as clock_in,
         tce.clock_out::text as clock_out,
         tce.hours_worked,
         0 as overtime_hours,
         false as was_late,
         tce.notes,
         'timecard' as source
       FROM timecard_entries tce
       JOIN timecards tc ON tce.timecard_id = tc.id
       WHERE tc.employee_id = $1
       
       ORDER BY work_date ASC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries', details: error.message });
  }
});

// Get employee documents
r.get("/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 [API] Fetching documents for employee ${id}`);
    const { rows } = await q(
      `SELECT id, employee_id, doc_type, file_name, uploaded_on, signed, 
              file_url, file_size, mime_type, document_category, notes,
              CASE WHEN file_data IS NOT NULL THEN true ELSE false END as has_file_data
       FROM documents 
       WHERE employee_id = $1 
       ORDER BY uploaded_on DESC`,
      [id]
    );
    console.log(`✅ [API] Found ${rows.length} documents for employee ${id}`);
    console.log(`📋 [API] Document details:`, rows.map(r => ({
      id: r.id,
      doc_type: r.doc_type,
      file_name: r.file_name,
      has_file_data: r.has_file_data,
      file_url: r.file_url ? 'Present' : 'None'
    })));
    res.json(rows);
  } catch (error) {
    console.error('❌ [API] Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Upload new document for employee
r.post("/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, file_name, file_data_base64, mime_type, notes, document_category, signed } = req.body;
    
    console.log(`📤 [API] Upload request for employee ${id}:`, {
      doc_type,
      file_name,
      mime_type,
      document_category,
      signed,
      base64_length: file_data_base64?.length || 0,
      has_notes: !!notes
    });
    
    // Validate required fields
    if (!doc_type || !file_name || !file_data_base64) {
      console.error(`❌ [API] Missing required fields for upload`);
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'doc_type, file_name, and file_data_base64 are required' 
      });
    }
    
    console.log(`🔄 [API] Converting base64 to buffer...`);
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file_data_base64, 'base64');
    console.log(`✅ [API] Buffer created, size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    console.log(`💾 [API] Inserting into database...`);
    // Insert document
    const { rows } = await q(
      `INSERT INTO documents (
        employee_id, doc_type, file_name, file_data, file_size, mime_type,
        document_category, notes, signed, uploaded_on, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      RETURNING id, employee_id, doc_type, file_name, uploaded_on, signed, 
                file_size, mime_type, document_category, notes`,
      [
        id,
        doc_type,
        file_name,
        fileBuffer,
        fileBuffer.length,
        mime_type || 'application/octet-stream',
        document_category || 'Other',
        notes || null,
        signed || false,
        req.user?.id || null
      ]
    );
    
    console.log(`✅ [API] Document uploaded successfully:`, {
      document_id: rows[0].id,
      employee_id: id,
      file_name,
      file_size: rows[0].file_size,
      doc_type,
      category: rows[0].document_category
    });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('❌ [API] Error uploading document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Download specific document
r.get("/:id/documents/:docId/download", async (req, res) => {
  try {
    const { id, docId } = req.params;
    
    console.log(`📥 [API] Download request for document ${docId} of employee ${id}`);
    
    const { rows } = await q(
      `SELECT file_data, file_name, mime_type, file_url
       FROM documents 
       WHERE id = $1 AND employee_id = $2`,
      [docId, id]
    );
    
    if (rows.length === 0) {
      console.error(`❌ [API] Document not found: ${docId}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const doc = rows[0];
    
    console.log(`📄 [API] Document found:`, {
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      has_file_data: !!doc.file_data,
      has_file_url: !!doc.file_url,
      file_size: doc.file_data?.length || 0
    });
    
    // If we have file data, serve it
    if (doc.file_data) {
      console.log(`✅ [API] Serving file data, size: ${doc.file_data.length} bytes`);
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
      res.send(doc.file_data);
    } 
    // If we only have a URL, redirect to it
    else if (doc.file_url) {
      console.log(`🔗 [API] Returning external URL`);
      res.json({ 
        message: 'Document is stored externally',
        url: doc.file_url,
        file_name: doc.file_name 
      });
    } 
    else {
      console.error(`❌ [API] Document has neither file_data nor file_url`);
      res.status(404).json({ error: 'Document file not available' });
    }
  } catch (error) {
    console.error('❌ [API] Error downloading document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to download document', details: error.message });
  }
});

// Delete document
r.delete("/:id/documents/:docId", async (req, res) => {
  try {
    const { id, docId } = req.params;
    
    console.log(`🗑️ [API] Delete request for document ${docId} of employee ${id}`);
    
    const { rowCount } = await q(
      `DELETE FROM documents WHERE id = $1 AND employee_id = $2`,
      [docId, id]
    );
    
    if (rowCount === 0) {
      console.error(`❌ [API] Document not found for deletion: ${docId}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`✅ [API] Document deleted successfully: ${docId}`);
    res.sendStatus(204);
  } catch (error) {
    console.error('❌ [API] Error deleting document:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// Get employee training records
r.get("/:id/training-records", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT tr.*, t.name as training_name, t.validity_months 
       FROM training_records tr 
       JOIN trainings t ON tr.training_id = t.id 
       WHERE tr.employee_id = $1 ORDER BY tr.completed_on DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).json({ error: 'Failed to fetch training records', details: error.message });
  }
});

// Get employee payroll history (from payroll_calculations + payroll_periods)
r.get("/:id/payroll-history", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT 
         pc.id,
         pp.start_date AS pay_period_start,
         pp.end_date AS pay_period_end,
         pc.base_hours + COALESCE(pc.overtime_hours,0) AS total_hours,
         pc.regular_rate AS hourly_rate,
         pc.total_gross AS gross_pay,
         pc.deductions AS total_deductions,
         pc.net_pay AS net_pay,
         pc.commission_amount,
         pc.bonus_amount,
         pc.status
       FROM payroll_calculations pc
       JOIN payroll_periods pp ON pp.id = pc.period_id
       WHERE pc.employee_id = $1
       ORDER BY pp.start_date DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ error: 'Failed to fetch payroll history', details: error.message });
  }
});

// Get extended HR details
r.get("/:id/hr-details", async (req, res) => {
  const { id } = req.params;
  try {
    const [addresses, contacts, banks, identifiers, compensation, statusHistory] = await Promise.all([
      q(`SELECT * FROM employee_addresses WHERE employee_id=$1 ORDER BY effective_from DESC NULLS LAST, id DESC`, [id]),
      q(`SELECT * FROM employee_emergency_contacts WHERE employee_id=$1 ORDER BY is_primary DESC, id DESC`, [id]),
      q(`SELECT * FROM employee_bank_accounts WHERE employee_id=$1 ORDER BY is_primary DESC, effective_date DESC NULLS LAST, id DESC`, [id]),
      q(`SELECT * FROM employee_identifiers WHERE employee_id=$1 ORDER BY id_type`, [id]),
      q(`SELECT * FROM employee_compensation WHERE employee_id=$1 ORDER BY effective_date DESC, id DESC`, [id]),
      q(`SELECT * FROM employee_status_history WHERE employee_id=$1 ORDER BY status_date DESC, id DESC`, [id])
    ]);
    res.json({
      addresses: addresses.rows,
      emergency_contacts: contacts.rows,
      bank_accounts: banks.rows,
      identifiers: identifiers.rows,
      compensation_history: compensation.rows,
      status_history: statusHistory.rows
    });
  } catch (e) {
    console.error("hr-details error", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
