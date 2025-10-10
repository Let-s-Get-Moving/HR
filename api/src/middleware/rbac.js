// Simplified 3-Role RBAC Middleware
// Roles: admin, manager, user
import { q } from "../db.js";

// Define the 3 roles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
};

// Define permissions structure
export const PERMISSIONS = {
  // Employee Management
  EMPLOYEES_VIEW: 'employees:read',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  
  // Payroll
  PAYROLL_VIEW: 'payroll:read',
  PAYROLL_CREATE: 'payroll:create',
  PAYROLL_UPDATE: 'payroll:update',
  PAYROLL_DELETE: 'payroll:delete',
  
  // Time Tracking
  TIME_VIEW: 'timecards:read',
  TIME_CREATE: 'timecards:create',
  TIME_UPDATE: 'timecards:update',
  TIME_DELETE: 'timecards:delete',
  
  // Leave Management
  LEAVE_VIEW: 'leave:read',
  LEAVE_CREATE: 'leave:create',
  LEAVE_UPDATE: 'leave:update',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_DELETE: 'leave:delete',
  
  // Bonuses & Commissions
  BONUSES_VIEW: 'bonuses:read',
  BONUSES_CREATE: 'bonuses:create',
  BONUSES_UPDATE: 'bonuses:update',
  BONUSES_APPROVE: 'bonuses:approve',
  BONUSES_DELETE: 'bonuses:delete',
  
  COMMISSIONS_VIEW: 'commissions:read',
  COMMISSIONS_CREATE: 'commissions:create',
  COMMISSIONS_UPDATE: 'commissions:update',
  COMMISSIONS_DELETE: 'commissions:delete',
  
  // Settings
  SETTINGS_VIEW: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  
  // Analytics & Reports
  ANALYTICS_VIEW: 'analytics:read',
  REPORTS_VIEW: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  
  // Recruiting
  RECRUITING_VIEW: 'recruiting:read',
  RECRUITING_CREATE: 'recruiting:create',
  RECRUITING_UPDATE: 'recruiting:update',
  RECRUITING_DELETE: 'recruiting:delete',
  
  // Performance
  PERFORMANCE_VIEW: 'performance:read',
  PERFORMANCE_CREATE: 'performance:create',
  PERFORMANCE_UPDATE: 'performance:update',
  PERFORMANCE_DELETE: 'performance:delete',
  
  // Benefits
  BENEFITS_VIEW: 'benefits:read',
  BENEFITS_CREATE: 'benefits:create',
  BENEFITS_UPDATE: 'benefits:update',
  BENEFITS_DELETE: 'benefits:delete',
  
  // System Administration
  SYSTEM_ADMIN: 'system:manage',
  USER_MANAGEMENT: 'users:manage'
};

// Role-Permission mapping
export const ROLE_PERMISSIONS = {
  // Admin and Manager have full access
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: Object.values(PERMISSIONS),
  
  // User has limited access - only own data
  [ROLES.USER]: [
    PERMISSIONS.TIME_VIEW,
    PERMISSIONS.TIME_CREATE,
    PERMISSIONS.TIME_UPDATE,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.BONUSES_VIEW,
    PERMISSIONS.COMMISSIONS_VIEW,
    PERMISSIONS.SETTINGS_VIEW
  ]
};

// Get user role and info from database
export const getUserRole = async (userId) => {
  try {
    const { rows } = await q(`
      SELECT r.role_name, r.permissions->>'scope' as scope
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    if (rows.length === 0) {
      console.log('⚠️ [RBAC] User not found, defaulting to user role');
      return { role: ROLES.USER, scope: 'own', employeeId: null };
    }
    
    const userRole = rows[0].role_name || ROLES.USER;
    const scope = rows[0].scope || 'own';
    
    console.log(`✅ [RBAC] User ${userId} has role: ${userRole}, scope: ${scope}`);
    
    return {
      role: userRole,
      scope: scope,
      employeeId: null // We'll add employee_id column support later
    };
  } catch (error) {
    console.error('❌ [RBAC] Error getting user role:', error);
    return { role: ROLES.USER, scope: 'own', employeeId: null };
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
      
      const userInfo = await getUserRole(req.user.id);
      
      if (!hasPermission(userInfo.role, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          userRole: userInfo.role
        });
      }
      
      // Attach role info to request
      req.userRole = userInfo.role;
      req.userScope = userInfo.scope;
      req.employeeId = userInfo.employeeId;
      
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Multiple permissions middleware (user needs ANY of the permissions)
export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userInfo = await getUserRole(req.user.id);
      
      const hasAnyPermission = permissions.some(permission => 
        hasPermission(userInfo.role, permission)
      );
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          userRole: userInfo.role
        });
      }
      
      req.userRole = userInfo.role;
      req.userScope = userInfo.scope;
      req.employeeId = userInfo.employeeId;
      
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
      
      const userInfo = await getUserRole(req.user.id);
      
      if (!roleArray.includes(userInfo.role)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          required: roleArray,
          userRole: userInfo.role
        });
      }
      
      req.userRole = userInfo.role;
      req.userScope = userInfo.scope;
      req.employeeId = userInfo.employeeId;
      
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

// Data scope filtering middleware
// For 'user' role, filter queries to only show their own data
export const applyScopeFilter = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.log('⚠️ [RBAC] applyScopeFilter: No user in request, skipping');
      // Don't fail - let requireAuth handle authentication
      return next();
    }
    
    console.log(`🔍 [RBAC] applyScopeFilter: Getting role for user ${req.user.id}`);
    const userInfo = await getUserRole(req.user.id);
    
    req.userRole = userInfo.role;
    req.userScope = userInfo.scope;
    req.employeeId = userInfo.employeeId;
    
    console.log(`✅ [RBAC] applyScopeFilter: User ${req.user.id} - Role: ${req.userRole}, Scope: ${req.userScope}`);
    
    next();
  } catch (error) {
    console.error('❌ [RBAC] Scope filter middleware error:', error);
    // Don't fail the request - just log and continue
    next();
  }
};

// Helper to build WHERE clause for scope filtering
export const buildScopeFilter = (req, employeeIdColumn = 'employee_id') => {
  if (req.userScope === 'own' && req.employeeId) {
    return {
      clause: `${employeeIdColumn} = $`,
      value: req.employeeId
    };
  }
  return null;
};
