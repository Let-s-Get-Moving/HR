/**
 * User Management Service
 * Handles CRUD operations for HR users with RBAC
 */

import { q } from '../db.js';
import { hashPassword } from '../utils/security.js';

export class UserManagementService {
  /**
   * Create a new HR user
   */
  static async createUser(userData, createdBy) {
    const {
      email,
      first_name,
      last_name,
      full_name,
      password,
      role_id
    } = userData;

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const result = await q(`
      INSERT INTO users (
        email, first_name, last_name, full_name, 
        password_hash, role_id, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING id, email, first_name, last_name, full_name, role_id, is_active, created_at
    `, [email, first_name, last_name, full_name || `${first_name} ${last_name}`, password_hash, role_id, createdBy]);

    return result.rows[0];
  }

  /**
   * Get all users with role information
   */
  static async getAllUsers() {
    const result = await q(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.is_active,
        u.last_login,
        u.created_at,
        u.employee_id,
        r.role_name,
        r.display_name as role_display_name,
        e.status as employee_status
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.created_at DESC
    `);

    return result.rows;
  }

  /**
   * Get user by ID with full details
   */
  static async getUserById(userId) {
    const result = await q(`
      SELECT 
        u.*,
        r.role_name,
        r.display_name as role_display_name,
        r.permissions as role_permissions
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);

    return result.rows[0] || null;
  }

  /**
   * Update user
   */
  static async updateUser(userId, updates) {
    const allowedFields = ['email', 'first_name', 'last_name', 'full_name', 'role_id', 'is_active'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await q(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, full_name, role_id, is_active
    `, values);

    return result.rows[0];
  }

  /**
   * Update user password
   */
  static async updatePassword(userId, newPassword) {
    const password_hash = await hashPassword(newPassword);

    await q(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [password_hash, userId]);

    return true;
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(userId) {
    await q(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    // Disable MFA when user is deactivated
    await q(`
      UPDATE user_mfa 
      SET mfa_enabled = false 
      WHERE user_id = $1
    `, [userId]);

    // Invalidate all sessions
    await q(`
      DELETE FROM user_sessions WHERE user_id = $1
    `, [userId]);

    return true;
  }

  /**
   * Reactivate user
   */
  static async reactivateUser(userId) {
    await q(`
      UPDATE users 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    return true;
  }

  /**
   * Delete user (hard delete)
   */
  static async deleteUser(userId) {
    await q(`DELETE FROM users WHERE id = $1`, [userId]);
    return true;
  }

  /**
   * Get all available roles
   */
  static async getRoles() {
    const result = await q(`
      SELECT id, role_name, display_name, description, permissions
      FROM hr_roles
      ORDER BY 
        CASE role_name
          WHEN 'hr_admin' THEN 1
          WHEN 'hr_manager' THEN 2
          WHEN 'hr_user' THEN 3
          ELSE 4
        END
    `);

    return result.rows;
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(userId, resource, permission) {
    const result = await q(`
      SELECT check_user_permission($1, $2, $3) as has_permission
    `, [userId, resource, permission]);

    return result.rows[0]?.has_permission || false;
  }

  /**
   * Log user activity
   */
  static async logActivity(userId, action, resource = null, resourceId = null, details = null) {
    await q(`
      INSERT INTO user_activity_log (user_id, action, resource, resource_id, details)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, action, resource, resourceId, details]);
  }

  /**
   * Get user activity log
   */
  static async getUserActivity(userId, limit = 50) {
    const result = await q(`
      SELECT 
        action,
        resource,
        resource_id,
        details,
        created_at
      FROM user_activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    await q(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [userId]);
  }
}

export default UserManagementService;

