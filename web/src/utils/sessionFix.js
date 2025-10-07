/**
 * Session Fix Utility
 * Handles proper session cleanup and prevents loading loops
 */

// Clear all session data
export const clearAllSessionData = () => {
  localStorage.removeItem('sessionId');
  localStorage.removeItem('user');
  localStorage.removeItem('passwordWarning');
  localStorage.removeItem('sessionExtensionInterval');
  
  // Clear any cached settings that might cause issues
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('preferences_') || key.startsWith('security_') || key.startsWith('notifications_'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log('🧹 [SessionFix] Cleared all session data and cached settings');
};

// Check if session is valid by making a test request
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
  
  // Clear any intervals
  const intervalId = localStorage.getItem("sessionExtensionInterval");
  if (intervalId) {
    clearInterval(parseInt(intervalId));
    localStorage.removeItem("sessionExtensionInterval");
  }
  
  // Reload page to reset app state
  window.location.reload();
};

// Check and fix session on app load
export const checkAndFixSession = async (API) => {
  const sessionId = localStorage.getItem('sessionId');
  
  if (!sessionId) {
    console.log('🔍 [SessionFix] No session ID found');
    return false;
  }
  
  console.log('🔍 [SessionFix] Found session ID, validating...');
  
  const isValid = await validateSession(API);
  
  if (!isValid) {
    console.log('❌ [SessionFix] Session invalid, clearing data');
    clearAllSessionData();
    return false;
  }
  
  console.log('✅ [SessionFix] Session valid');
  return true;
};
