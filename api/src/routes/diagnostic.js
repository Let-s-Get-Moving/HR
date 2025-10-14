import express from 'express';
import { q } from '../db.js';
import { requireAuth } from '../session.js';

const router = express.Router();

/**
 * Diagnostic endpoint to check user account status
 * GET /api/diagnostic/user-status?name=test
 */
router.get('/user-status', requireAuth, async (req, res) => {
  try {
    const searchName = req.query.name || '';
    
    if (!searchName) {
      return res.status(400).json({ error: 'Please provide a name query parameter' });
    }
    
    console.log(`🔍 [Diagnostic] Searching for user/employee: "${searchName}"`);
    
    // Check employees table
    const employeeQuery = `
      SELECT id, first_name, last_name, work_email, hire_date, employment_type, 
             department_id, status
      FROM employees
      WHERE LOWER(first_name) LIKE LOWER($1) 
         OR LOWER(last_name) LIKE LOWER($1)
         OR LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
      ORDER BY id DESC
      LIMIT 10
    `;
    const employees = await q(employeeQuery, [`%${searchName}%`]);
    
    // Check users table
    const userQuery = `
      SELECT u.id, u.username, u.full_name, u.email, u.employee_id, u.is_active, u.created_at,
             u.password_hash IS NOT NULL as has_password,
             LENGTH(u.password_hash) as password_length,
             u.role_id,
             r.role_name, r.display_name as role_display,
             r.permissions
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE LOWER(u.full_name) LIKE LOWER($1)
         OR LOWER(u.username) LIKE LOWER($1)
      ORDER BY u.created_at DESC
      LIMIT 10
    `;
    const users = await q(userQuery, [`%${searchName}%`]);
    
    // Check if employees have matching user accounts
    const results = {
      search: searchName,
      timestamp: new Date().toISOString(),
      employees: employees.rows.map(emp => {
        const matchingUser = users.rows.find(u => u.employee_id === emp.id);
        return {
          employee_id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.work_email,
          hire_date: emp.hire_date,
          status: emp.status,
          user_account: matchingUser ? {
            user_id: matchingUser.id,
            username: matchingUser.username,
            has_password: matchingUser.has_password,
            password_length: matchingUser.password_length,
            role_id: matchingUser.role_id,
            role_name: matchingUser.role_name,
            role_display: matchingUser.role_display,
            is_active: matchingUser.is_active,
            can_login: matchingUser.has_password && matchingUser.is_active && matchingUser.role_id
          } : null
        };
      }),
      orphaned_users: users.rows.filter(u => !employees.rows.some(e => e.id === u.employee_id)).map(u => ({
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        employee_id: u.employee_id,
        role_name: u.role_name,
        has_password: u.has_password,
        is_active: u.is_active
      }))
    };
    
    console.log(`✅ [Diagnostic] Found ${results.employees.length} employees, ${users.rows.length} users`);
    
    res.json(results);
  } catch (error) {
    console.error('❌ [Diagnostic] Error:', error);
    res.status(500).json({ error: 'Diagnostic failed', details: error.message });
  }
});

export default router;

