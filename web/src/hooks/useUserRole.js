// Hook to get current user role
import { useState, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager.js';

export function useUserRole() {
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [salesRole, setSalesRole] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  
  useEffect(() => {
    const user = sessionManager.getUser();
    if (user) {
      setUserRole(user.role || 'user'); // Default to 'user' if no role
      setUserInfo(user);
      // Backend returns camelCase: salesRole, employeeId
      setSalesRole(user.salesRole || null);
      setEmployeeId(user.employeeId || null);
    }
  }, []);
  
  return { userRole, userInfo, salesRole, employeeId };
}

// Helper functions
export function isAdmin(role) {
  return role === 'admin';
}

export function isManager(role) {
  return role === 'manager';
}

export function isUser(role) {
  return role === 'user';
}

export function hasFullAccess(role) {
  return role === 'admin' || role === 'manager';
}

// Sales role helper functions
export function isSalesAgent(salesRole) {
  return salesRole === 'agent';
}

export function isSalesManager(salesRole) {
  return salesRole === 'manager';
}

export function hasSalesRole(salesRole) {
  return salesRole === 'agent' || salesRole === 'manager';
}

export function canApproveLeave(role) {
  return role === 'admin' || role === 'manager';
}

export function canViewAllEmployees(role) {
  return role === 'admin' || role === 'manager';
}

// Pages that users can access (limited role)
// User role can ONLY see: Employees, Time Tracking, Leave Management, Payroll, Bonuses & Commissions, Messages, Settings
export const USER_ALLOWED_PAGES = [
  'employees',      // Users can see their own employee info
  'timeTracking',   // Time Tracking
  'leave',          // Leave Management  
  'payroll',        // Payroll
  'bonuses',        // Bonuses & Commissions
  'messages',       // Messages - users can chat with HR
  'settings'        // Settings
];

export function canAccessPage(role, pageName) {
  if (hasFullAccess(role)) {
    return true; // Admin and Manager can access all pages
  }
  
  // User role - only specific pages
  return USER_ALLOWED_PAGES.includes(pageName);
}

