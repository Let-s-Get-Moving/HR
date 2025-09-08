// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com';

// Debug logging
console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Final API_BASE_URL:', API_BASE_URL);

export const API = (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  console.log('Making API request to:', url);
  
  // Get session ID from localStorage
  const sessionId = localStorage.getItem('sessionId');
  console.log('Session ID from localStorage:', sessionId);
  
  return fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId && { 'X-Session-ID': sessionId }),
      ...options.headers,
    },
    ...options,
  }).then(async (response) => {
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API error:', error);
      
      // If session expired, clear it from localStorage
      if (response.status === 401 && (error.includes('Invalid or expired session') || error.includes('No session'))) {
        localStorage.removeItem('sessionId');
        console.log('Cleared expired session ID');
        
        // If this is not a session check request, redirect to login
        if (!path.includes('/auth/session')) {
          // Clear user state and redirect to login
          window.location.reload();
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const data = await response.json();
    
    // If this is a login response, store the session ID
    if (path.includes('/auth/login') && data.sessionId) {
      localStorage.setItem('sessionId', data.sessionId);
      console.log('Stored session ID:', data.sessionId);
    }
    
    // If this is a logout response, clear the session ID
    if (path.includes('/auth/logout') && response.ok) {
      localStorage.removeItem('sessionId');
      console.log('Cleared session ID');
    }
    
    return data;
  }).catch(error => {
    console.error('API request failed:', error);
    throw error;
  });
};

// Helper function to clear session
export const clearSession = () => {
  localStorage.removeItem('sessionId');
  console.log('Session cleared');
};

// Helper function to check if we have a session
export const hasSession = () => {
  return !!localStorage.getItem('sessionId');
};

// Helper function to get session ID
export const getSessionId = () => {
  return localStorage.getItem('sessionId');
};
