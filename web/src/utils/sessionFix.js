/**
 * Session Fix Utility
 * Handles proper session cleanup and prevents loading loops
 * NOTE: Session token is now HttpOnly cookie-only (not in localStorage)
 */

import { clearCSRFToken } from '../config/api.js';

// Clear all session-related data from localStorage
// (Session itself is cookie-based, cleared by server on logout)
export const clearAllSessionData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('passwordWarning');
  
  // Clear CSRF token from memory
  clearCSRFToken();
  
  // Clear any cached settings that might cause issues
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('preferences_') || key.startsWith('security_') || key.startsWith('notifications_'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear session extension interval
  if (window._sessionExtensionInterval) {
    clearInterval(window._sessionExtensionInterval);
    window._sessionExtensionInterval = null;
  }
  
  console.log('🧹 [SessionFix] Cleared all session data and cached settings');
};

// Check if session is valid by making a test request to the server
// (Server validates the HttpOnly session cookie)
export const validateSession = async (API) => {
  try {
    const response = await API("/api/auth/session");
    return response && response.user;
  } catch (error) {
    console.log('🔍 [SessionFix] Session validation failed:', error.message);
    return false;
  }
};

// Force logout and redirect to login
export const forceLogout = () => {
  clearAllSessionData();
  
  // Reload page to reset app state
  window.location.reload();
};

// Check and fix session on app load
// Validates session by calling server (not by checking localStorage)
export const checkAndFixSession = async (API) => {
  console.log('🔍 [SessionFix] Validating session with server...');
  
  const isValid = await validateSession(API);
  
  if (!isValid) {
    console.log('❌ [SessionFix] Session invalid, clearing local data');
    clearAllSessionData();
    return false;
  }
  
  console.log('✅ [SessionFix] Session valid');
  return true;
};
