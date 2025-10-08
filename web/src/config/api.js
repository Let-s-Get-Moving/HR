// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com';

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('Final API_BASE_URL:', API_BASE_URL);
}

export const API = (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  
  // Get session ID from localStorage
  const sessionId = localStorage.getItem('sessionId');
  
  // ALWAYS log for debugging 401 errors
  console.log('🔍 [API] Making request to:', url);
  console.log('🔍 [API] Method:', options.method || 'GET');
  console.log('🔍 [API] Session ID from localStorage:', sessionId ? sessionId.substring(0, 15) + '...' : 'NONE');
  console.log('🔍 [API] Options headers:', options.headers);
  
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(sessionId && { 'x-session-id': sessionId }),
  };
  
  console.log('🔍 [API] Final headers being sent:', finalHeaders);
  
  return fetch(url, {
    credentials: 'include', // Required to send cookies cross-origin
    headers: finalHeaders,
    ...options,
  }).then(async (response) => {
    if (import.meta.env.DEV) {
      console.log('API response status:', response.status);
    }
    
    if (!response.ok) {
      const error = await response.text();
      if (import.meta.env.DEV) {
        console.error('API error:', error);
      }
      
      // If session expired, clear it from localStorage
      if (response.status === 401 && (error.includes('Invalid or expired session') || error.includes('No session') || error.includes('Authentication required'))) {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        if (import.meta.env.DEV) {
          console.log('Cleared expired session ID and user data');
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return null;
    }
    
    const data = await response.json();
    
    // If this is a login response, store the session ID
    if (path.includes('/auth/login') && data.sessionId) {
      localStorage.setItem('sessionId', data.sessionId);
      if (import.meta.env.DEV) {
        console.log('Stored session ID:', data.sessionId);
      }
    }
    
    // If this is a logout response, clear the session ID
    if (path.includes('/auth/logout') && response.ok) {
      localStorage.removeItem('sessionId');
      if (import.meta.env.DEV) {
        console.log('Cleared session ID');
      }
    }
    
    return data;
  }).catch(error => {
    if (import.meta.env.DEV) {
      console.error('API request failed:', error);
    }
    throw error;
  });
};

// Helper function to clear session
export const clearSession = () => {
  localStorage.removeItem('sessionId');
  if (import.meta.env.DEV) {
    console.log('Session cleared');
  }
};

// Helper function to check if we have a session
export const hasSession = () => {
  return !!localStorage.getItem('sessionId');
};

// Helper function to get session ID
export const getSessionId = () => {
  return localStorage.getItem('sessionId');
};
