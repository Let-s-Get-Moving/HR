// Role-Based Access Control (RBAC) Middleware
import { q } from "../db.js";

// Define roles and their permissions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR_ADMIN: 'hr_admin',
  HR_MANAGER: 'hr_manager',
  HR_SPECIALIST: 'hr_specialist',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // Employee Management
  EMPLOYEES_VIEW: 'employees:view',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  
  // Payroll
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_CREATE: 'payroll:create',
  PAYROLL_UPDATE: 'payroll:update',
  PAYROLL_DELETE: 'payroll:delete',
  
  // Time Tracking
  TIME_VIEW: 'time:view',
  TIME_CREATE: 'time:create',
  TIME_UPDATE: 'time:update',
  TIME_DELETE: 'time:delete',
  
  // Leave Management
  LEAVE_VIEW: 'leave:view',
  LEAVE_CREATE: 'leave:create',
  LEAVE_UPDATE: 'leave:update',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_DELETE: 'leave:delete',
  
  // Recruiting
  RECRUITING_VIEW: 'recruiting:view',
  RECRUITING_CREATE: 'recruiting:create',
  RECRUITING_UPDATE: 'recruiting:update',
  RECRUITING_DELETE: 'recruiting:delete',
  
  // Performance
  PERFORMANCE_VIEW: 'performance:view',
  PERFORMANCE_CREATE: 'performance:create',
  PERFORMANCE_UPDATE: 'performance:update',
  PERFORMANCE_DELETE: 'performance:delete',
  
  // Benefits
  BENEFITS_VIEW: 'benefits:view',
  BENEFITS_CREATE: 'benefits:create',
  BENEFITS_UPDATE: 'benefits:update',
  BENEFITS_DELETE: 'benefits:delete',
  
  // Bonuses & Commissions
  BONUSES_VIEW: 'bonuses:view',
  BONUSES_CREATE: 'bonuses:create',
  BONUSES_UPDATE: 'bonuses:update',
  BONUSES_APPROVE: 'bonuses:approve',
  BONUSES_DELETE: 'bonuses:delete',
  
  // Compliance
  COMPLIANCE_VIEW: 'compliance:view',
  COMPLIANCE_CREATE: 'compliance:create',
  COMPLIANCE_UPDATE: 'compliance:update',
  COMPLIANCE_DELETE: 'compliance:delete',
  
  // Analytics & Reports
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  
  // System Administration
  SYSTEM_ADMIN: 'system:admin',
  USER_MANAGEMENT: 'users:manage',
  ROLE_MANAGEMENT: 'roles:manage'
};

// Role-Permission mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.HR_ADMIN]: [
    PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE, PERMISSIONS.EMPLOYEES_DELETE,
    PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_CREATE, PERMISSIONS.PAYROLL_UPDATE, PERMISSIONS.PAYROLL_DELETE,
    PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE, PERMISSIONS.TIME_DELETE,
    PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_UPDATE, PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_DELETE,
    PERMISSIONS.RECRUITING_VIEW, PERMISSIONS.RECRUITING_CREATE, PERMISSIONS.RECRUITING_UPDATE, PERMISSIONS.RECRUITING_DELETE,
    PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_CREATE, PERMISSIONS.PERFORMANCE_UPDATE, PERMISSIONS.PERFORMANCE_DELETE,
    PERMISSIONS.BENEFITS_VIEW, PERMISSIONS.BENEFITS_CREATE, PERMISSIONS.BENEFITS_UPDATE, PERMISSIONS.BENEFITS_DELETE,
    PERMISSIONS.BONUSES_VIEW, PERMISSIONS.BONUSES_CREATE, PERMISSIONS.BONUSES_UPDATE, PERMISSIONS.BONUSES_APPROVE, PERMISSIONS.BONUSES_DELETE,
    PERMISSIONS.COMPLIANCE_VIEW, PERMISSIONS.COMPLIANCE_CREATE, PERMISSIONS.COMPLIANCE_UPDATE, PERMISSIONS.COMPLIANCE_DELETE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USER_MANAGEMENT, PERMISSIONS.ROLE_MANAGEMENT
  ],
  
  [ROLES.HR_MANAGER]: [
    PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYROLL_CREATE, PERMISSIONS.PAYROLL_UPDATE,
    PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE,
    PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_UPDATE, PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.RECRUITING_VIEW, PERMISSIONS.RECRUITING_CREATE, PERMISSIONS.RECRUITING_UPDATE,
    PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_CREATE, PERMISSIONS.PERFORMANCE_UPDATE,
    PERMISSIONS.BENEFITS_VIEW, PERMISSIONS.BENEFITS_CREATE, PERMISSIONS.BENEFITS_UPDATE,
    PERMISSIONS.BONUSES_VIEW, PERMISSIONS.BONUSES_CREATE, PERMISSIONS.BONUSES_UPDATE, PERMISSIONS.BONUSES_APPROVE,
    PERMISSIONS.COMPLIANCE_VIEW, PERMISSIONS.COMPLIANCE_CREATE, PERMISSIONS.COMPLIANCE_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT
  ],
  
  [ROLES.HR_SPECIALIST]: [
    PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE,
    PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_UPDATE,
    PERMISSIONS.RECRUITING_VIEW, PERMISSIONS.RECRUITING_CREATE, PERMISSIONS.RECRUITING_UPDATE,
    PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_CREATE, PERMISSIONS.PERFORMANCE_UPDATE,
    PERMISSIONS.BENEFITS_VIEW, PERMISSIONS.BENEFITS_CREATE, PERMISSIONS.BENEFITS_UPDATE,
    PERMISSIONS.BONUSES_VIEW, PERMISSIONS.BONUSES_CREATE, PERMISSIONS.BONUSES_UPDATE,
    PERMISSIONS.COMPLIANCE_VIEW, PERMISSIONS.COMPLIANCE_CREATE, PERMISSIONS.COMPLIANCE_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE,
    PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE, PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.PERFORMANCE_VIEW, PERMISSIONS.PERFORMANCE_CREATE, PERMISSIONS.PERFORMANCE_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW
  ],
  
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.TIME_VIEW, PERMISSIONS.TIME_CREATE, PERMISSIONS.TIME_UPDATE,
    PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.BENEFITS_VIEW,
    PERMISSIONS.BONUSES_VIEW
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ]
};

// Get user role from database
export const getUserRole = async (userId) => {
  try {
    const { rows } = await q(`
      SELECT role FROM users WHERE id = $1
    `, [userId]);
    
    return rows[0]?.role || ROLES.EMPLOYEE;
  } catch (error) {
    console.error('Error getting user role:', error);
    return ROLES.EMPLOYEE;
  }
};

// Check if user has permission
export const hasPermission = (userRole, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};

// RBAC middleware factory
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = await getUserRole(req.user.id);
      
      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          userRole: userRole
        });
      }
      
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Multiple permissions middleware
export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = await getUserRole(req.user.id);
      
      const hasAnyPermission = permissions.some(permission => 
        hasPermission(userRole, permission)
      );
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          userRole: userRole
        });
      }
      
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Role-based middleware
export const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = await getUserRole(req.user.id);
      
      if (!roleArray.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          required: roleArray,
          userRole: userRole
        });
      }
      
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};
