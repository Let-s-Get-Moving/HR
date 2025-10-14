// Hook to get current user role
import { useState, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager.js';

export function useUserRole() {
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  useEffect(() => {
    const user = sessionManager.getUser();
    if (user) {
      setUserRole(user.role || 'user'); // Default to 'user' if no role
      setUserInfo(user);
    }
  }, []);
  
  return { userRole, userInfo };
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

export function canApproveLeave(role) {
  return role === 'admin' || role === 'manager';
}

export function canViewAllEmployees(role) {
  return role === 'admin' || role === 'manager';
}

// Pages that users can access (limited role)
// User role can ONLY see: Employees, Time Tracking, Leave Management, Payroll, Bonuses & Commissions, Settings
export const USER_ALLOWED_PAGES = [
  'employees',      // Users can see their own employee info
  'timeTracking',   // Time Tracking
  'leave',          // Leave Management  
  'payroll',        // Payroll
  'bonuses',        // Bonuses & Commissions
  'settings'        // Settings
];

export function canAccessPage(role, pageName) {
  if (hasFullAccess(role)) {
    return true; // Admin and Manager can access all pages
  }
  
  // User role - only specific pages
  return USER_ALLOWED_PAGES.includes(pageName);
}

