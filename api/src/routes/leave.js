import { Router } from "express";
import { q } from "../db.js";
import { z } from "zod";
import { applyScopeFilter, requireRole, ROLES } from "../middleware/rbac.js";
import { requireAuth } from "../session.js";
import { notificationService } from "../services/notifications.js";
import { calculateScheduledWorkdays, previewLeaveWorkdays } from "../utils/workdayCalculator.js";

const r = Router();

// Map leave type names to match leaves table constraint
const LEAVE_TYPE_MAP = {
  'Vacation': 'Vacation',
  'Sick Leave': 'Sick',
  'Personal Leave': 'Other',
  'Bereavement': 'Bereavement',
  'Parental Leave': 'Parental',
  'Jury Duty': 'Other',
  'Military Leave': 'Other'
};

/**
 * Update leave balances for an approved leave request, allocating days per year
 * @param {number} employeeId 
 * @param {number} leaveTypeId 
 * @param {Record<number, number>} workdaysByYear - { year: days }
 * @param {'add'|'subtract'} operation 
 */
async function updateBalancesByYear(employeeId, leaveTypeId, workdaysByYear, operation = 'add') {
  for (const [yearStr, days] of Object.entries(workdaysByYear)) {
    const year = parseInt(yearStr, 10);
    if (days <= 0) continue;
    
    if (operation === 'add') {
      await q(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
        VALUES ($1, $2, $3, 
                (SELECT default_annual_entitlement FROM leave_types WHERE id = $2), 
                $4, 0)
        ON CONFLICT (employee_id, leave_type_id, year)
        DO UPDATE SET used_days = leave_balances.used_days + $4
      `, [employeeId, leaveTypeId, year, days]);
    } else {
      await q(`
        UPDATE leave_balances
        SET used_days = GREATEST(0, used_days - $1)
        WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
      `, [days, employeeId, leaveTypeId, year]);
    }
  }
}

/**
 * Create or delete leaves table record for backwards compatibility
 */
async function syncLeavesTable(employeeId, leaveTypeId, startDate, endDate, notes, operation = 'add') {
  const leaveTypeName = (await q('SELECT name FROM leave_types WHERE id = $1', [leaveTypeId])).rows[0]?.name || 'Other';
  const mappedLeaveType = LEAVE_TYPE_MAP[leaveTypeName] || 'Other';
  
  if (operation === 'add') {
    await q(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, approved_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [employeeId, mappedLeaveType, startDate, endDate, 'HR', notes || null]);
  } else {
    await q(`
      DELETE FROM leaves 
      WHERE employee_id = $1 AND start_date = $2 AND end_date = $3
    `, [employeeId, startDate, endDate]);
  }
}

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

// Helper function to calculate accrued days based on policy
function calculateAccruedDays(hireDate, accrualRate, accrualFrequency, currentDate = new Date()) {
  if (!hireDate || !accrualRate || accrualRate === 0) return 0;
  
  const hire = new Date(hireDate);
  const now = new Date(currentDate);
  const monthsDiff = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
  const daysDiff = Math.floor((now - hire) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);
  
  switch (accrualFrequency) {
    case 'monthly':
      return accrualRate * monthsDiff;
    case 'biweekly':
      return accrualRate * Math.floor(weeksDiff / 2);
    case 'quarterly':
      return accrualRate * Math.floor(monthsDiff / 3);
    case 'annually':
      return accrualRate * Math.floor(monthsDiff / 12);
    default:
      return accrualRate * monthsDiff; // Default to monthly
  }
}

// Helper function to calculate expiry date from carry_over_expiry_months
function calculateExpiryDate(carryOverExpiryMonths, year) {
  if (!carryOverExpiryMonths) return null;
  
  const expiryDate = new Date(year + 1, 0, 1); // Start of next year
  expiryDate.setMonth(expiryDate.getMonth() + carryOverExpiryMonths);
  return expiryDate.toISOString().split('T')[0];
}

// Get leave balances for all employees
r.get("/balances", async (req, res) => {
  try {
    const currentYear = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    
    let query = `
      SELECT 
        lb.*,
        lt.name as leave_type_name,
        lt.default_annual_entitlement,
        e.first_name,
        e.last_name,
        e.hire_date,
        e.department_id,
        e.job_title_id,
        -- Calculate available_days
        (COALESCE(lb.entitled_days, 0) + COALESCE(lb.carried_over_days, 0) - COALESCE(lb.used_days, 0)) as available_days
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      JOIN employees e ON lb.employee_id = e.id
    `;
    
    const params = [];
    const conditions = [];
    
    // Query params for filtering
    if (req.query.employee_id) {
      conditions.push(`lb.employee_id = $${params.length + 1}`);
      params.push(parseInt(req.query.employee_id, 10));
    }
    
    if (req.query.year) {
      conditions.push(`lb.year = $${params.length + 1}`);
      params.push(currentYear);
    } else {
      conditions.push(`lb.year = $${params.length + 1}`);
      params.push(currentYear);
    }
    
    if (req.query.leave_type_id) {
      conditions.push(`lb.leave_type_id = $${params.length + 1}`);
      params.push(parseInt(req.query.leave_type_id, 10));
    }
    
    // RBAC: Users can only see their own balance
    if (req.userScope === 'own' && req.employeeId) {
      conditions.push(`lb.employee_id = $${params.length + 1}`);
      params.push(req.employeeId);
      console.log(`🔒 [RBAC] Filtering leave balances for employee ${req.employeeId}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY e.first_name, lt.name`;
    
    const { rows } = await q(query, params);
    
    // Enrich each balance with policy information
    const enrichedBalances = await Promise.all(rows.map(async (balance) => {
      try {
        // Get effective policy for this employee/leave_type combination
        const policyQuery = `
          SELECT lp.*
          FROM leave_policies lp
          WHERE (
            (lp.leave_type_id = $1 OR lp.leave_type_id IS NULL)
            AND (
              (lp.applies_to_type = 'Employee' AND lp.applies_to_id = $2)
              OR (lp.applies_to_type = 'JobTitle' AND lp.applies_to_id = $3)
              OR (lp.applies_to_type = 'Department' AND lp.applies_to_id = $4)
              OR (lp.applies_to_type = 'All')
            )
          )
          ORDER BY
            CASE WHEN lp.applies_to_type = 'Employee' THEN 1
                 WHEN lp.applies_to_type = 'JobTitle' THEN 2
                 WHEN lp.applies_to_type = 'Department' THEN 3
                 ELSE 4 END,
            CASE WHEN lp.leave_type_id = $1 THEN 1 ELSE 2 END
          LIMIT 1
        `;
        
        const policyParams = [
          balance.leave_type_id,
          balance.employee_id,
          balance.job_title_id,
          balance.department_id
        ];
        
        const policyResult = await q(policyQuery, policyParams);
        const policy = policyResult.rows[0] || {
          accrual_rate: 0,
          accrual_frequency: 'monthly',
          carry_over_max_days: null,
          carry_over_expiry_months: null
        };
        
        // Calculate accrued entitlement if policy has accrual
        let accruedEntitlement = balance.entitled_days;
        if (policy.accrual_rate > 0 && balance.hire_date) {
          accruedEntitlement = calculateAccruedDays(
            balance.hire_date,
            parseFloat(policy.accrual_rate),
            policy.accrual_frequency || 'monthly'
          );
        }
        
        // Calculate expiry date
        const expiryDate = calculateExpiryDate(policy.carry_over_expiry_months, balance.year);
        
        return {
          ...balance,
          accrual_rate: parseFloat(policy.accrual_rate) || 0,
          accrual_frequency: policy.accrual_frequency || 'monthly',
          expiry_date: expiryDate,
          accrued_entitlement: accruedEntitlement
        };
      } catch (error) {
        console.error(`Error enriching balance ${balance.id}:`, error);
        // Return balance with defaults if policy lookup fails
        return {
          ...balance,
          accrual_rate: 0,
          accrual_frequency: 'monthly',
          expiry_date: null,
          accrued_entitlement: balance.entitled_days
        };
      }
    }));
    
    res.json(enrichedBalances);
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

// PUT /api/leave/balances/:id - Update leave balance (manager/admin only)
r.put("/balances/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const balanceId = parseInt(req.params.id, 10);
    const { entitled_days } = req.body;
    
    if (isNaN(balanceId)) {
      return res.status(400).json({ error: 'Invalid balance ID' });
    }
    
    if (entitled_days === undefined || entitled_days === null) {
      return res.status(400).json({ error: 'entitled_days is required' });
    }
    
    const entitledDaysNum = parseFloat(entitled_days);
    if (isNaN(entitledDaysNum) || entitledDaysNum < 0) {
      return res.status(400).json({ error: 'entitled_days must be a non-negative number' });
    }
    
    // Get current balance to validate
    const { rows: currentRows } = await q(`
      SELECT * FROM leave_balances WHERE id = $1
    `, [balanceId]);
    
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }
    
    const currentBalance = currentRows[0];
    
    // Validate: entitled_days must be >= used_days
    if (entitledDaysNum < parseFloat(currentBalance.used_days)) {
      return res.status(400).json({ 
        error: `entitled_days (${entitledDaysNum}) cannot be less than used_days (${currentBalance.used_days})` 
      });
    }
    
    // Update balance
    const { rows } = await q(`
      UPDATE leave_balances
      SET entitled_days = $1
      WHERE id = $2
      RETURNING *
    `, [entitledDaysNum, balanceId]);
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ error: 'Failed to update leave balance' });
  }
});

// POST /api/leave/balances/bulk - Bulk update leave balances (manager/admin only)
r.post("/balances/bulk", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array is required and must not be empty' });
    }
    
    // Validate all updates first
    const validationErrors = [];
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      if (!update.employee_id || !update.leave_type_id || !update.year || update.entitled_days === undefined) {
        validationErrors.push(`Update ${i + 1}: Missing required fields`);
        continue;
      }
      
      const entitledDays = parseFloat(update.entitled_days);
      if (isNaN(entitledDays) || entitledDays < 0) {
        validationErrors.push(`Update ${i + 1}: Invalid entitled_days value`);
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    // Start transaction
    await q('BEGIN');
    
    const results = [];
    
    try {
      for (const update of updates) {
        const { employee_id, leave_type_id, year, entitled_days } = update;
        const entitledDaysNum = parseFloat(entitled_days);
        
        // Get current balance to check used_days
        const { rows: currentRows } = await q(`
          SELECT * FROM leave_balances 
          WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
        `, [employee_id, leave_type_id, year]);
        
        if (currentRows.length > 0) {
          const currentBalance = currentRows[0];
          // Validate: entitled_days must be >= used_days
          if (entitledDaysNum < parseFloat(currentBalance.used_days)) {
            results.push({
              employee_id,
              leave_type_id,
              year,
              success: false,
              error: `entitled_days (${entitledDaysNum}) cannot be less than used_days (${currentBalance.used_days})`
            });
            continue;
          }
          
          // Update existing balance
          const { rows } = await q(`
            UPDATE leave_balances
            SET entitled_days = $1
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
            RETURNING *
          `, [entitledDaysNum, employee_id, leave_type_id, year]);
          
          results.push({
            employee_id,
            leave_type_id,
            year,
            success: true,
            balance: rows[0]
          });
        } else {
          // Create new balance
          const { rows } = await q(`
            INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
            VALUES ($1, $2, $3, $4, 0, 0)
            RETURNING *
          `, [employee_id, leave_type_id, year, entitledDaysNum]);
          
          results.push({
            employee_id,
            leave_type_id,
            year,
            success: true,
            balance: rows[0]
          });
        }
      }
      
      await q('COMMIT');
      res.json({ results });
    } catch (error) {
      await q('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk updating leave balances:', error);
    res.status(500).json({ error: 'Failed to bulk update leave balances', details: error.message });
  }
});

// POST /api/leave/balances/initialize - Initialize balances from defaults (manager/admin only)
r.post("/balances/initialize", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { employee_ids, year, leave_type_ids } = req.body;
    
    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'employee_ids array is required and must not be empty' });
    }
    
    if (!year || isNaN(parseInt(year, 10))) {
      return res.status(400).json({ error: 'year is required and must be a valid number' });
    }
    
    const yearNum = parseInt(year, 10);
    
    // Get leave types to initialize
    let leaveTypesQuery = `SELECT id, default_annual_entitlement FROM leave_types`;
    const leaveTypeParams = [];
    
    if (leave_type_ids && Array.isArray(leave_type_ids) && leave_type_ids.length > 0) {
      leaveTypesQuery += ` WHERE id = ANY($1)`;
      leaveTypeParams.push(leave_type_ids);
    }
    
    const { rows: leaveTypes } = await q(leaveTypesQuery, leaveTypeParams);
    
    if (leaveTypes.length === 0) {
      return res.status(400).json({ error: 'No leave types found' });
    }
    
    // Start transaction
    await q('BEGIN');
    
    const results = [];
    
    try {
      for (const employeeId of employee_ids) {
        for (const leaveType of leaveTypes) {
          // Check if balance already exists
          const { rows: existing } = await q(`
            SELECT id FROM leave_balances 
            WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
          `, [employeeId, leaveType.id, yearNum]);
          
          if (existing.length === 0) {
            // Create new balance with default entitlement
            const { rows } = await q(`
              INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
              VALUES ($1, $2, $3, $4, 0, 0)
              RETURNING *
            `, [employeeId, leaveType.id, yearNum, leaveType.default_annual_entitlement || 0]);
            
            results.push({
              employee_id: employeeId,
              leave_type_id: leaveType.id,
              year: yearNum,
              success: true,
              balance: rows[0]
            });
          } else {
            results.push({
              employee_id: employeeId,
              leave_type_id: leaveType.id,
              year: yearNum,
              success: false,
              skipped: true,
              message: 'Balance already exists'
            });
          }
        }
      }
      
      await q('COMMIT');
      res.json({ 
        initialized: results.filter(r => r.success).length,
        skipped: results.filter(r => r.skipped).length,
        results 
      });
    } catch (error) {
      await q('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error initializing leave balances:', error);
    res.status(500).json({ error: 'Failed to initialize leave balances', details: error.message });
  }
});

// POST /api/leave/balances/recalculate - Recalculate all balances from scratch using schedule-based workdays (manager/admin only)
r.post("/balances/recalculate", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { year } = req.body;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    
    if (isNaN(targetYear)) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    
    console.log(`🔄 Recalculating leave balances for year ${targetYear} using schedule-based workdays...`);
    
    await q('BEGIN');
    
    try {
      // Get all active employees
      const { rows: employees } = await q('SELECT id FROM employees WHERE status = $1', ['Active']);
      
      // Get all leave types
      const { rows: leaveTypes } = await q('SELECT id, default_annual_entitlement FROM leave_types');
      
      // Build a map to accumulate used_days per employee/leave_type for the target year
      // Key: `${employee_id}-${leave_type_id}`, Value: number
      const usedDaysMap = new Map();
      const requestsProcessed = [];
      const requestsFailed = [];
      
      // Get all approved requests that could have workdays in target year
      // (requests where start_date or end_date falls in target year, or spans across it)
      const { rows: approvedRequests } = await q(`
        SELECT id, employee_id, leave_type_id, start_date, end_date, total_days
        FROM leave_requests
        WHERE status = 'Approved'
          AND (
            EXTRACT(YEAR FROM start_date) = $1
            OR EXTRACT(YEAR FROM end_date) = $1
            OR (EXTRACT(YEAR FROM start_date) < $1 AND EXTRACT(YEAR FROM end_date) > $1)
          )
      `, [targetYear]);
      
      // Process each approved request and calculate schedule-based workdays
      for (const lr of approvedRequests) {
        try {
          const workdays = await calculateScheduledWorkdays(lr.employee_id, lr.start_date, lr.end_date);
          
          // Get workdays specifically for target year
          const yearWorkdays = workdays.workdaysByYear[targetYear] || 0;
          
          if (yearWorkdays > 0) {
            const key = `${lr.employee_id}-${lr.leave_type_id}`;
            usedDaysMap.set(key, (usedDaysMap.get(key) || 0) + yearWorkdays);
          }
          
          // Also update the request's total_days if it changed (normalize legacy data)
          if (Math.abs(parseFloat(lr.total_days) - workdays.totalWorkdays) > 0.001) {
            await q('UPDATE leave_requests SET total_days = $1 WHERE id = $2', [workdays.totalWorkdays, lr.id]);
            requestsProcessed.push({ id: lr.id, old_total: lr.total_days, new_total: workdays.totalWorkdays });
          }
        } catch (calcError) {
          // If calculation fails (e.g., employee has no schedule), log but continue
          console.log(`⚠️ [Recalculate] Could not calculate workdays for request ${lr.id}: ${calcError.message}`);
          requestsFailed.push({ id: lr.id, error: calcError.message });
          // Fallback: use stored total_days allocated to start_date year
          if (new Date(lr.start_date).getFullYear() === targetYear) {
            const key = `${lr.employee_id}-${lr.leave_type_id}`;
            usedDaysMap.set(key, (usedDaysMap.get(key) || 0) + parseFloat(lr.total_days || 0));
          }
        }
      }
      
      const results = [];
      
      // Update or create balance records for all employees/leave types
      for (const employee of employees) {
        for (const leaveType of leaveTypes) {
          const key = `${employee.id}-${leaveType.id}`;
          const usedDays = usedDaysMap.get(key) || 0;
          
          // Get or create balance record
          const { rows: existing } = await q(`
            SELECT * FROM leave_balances
            WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
          `, [employee.id, leaveType.id, targetYear]);
          
          if (existing.length > 0) {
            // Update existing balance with recalculated used_days
            const { rows } = await q(`
              UPDATE leave_balances
              SET used_days = $1
              WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
              RETURNING *
            `, [usedDays, employee.id, leaveType.id, targetYear]);
            
            results.push({
              employee_id: employee.id,
              leave_type_id: leaveType.id,
              year: targetYear,
              success: true,
              used_days: usedDays,
              balance: rows[0]
            });
          } else {
            // Create new balance
            const defaultEntitlement = parseFloat(leaveType.default_annual_entitlement || 0);
            
            const { rows } = await q(`
              INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over_days)
              VALUES ($1, $2, $3, $4, $5, 0)
              RETURNING *
            `, [employee.id, leaveType.id, targetYear, defaultEntitlement, usedDays]);
            
            results.push({
              employee_id: employee.id,
              leave_type_id: leaveType.id,
              year: targetYear,
              success: true,
              used_days: usedDays,
              balance: rows[0]
            });
          }
        }
      }
      
      await q('COMMIT');
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Recalculated ${successCount} leave balances using schedule-based workdays`);
      
      res.json({
        message: `Recalculated ${successCount} leave balances for year ${targetYear}`,
        year: targetYear,
        recalculated: successCount,
        requests_normalized: requestsProcessed.length,
        requests_failed: requestsFailed.length,
        results
      });
    } catch (error) {
      await q('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error recalculating leave balances:', error);
    res.status(500).json({ error: 'Failed to recalculate leave balances', details: error.message });
  }
});

// GET /api/leave/balances/coverage - Get coverage info for leave balances (how complete the data is)
r.get("/balances/coverage", async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    
    if (isNaN(targetYear)) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    
    // Get all active employees with their schedule info
    const { rows: employees } = await q(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.department_id,
        e.work_schedule_id,
        ws.name as schedule_name,
        ws.days_of_week
      FROM employees e
      LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
      WHERE e.status = 'Active'
    `);
    
    // Get all leave types
    const { rows: leaveTypes } = await q('SELECT id, name FROM leave_types');
    
    // Get all balance records for target year
    const { rows: balances } = await q(`
      SELECT DISTINCT employee_id, leave_type_id
      FROM leave_balances
      WHERE year = $1
    `, [targetYear]);
    
    // Build sets for analysis
    const activeEmployeeIds = new Set(employees.map(e => e.id));
    const employeesWithSchedule = employees.filter(e => e.work_schedule_id !== null);
    const employeesWithoutSchedule = employees.filter(e => e.work_schedule_id === null);
    
    // Build a map of which employees have balances initialized
    // Key: employee_id, Value: Set of leave_type_ids
    const balanceMap = new Map();
    for (const b of balances) {
      if (!balanceMap.has(b.employee_id)) {
        balanceMap.set(b.employee_id, new Set());
      }
      balanceMap.get(b.employee_id).add(b.leave_type_id);
    }
    
    // Employees with any balance for target year
    const employeesWithBalances = employees.filter(e => balanceMap.has(e.id));
    const employeesWithoutBalances = employees.filter(e => !balanceMap.has(e.id));
    
    // Employees with complete balances (all leave types)
    const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));
    const employeesWithCompleteBalances = employees.filter(e => {
      const empBalances = balanceMap.get(e.id);
      if (!empBalances) return false;
      return leaveTypeIds.size === empBalances.size && [...leaveTypeIds].every(lt => empBalances.has(lt));
    });
    
    res.json({
      year: targetYear,
      active_employees: employees.length,
      employees_with_schedule: employeesWithSchedule.length,
      employees_without_schedule: employeesWithoutSchedule.length,
      employees_with_balances: employeesWithBalances.length,
      employees_without_balances: employeesWithoutBalances.length,
      employees_with_complete_balances: employeesWithCompleteBalances.length,
      leave_types_count: leaveTypes.length,
      missing_schedule_employees: employeesWithoutSchedule.map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        department_id: e.department_id
      })),
      missing_balance_employees: employeesWithoutBalances.map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        department_id: e.department_id,
        has_schedule: e.work_schedule_id !== null
      }))
    });
  } catch (error) {
    console.error('Error getting leave balance coverage:', error);
    res.status(500).json({ error: 'Failed to get coverage info', details: error.message });
  }
});

// Preview workdays for a leave request (before creating)
r.get("/requests/preview", async (req, res) => {
  try {
    const { employee_id, start_date, end_date } = req.query;
    
    if (!employee_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required params: employee_id, start_date, end_date' });
    }
    
    const result = await previewLeaveWorkdays(parseInt(employee_id, 10), start_date, end_date);
    res.json(result);
  } catch (error) {
    console.error('Error previewing leave workdays:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create leave request
const leaveRequestSchema = z.object({
  employee_id: z.number().int(),
  leave_type_id: z.number().int(),
  start_date: z.string(),
  end_date: z.string(),
  total_days: z.number().positive().optional(), // Optional: server computes authoritative value
  reason: z.string().nullish(),
  notes: z.string().nullish(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).default('Pending'),
  request_method: z.enum(['Email', 'Phone', 'In-Person', 'Slack', 'Written', 'Other']).optional(),
  approved_by: z.number().int().optional()
});

r.post("/requests", async (req, res) => {
  try {
    const data = leaveRequestSchema.parse(req.body);
    
    // Compute authoritative total_days from employee's work schedule (ignores client value)
    let workdaysResult;
    try {
      workdaysResult = await calculateScheduledWorkdays(data.employee_id, data.start_date, data.end_date);
    } catch (calcError) {
      return res.status(400).json({ error: `Cannot calculate workdays: ${calcError.message}` });
    }
    
    if (!workdaysResult.hasSchedule) {
      return res.status(400).json({ 
        error: 'Employee has no work schedule assigned. Cannot create leave request.',
        employee_id: data.employee_id
      });
    }
    
    if (workdaysResult.totalWorkdays === 0) {
      return res.status(400).json({ 
        error: 'The selected date range contains no scheduled workdays for this employee.',
        start_date: data.start_date,
        end_date: data.end_date,
        schedule_days: workdaysResult.scheduleDays
      });
    }
    
    // Use computed workdays
    data.total_days = workdaysResult.totalWorkdays;
    const workdaysByYear = workdaysResult.workdaysByYear;
    
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
    
    // Auto-set approved_by for manager/admin creating Approved leaves
    if (data.status === 'Approved' && !data.approved_by && req.employeeId) {
      data.approved_by = req.employeeId;
      console.log(`📝 [Leave] Auto-setting approved_by to ${req.employeeId} for manager/admin created Approved leave`);
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
    
    // If approved, update leave balances automatically using per-year allocation
    if (data.status === 'Approved') {
      await updateBalancesByYear(data.employee_id, data.leave_type_id, workdaysByYear, 'add');
      await syncLeavesTable(data.employee_id, data.leave_type_id, data.start_date, data.end_date, data.notes, 'add');
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
    
    const existing = lrRows[0];
    const oldStatus = existing.status;
    
    // Calculate workdays for balance updates (recompute from schedule to ensure accuracy)
    let workdaysResult;
    try {
      workdaysResult = await calculateScheduledWorkdays(existing.employee_id, existing.start_date, existing.end_date);
    } catch (calcError) {
      await q('ROLLBACK');
      return res.status(400).json({ error: `Cannot calculate workdays: ${calcError.message}` });
    }
    
    // Update the stored total_days to the correct schedule-based value
    const computedTotalDays = workdaysResult.totalWorkdays;
    
    // Update leave request status (and fix total_days if needed)
    const { rows } = await q(`
      UPDATE leave_requests 
      SET status = $1, approved_by = $2, approved_at = CASE WHEN $1 = 'Approved' THEN CURRENT_TIMESTAMP ELSE approved_at END, 
          notes = COALESCE($3, notes),
          total_days = $5
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, notes, id, computedTotalDays]);
    
    const lr = rows[0];
    
    // Handle status changes and update leave balances accordingly
    if (status === 'Approved' && oldStatus !== 'Approved') {
      // Add workdays to balances (allocated per year)
      await updateBalancesByYear(lr.employee_id, lr.leave_type_id, workdaysResult.workdaysByYear, 'add');
      await syncLeavesTable(lr.employee_id, lr.leave_type_id, lr.start_date, lr.end_date, lr.notes, 'add');
    } else if (status !== 'Approved' && oldStatus === 'Approved') {
      // Subtract workdays from balances when un-approving
      await updateBalancesByYear(lr.employee_id, lr.leave_type_id, workdaysResult.workdaysByYear, 'subtract');
      await syncLeavesTable(lr.employee_id, lr.leave_type_id, lr.start_date, lr.end_date, null, 'delete');
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

// Update leave request (full edit) - Manager/Admin only
r.put("/requests/:id", async (req, res) => {
  const { id } = req.params;
  const { employee_id, leave_type_id, start_date, end_date, reason, notes, request_method } = req.body;
  // Note: total_days from client is ignored - server computes authoritative value
  
  // RBAC: Only managers/admins can edit leave requests
  if (req.userScope === 'own') {
    console.log(`🚫 [RBAC] User role cannot edit leave requests`);
    return res.status(403).json({ error: 'Only managers can edit leave requests' });
  }
  
  try {
    await q('BEGIN');
    
    // Get the existing leave request
    const { rows: existingRows } = await q('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      await q('ROLLBACK');
      return res.status(404).json({ error: "Leave request not found" });
    }
    
    const existing = existingRows[0];
    const wasApproved = existing.status === 'Approved';
    
    // Determine final values for the updated request
    const finalEmployeeId = employee_id || existing.employee_id;
    const finalLeaveTypeId = leave_type_id || existing.leave_type_id;
    const finalStartDate = start_date || existing.start_date;
    const finalEndDate = end_date || existing.end_date;
    
    // Calculate workdays for old request (to subtract if was approved)
    let oldWorkdays = null;
    if (wasApproved) {
      try {
        oldWorkdays = await calculateScheduledWorkdays(existing.employee_id, existing.start_date, existing.end_date);
      } catch (e) {
        // If we can't calculate old workdays, use a fallback based on stored total_days
        // This handles legacy data where employee schedule may have changed
        console.log(`⚠️ [Leave] Could not recalculate old workdays for request ${id}, using stored total_days`);
        const oldYear = new Date(existing.start_date).getFullYear();
        oldWorkdays = { workdaysByYear: { [oldYear]: parseFloat(existing.total_days) || 0 } };
      }
      
      // Subtract old days from old balance
      await updateBalancesByYear(existing.employee_id, existing.leave_type_id, oldWorkdays.workdaysByYear, 'subtract');
      await syncLeavesTable(existing.employee_id, existing.leave_type_id, existing.start_date, existing.end_date, null, 'delete');
    }
    
    // Calculate workdays for new/updated request
    let newWorkdays;
    try {
      newWorkdays = await calculateScheduledWorkdays(finalEmployeeId, finalStartDate, finalEndDate);
    } catch (calcError) {
      await q('ROLLBACK');
      return res.status(400).json({ error: `Cannot calculate workdays: ${calcError.message}` });
    }
    
    if (!newWorkdays.hasSchedule) {
      await q('ROLLBACK');
      return res.status(400).json({ 
        error: 'Employee has no work schedule assigned. Cannot update leave request.',
        employee_id: finalEmployeeId
      });
    }
    
    if (newWorkdays.totalWorkdays === 0) {
      await q('ROLLBACK');
      return res.status(400).json({ 
        error: 'The selected date range contains no scheduled workdays for this employee.',
        start_date: finalStartDate,
        end_date: finalEndDate
      });
    }
    
    // Update the leave request with computed total_days
    const { rows } = await q(`
      UPDATE leave_requests 
      SET 
        employee_id = $1,
        leave_type_id = $2,
        start_date = $3,
        end_date = $4,
        total_days = $5,
        reason = COALESCE($6, reason),
        notes = COALESCE($7, notes),
        request_method = COALESCE($8, request_method)
      WHERE id = $9
      RETURNING *
    `, [
      finalEmployeeId,
      finalLeaveTypeId,
      finalStartDate,
      finalEndDate,
      newWorkdays.totalWorkdays,
      reason !== undefined ? reason : null,
      notes !== undefined ? notes : null,
      request_method || null,
      id
    ]);
    
    const updated = rows[0];
    
    // If leave is approved, add new days to balance
    if (updated.status === 'Approved') {
      await updateBalancesByYear(updated.employee_id, updated.leave_type_id, newWorkdays.workdaysByYear, 'add');
      await syncLeavesTable(updated.employee_id, updated.leave_type_id, updated.start_date, updated.end_date, updated.notes, 'add');
    }
    
    await q('COMMIT');
    
    console.log(`✅ [Leave] Updated leave request ${id}`);
    res.json(updated);
  } catch (error) {
    await q('ROLLBACK');
    console.error('Error updating leave request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete leave request - Manager/Admin only
r.delete("/requests/:id", async (req, res) => {
  const { id } = req.params;
  
  // RBAC: Only managers/admins can delete leave requests
  if (req.userScope === 'own') {
    console.log(`🚫 [RBAC] User role cannot delete leave requests`);
    return res.status(403).json({ error: 'Only managers can delete leave requests' });
  }
  
  try {
    await q('BEGIN');
    
    // Get the existing leave request
    const { rows: existingRows } = await q('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      await q('ROLLBACK');
      return res.status(404).json({ error: "Leave request not found" });
    }
    
    const existing = existingRows[0];
    
    // If leave was approved, subtract from balances using schedule-based calculation
    if (existing.status === 'Approved') {
      let workdays;
      try {
        workdays = await calculateScheduledWorkdays(existing.employee_id, existing.start_date, existing.end_date);
      } catch (e) {
        // Fallback to stored total_days if schedule calculation fails
        console.log(`⚠️ [Leave] Could not recalculate workdays for request ${id}, using stored total_days`);
        const year = new Date(existing.start_date).getFullYear();
        workdays = { workdaysByYear: { [year]: parseFloat(existing.total_days) || 0 } };
      }
      
      await updateBalancesByYear(existing.employee_id, existing.leave_type_id, workdays.workdaysByYear, 'subtract');
      await syncLeavesTable(existing.employee_id, existing.leave_type_id, existing.start_date, existing.end_date, null, 'delete');
    }
    
    // Delete the leave request
    await q('DELETE FROM leave_requests WHERE id = $1', [id]);
    
    await q('COMMIT');
    
    console.log(`✅ [Leave] Deleted leave request ${id}`);
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    await q('ROLLBACK');
    console.error('Error deleting leave request:', error);
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

// ========== LEAVE POLICIES ENDPOINTS ==========

// GET /api/leave/policies - Get all leave policies
r.get("/policies", async (req, res) => {
  try {
    let query = `
      SELECT lp.*, lt.name as leave_type_name
      FROM leave_policies lp
      LEFT JOIN leave_types lt ON lp.leave_type_id = lt.id
    `;
    
    const params = [];
    
    // Filter by leave_type_id if provided
    if (req.query.leave_type_id) {
      query += ` WHERE lp.leave_type_id = $1`;
      params.push(parseInt(req.query.leave_type_id, 10));
    }
    
    query += ` ORDER BY lp.leave_type_id NULLS LAST, lp.name`;
    
    const { rows } = await q(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching leave policies:', error);
    // If table doesn't exist or other DB schema error, return empty array gracefully
    if (error.message && (error.message.includes('relation') || error.message.includes('does not exist'))) {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch leave policies' });
  }
});

// POST /api/leave/policies - Create leave policy (manager/admin only)
r.post("/policies", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const {
      name,
      description,
      leave_type_id,
      accrual_rate,
      accrual_frequency,
      carry_over_max_days,
      carry_over_expiry_months,
      minimum_notice_days,
      max_consecutive_days,
      approval_workflow,
      applies_to_type,
      applies_to_id
    } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Policy name is required' });
    }
    
    // Validate accrual_frequency
    const validFrequencies = ['monthly', 'biweekly', 'quarterly', 'annually'];
    if (accrual_frequency && !validFrequencies.includes(accrual_frequency)) {
      return res.status(400).json({ error: `accrual_frequency must be one of: ${validFrequencies.join(', ')}` });
    }
    
    // Validate approval_workflow
    const validWorkflows = ['auto', 'manager', 'hr', 'custom'];
    if (approval_workflow && !validWorkflows.includes(approval_workflow)) {
      return res.status(400).json({ error: `approval_workflow must be one of: ${validWorkflows.join(', ')}` });
    }
    
    // Validate applies_to_type
    const validAppliesToTypes = ['All', 'Department', 'JobTitle', 'Employee'];
    const finalAppliesToType = applies_to_type || 'All';
    if (!validAppliesToTypes.includes(finalAppliesToType)) {
      return res.status(400).json({ error: `applies_to_type must be one of: ${validAppliesToTypes.join(', ')}` });
    }
    
    // Validate applies_to_id if type is not 'All'
    if (finalAppliesToType !== 'All' && (!applies_to_id || isNaN(parseInt(applies_to_id, 10)))) {
      return res.status(400).json({ error: 'applies_to_id is required when applies_to_type is not "All"' });
    }
    
    // Validate referenced entities exist
    if (finalAppliesToType === 'Department' && applies_to_id) {
      const deptCheck = await q('SELECT id FROM departments WHERE id = $1', [applies_to_id]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }
    if (finalAppliesToType === 'JobTitle' && applies_to_id) {
      const jobCheck = await q('SELECT id FROM job_titles WHERE id = $1', [applies_to_id]);
      if (jobCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid job title ID' });
      }
    }
    if (finalAppliesToType === 'Employee' && applies_to_id) {
      const empCheck = await q('SELECT id FROM employees WHERE id = $1', [applies_to_id]);
      if (empCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid employee ID' });
      }
    }
    
    // Validate leave_type_id if provided
    if (leave_type_id !== null && leave_type_id !== undefined) {
      const ltCheck = await q('SELECT id FROM leave_types WHERE id = $1', [leave_type_id]);
      if (ltCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid leave_type_id' });
      }
    }
    
    // Insert new policy
    const result = await q(`
      INSERT INTO leave_policies (
        name, description, leave_type_id, accrual_rate, accrual_frequency,
        carry_over_max_days, carry_over_expiry_months, minimum_notice_days,
        max_consecutive_days, approval_workflow, applies_to_type, applies_to_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name.trim(),
      description || null,
      leave_type_id || null,
      accrual_rate !== undefined ? parseFloat(accrual_rate) : 0,
      accrual_frequency || 'monthly',
      carry_over_max_days !== undefined ? parseFloat(carry_over_max_days) : null,
      carry_over_expiry_months !== undefined ? parseInt(carry_over_expiry_months, 10) : null,
      minimum_notice_days !== undefined ? parseInt(minimum_notice_days, 10) : 0,
      max_consecutive_days !== undefined ? parseInt(max_consecutive_days, 10) : null,
      approval_workflow || 'manager',
      finalAppliesToType,
      finalAppliesToType === 'All' ? null : parseInt(applies_to_id, 10)
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating leave policy:', error);
    res.status(500).json({ error: 'Failed to create leave policy', details: error.message });
  }
});

// PUT /api/leave/policies/:id - Update leave policy (manager/admin only)
r.put("/policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id, 10);
    const {
      name,
      description,
      leave_type_id,
      accrual_rate,
      accrual_frequency,
      carry_over_max_days,
      carry_over_expiry_months,
      minimum_notice_days,
      max_consecutive_days,
      approval_workflow,
      applies_to_type,
      applies_to_id
    } = req.body;
    
    if (isNaN(policyId)) {
      return res.status(400).json({ error: 'Invalid policy ID' });
    }
    
    // Check if policy exists
    const policyCheck = await q(`SELECT id FROM leave_policies WHERE id = $1`, [policyId]);
    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Policy name cannot be empty' });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }
    
    if (leave_type_id !== undefined) {
      if (leave_type_id !== null) {
        const ltCheck = await q('SELECT id FROM leave_types WHERE id = $1', [leave_type_id]);
        if (ltCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid leave_type_id' });
        }
      }
      updates.push(`leave_type_id = $${paramCount++}`);
      values.push(leave_type_id);
    }
    
    if (accrual_rate !== undefined) {
      updates.push(`accrual_rate = $${paramCount++}`);
      values.push(parseFloat(accrual_rate));
    }
    
    if (accrual_frequency !== undefined) {
      const validFrequencies = ['monthly', 'biweekly', 'quarterly', 'annually'];
      if (!validFrequencies.includes(accrual_frequency)) {
        return res.status(400).json({ error: `accrual_frequency must be one of: ${validFrequencies.join(', ')}` });
      }
      updates.push(`accrual_frequency = $${paramCount++}`);
      values.push(accrual_frequency);
    }
    
    if (carry_over_max_days !== undefined) {
      updates.push(`carry_over_max_days = $${paramCount++}`);
      values.push(carry_over_max_days === null ? null : parseFloat(carry_over_max_days));
    }
    
    if (carry_over_expiry_months !== undefined) {
      updates.push(`carry_over_expiry_months = $${paramCount++}`);
      values.push(carry_over_expiry_months === null ? null : parseInt(carry_over_expiry_months, 10));
    }
    
    if (minimum_notice_days !== undefined) {
      updates.push(`minimum_notice_days = $${paramCount++}`);
      values.push(parseInt(minimum_notice_days, 10));
    }
    
    if (max_consecutive_days !== undefined) {
      updates.push(`max_consecutive_days = $${paramCount++}`);
      values.push(max_consecutive_days === null ? null : parseInt(max_consecutive_days, 10));
    }
    
    if (approval_workflow !== undefined) {
      const validWorkflows = ['auto', 'manager', 'hr', 'custom'];
      if (!validWorkflows.includes(approval_workflow)) {
        return res.status(400).json({ error: `approval_workflow must be one of: ${validWorkflows.join(', ')}` });
      }
      updates.push(`approval_workflow = $${paramCount++}`);
      values.push(approval_workflow);
    }
    
    if (applies_to_type !== undefined) {
      const validAppliesToTypes = ['All', 'Department', 'JobTitle', 'Employee'];
      if (!validAppliesToTypes.includes(applies_to_type)) {
        return res.status(400).json({ error: `applies_to_type must be one of: ${validAppliesToTypes.join(', ')}` });
      }
      updates.push(`applies_to_type = $${paramCount++}`);
      values.push(applies_to_type);
    }
    
    if (applies_to_id !== undefined) {
      if (applies_to_type !== undefined && applies_to_type !== 'All' && (!applies_to_id || isNaN(parseInt(applies_to_id, 10)))) {
        return res.status(400).json({ error: 'applies_to_id is required when applies_to_type is not "All"' });
      }
      updates.push(`applies_to_id = $${paramCount++}`);
      values.push(applies_to_type === 'All' ? null : parseInt(applies_to_id, 10));
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(policyId);
    const result = await q(`
      UPDATE leave_policies 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating leave policy:', error);
    res.status(500).json({ error: 'Failed to update leave policy', details: error.message });
  }
});

// DELETE /api/leave/policies/:id - Delete leave policy (manager/admin only)
r.delete("/policies/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const policyId = parseInt(req.params.id, 10);
    
    if (isNaN(policyId)) {
      return res.status(400).json({ error: 'Invalid policy ID' });
    }
    
    // Check if policy exists
    const policyCheck = await q(`SELECT id FROM leave_policies WHERE id = $1`, [policyId]);
    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }
    
    // Delete policy
    await q(`DELETE FROM leave_policies WHERE id = $1`, [policyId]);
    
    res.json({ message: 'Leave policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave policy:', error);
    res.status(500).json({ error: 'Failed to delete leave policy' });
  }
});

// GET /api/leave/policies/effective/:employee_id/:leave_type_id - Get effective policy
r.get("/policies/effective/:employee_id/:leave_type_id", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employee_id, 10);
    const leaveTypeId = parseInt(req.params.leave_type_id, 10);
    
    if (isNaN(employeeId) || isNaN(leaveTypeId)) {
      return res.status(400).json({ error: 'Invalid employee_id or leave_type_id' });
    }
    
    // Get employee details
    const { rows: empRows } = await q(`
      SELECT department_id, job_title_id FROM employees WHERE id = $1
    `, [employeeId]);
    
    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = empRows[0];
    
    // Resolve policy hierarchy: Employee-specific > JobTitle > Department > Leave Type Specific > Global
    // Priority order:
    // 1. Employee-specific policy for this leave type
    // 2. JobTitle-specific policy for this leave type
    // 3. Department-specific policy for this leave type
    // 4. Global policy for this leave type
    // 5. Employee-specific policy (all types)
    // 6. JobTitle-specific policy (all types)
    // 7. Department-specific policy (all types)
    // 8. Global policy (all types)
    
    const { rows: policies } = await q(`
      SELECT lp.*, lt.name as leave_type_name
      FROM leave_policies lp
      LEFT JOIN leave_types lt ON lp.leave_type_id = lt.id
      WHERE (
        (lp.leave_type_id = $1 OR lp.leave_type_id IS NULL)
        AND (
          (lp.applies_to_type = 'Employee' AND lp.applies_to_id = $2)
          OR (lp.applies_to_type = 'JobTitle' AND lp.applies_to_id = $3)
          OR (lp.applies_to_type = 'Department' AND lp.applies_to_id = $4)
          OR (lp.applies_to_type = 'All')
        )
      )
      ORDER BY
        CASE WHEN lp.applies_to_type = 'Employee' THEN 1
             WHEN lp.applies_to_type = 'JobTitle' THEN 2
             WHEN lp.applies_to_type = 'Department' THEN 3
             ELSE 4 END,
        CASE WHEN lp.leave_type_id = $1 THEN 1 ELSE 2 END
      LIMIT 1
    `, [leaveTypeId, employeeId, employee.job_title_id, employee.department_id]);
    
    if (policies.length === 0) {
      // Return default policy structure
      return res.json({
        id: null,
        name: 'Default Policy',
        accrual_rate: 0,
        accrual_frequency: 'monthly',
        carry_over_max_days: null,
        carry_over_expiry_months: null,
        minimum_notice_days: 0,
        max_consecutive_days: null,
        approval_workflow: 'manager',
        applies_to_type: 'All',
        applies_to_id: null
      });
    }
    
    res.json(policies[0]);
  } catch (error) {
    console.error('Error getting effective policy:', error);
    res.status(500).json({ error: 'Failed to get effective policy', details: error.message });
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
    const { date, description, is_company_closure, applies_to_type, applies_to_id } = req.body;
    
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
    
    // Validate applies_to_type
    const validAppliesToTypes = ['All', 'Department', 'JobTitle', 'Employee'];
    const finalAppliesToType = applies_to_type || 'All';
    if (!validAppliesToTypes.includes(finalAppliesToType)) {
      return res.status(400).json({ error: 'Invalid applies_to_type' });
    }
    
    // Validate applies_to_id if type is not 'All'
    if (finalAppliesToType !== 'All' && (!applies_to_id || isNaN(parseInt(applies_to_id, 10)))) {
      return res.status(400).json({ error: 'applies_to_id is required when applies_to_type is not "All"' });
    }
    
    // Validate applies_to_id exists in the referenced table
    if (finalAppliesToType === 'Department' && applies_to_id) {
      const deptCheck = await q('SELECT id FROM departments WHERE id = $1', [applies_to_id]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }
    if (finalAppliesToType === 'JobTitle' && applies_to_id) {
      const jobCheck = await q('SELECT id FROM job_titles WHERE id = $1', [applies_to_id]);
      if (jobCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid job title ID' });
      }
    }
    if (finalAppliesToType === 'Employee' && applies_to_id) {
      const empCheck = await q('SELECT id FROM employees WHERE id = $1', [applies_to_id]);
      if (empCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid employee ID' });
      }
    }
    
    // Check if holiday already exists for this date
    const existing = await q(`SELECT id FROM leave_calendar WHERE date = $1`, [date]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A holiday or event already exists for this date' });
    }
    
    // Insert new holiday
    const result = await q(`
      INSERT INTO leave_calendar (date, description, is_holiday, is_company_closure, applies_to_type, applies_to_id) 
      VALUES ($1, $2, true, $3, $4, $5) 
      RETURNING *
    `, [
      date, 
      trimmedDescription, 
      is_company_closure !== undefined ? is_company_closure : true,
      finalAppliesToType,
      finalAppliesToType === 'All' ? null : parseInt(applies_to_id, 10)
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// PUT /api/leave/holidays/:id - Update holiday (manager/admin only)
r.put("/holidays/:id", requireAuth, requireRole([ROLES.MANAGER, ROLES.ADMIN]), async (req, res) => {
  try {
    const holidayId = parseInt(req.params.id, 10);
    const { date, description, is_company_closure, applies_to_type, applies_to_id } = req.body;
    
    if (isNaN(holidayId)) {
      return res.status(400).json({ error: 'Invalid holiday ID' });
    }
    
    // Check if holiday exists
    const holidayCheck = await q(`SELECT id FROM leave_calendar WHERE id = $1 AND is_holiday = true`, [holidayId]);
    if (holidayCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    // Validate applies_to_type if provided
    let finalAppliesToType = applies_to_type;
    if (applies_to_type !== undefined) {
      const validAppliesToTypes = ['All', 'Department', 'JobTitle', 'Employee'];
      if (!validAppliesToTypes.includes(applies_to_type)) {
        return res.status(400).json({ error: 'Invalid applies_to_type' });
      }
      finalAppliesToType = applies_to_type;
    }
    
    // Validate applies_to_id if type is not 'All'
    if (finalAppliesToType && finalAppliesToType !== 'All' && (!applies_to_id || isNaN(parseInt(applies_to_id, 10)))) {
      return res.status(400).json({ error: 'applies_to_id is required when applies_to_type is not "All"' });
    }
    
    // Validate applies_to_id exists
    if (finalAppliesToType === 'Department' && applies_to_id) {
      const deptCheck = await q('SELECT id FROM departments WHERE id = $1', [applies_to_id]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }
    if (finalAppliesToType === 'JobTitle' && applies_to_id) {
      const jobCheck = await q('SELECT id FROM job_titles WHERE id = $1', [applies_to_id]);
      if (jobCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid job title ID' });
      }
    }
    if (finalAppliesToType === 'Employee' && applies_to_id) {
      const empCheck = await q('SELECT id FROM employees WHERE id = $1', [applies_to_id]);
      if (empCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid employee ID' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (date !== undefined) {
      updates.push(`date = $${paramCount++}`);
      values.push(date);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description.trim());
    }
    if (is_company_closure !== undefined) {
      updates.push(`is_company_closure = $${paramCount++}`);
      values.push(is_company_closure);
    }
    if (finalAppliesToType !== undefined) {
      updates.push(`applies_to_type = $${paramCount++}`);
      values.push(finalAppliesToType);
    }
    if (applies_to_id !== undefined) {
      updates.push(`applies_to_id = $${paramCount++}`);
      values.push(finalAppliesToType === 'All' ? null : parseInt(applies_to_id, 10));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(holidayId);
    const result = await q(`
      UPDATE leave_calendar 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ error: 'Failed to update holiday' });
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
    
    console.log('📅 [Calendar API] Query params:', { 
      start_date, 
      end_date, 
      computed_start: startDate, 
      computed_end: endDate,
      employeeId: req.employeeId,
      scope: req.userScope
    });
    
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
    
    // Get holidays - filter based on employee if provided
    let holidaysQuery = `
      SELECT id, date, description, is_holiday, is_company_closure,
             NULL as employee_id, NULL as first_name, NULL as last_name,
             NULL as leave_type_name, NULL as color,
             'holiday' as type
      FROM leave_calendar
      WHERE is_holiday = true
      AND date >= $1 AND date <= $2
    `;
    
    const holidayParams = [startDate, endDate];
    
    // Filter holidays based on employee's assignments if employee context is available
    if (req.employeeId) {
      // Get employee's department and job_title
      const empResult = await q(`
        SELECT department_id, job_title_id 
        FROM employees 
        WHERE id = $1
      `, [req.employeeId]);
      
      if (empResult.rows.length > 0) {
        const emp = empResult.rows[0];
        const empDeptId = emp.department_id;
        const empJobTitleId = emp.job_title_id;
        
        // Add filtering: show holidays that apply to 'All' OR match employee's department/job_title/employee_id
        holidaysQuery += ` AND (
          applies_to_type = 'All' 
          OR (applies_to_type = 'Department' AND applies_to_id = $${holidayParams.length + 1})
          OR (applies_to_type = 'JobTitle' AND applies_to_id = $${holidayParams.length + 2})
          OR (applies_to_type = 'Employee' AND applies_to_id = $${holidayParams.length + 3})
        )`;
        holidayParams.push(empDeptId, empJobTitleId, req.employeeId);
      }
    } else {
      // If no employee context, show only 'All' holidays (for managers viewing all)
      holidaysQuery += ` AND applies_to_type = 'All'`;
    }
    
    holidaysQuery += ` ORDER BY date`;
    
    const [leaveRows, holidayRows] = await Promise.all([
      q(leaveQuery, params),
      q(holidaysQuery, holidayParams)
    ]);
    
    // Combine results
    const allEvents = [...leaveRows.rows, ...holidayRows.rows];
    
    // Sort by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.date || a.start_date);
      const dateB = new Date(b.date || b.start_date);
      return dateA - dateB;
    });
    
    console.log('📅 [Calendar API] Returning results:', {
      leaveRequests: leaveRows.rows.length,
      holidays: holidayRows.rows.length,
      total: allEvents.length,
      dateRange: `${startDate} to ${endDate}`
    });
    
    res.json(allEvents);
  } catch (error) {
    console.error('Error getting leave calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

export default r;
