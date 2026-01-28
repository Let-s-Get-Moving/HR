/**
 * Primary API Client for HR Web Application
 * 
 * This is the standard API client used throughout the application.
 * 
 * Security features:
 * - Cookie-only auth (HttpOnly session cookie, not stored in JS)
 * - CSRF protection via X-CSRF-Token header
 * - Credentials included for cross-origin requests
 * 
 * Usage:
 *   import { API } from '@/config/api.js';
 *   const data = await API('/api/endpoint');
 *   await API('/api/endpoint', { method: 'POST', body: JSON.stringify(payload) });
 */

// API configuration
// In local dev with Vite proxy: use '' (relative paths) so requests go to Vite's proxy
// In production or when VITE_API_URL is set: use the full URL
const API_BASE_URL = import.meta.env.DEV && !import.meta.env.VITE_API_URL
  ? '' // Empty = use relative paths, Vite proxy handles /api/*
  : (import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com');

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('Final API_BASE_URL:', API_BASE_URL || '(relative - using Vite proxy)');
}

// In-memory CSRF token storage (NOT localStorage - prevents XSS theft)
let csrfToken = null;

// Set CSRF token (called after login or from /api/auth/csrf endpoint)
export const setCSRFToken = (token) => {
  csrfToken = token;
};

// Get CSRF token
export const getCSRFToken = () => csrfToken;

// Clear CSRF token (called on logout)
export const clearCSRFToken = () => {
  csrfToken = null;
};

export const API = (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  
  if (import.meta.env.DEV) {
    console.log('🔍 [API] Making request to:', url);
    console.log('🔍 [API] Method:', method);
  }
  
  // Build headers - NO sessionId header (cookie-only auth)
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && csrfToken) {
    finalHeaders['X-CSRF-Token'] = csrfToken;
  }
  
  if (import.meta.env.DEV) {
    console.log('🔍 [API] Final headers being sent:', finalHeaders);
  }
  
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
      
      // If session expired, clear user data (but NOT sessionId - it's cookie-only now)
      if (response.status === 401 && (error.includes('Invalid or expired session') || error.includes('No session') || error.includes('Authentication required'))) {
        localStorage.removeItem('user');
        clearCSRFToken();
        if (import.meta.env.DEV) {
          console.log('Cleared user data due to auth error');
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return null;
    }
    
    const data = await response.json();
    
    // Store CSRF token if provided in response (after login)
    if (data.csrfToken) {
      setCSRFToken(data.csrfToken);
      if (import.meta.env.DEV) {
        console.log('Stored CSRF token in memory');
      }
    }
    
    // If this is a logout response, clear CSRF token
    if (path.includes('/auth/logout') && response.ok) {
      clearCSRFToken();
      if (import.meta.env.DEV) {
        console.log('Cleared CSRF token');
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

// Fetch CSRF token from server (call after login/session restore)
export const fetchCSRFToken = async () => {
  try {
    const response = await API('/api/auth/csrf');
    if (response.csrfToken) {
      setCSRFToken(response.csrfToken);
      return response.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
};

// Helper function to clear session (clears user data only, session is cookie-based)
export const clearSession = () => {
  localStorage.removeItem('user');
  clearCSRFToken();
  if (import.meta.env.DEV) {
    console.log('Session cleared');
  }
};

// Helper function to check if we have a session (determined by server, not localStorage)
// This should call /api/auth/session to verify
export const hasSession = async () => {
  try {
    const response = await API('/api/auth/session');
    return !!(response && response.user);
  } catch {
    return false;
  }
};

/**
 * Upload helper for FormData (file uploads, imports)
 * Does NOT set Content-Type (browser sets multipart boundary automatically)
 * Still uses credentials: 'include' and adds X-CSRF-Token
 * 
 * @param {string} path - API endpoint path
 * @param {FormData} formData - FormData object with files/data
 * @param {object} options - Additional fetch options
 * @returns {Promise<Response>} - Raw fetch Response (caller handles JSON parsing)
 */
export const APIUpload = async (path, formData, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  
  if (import.meta.env.DEV) {
    console.log('🔍 [APIUpload] Uploading to:', url);
  }
  
  // Build headers - NO Content-Type (browser sets multipart boundary)
  const headers = {
    ...options.headers,
  };
  
  // Add CSRF token for uploads (they're always state-changing)
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
    ...options,
  });
  
  if (import.meta.env.DEV) {
    console.log('APIUpload response status:', response.status);
  }
  
  // If session expired, clear user data
  if (response.status === 401) {
    localStorage.removeItem('user');
    clearCSRFToken();
  }
  
  return response;
};

/**
 * Download helper for file downloads (blobs)
 * Uses credentials: 'include' for cookie-based auth
 * 
 * @param {string} path - API endpoint path
 * @returns {Promise<Response>} - Raw fetch Response (caller handles blob)
 */
export const APIDownload = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  
  if (import.meta.env.DEV) {
    console.log('🔍 [APIDownload] Downloading from:', url);
  }
  
  const response = await fetch(url, {
    credentials: 'include',
  });
  
  if (import.meta.env.DEV) {
    console.log('APIDownload response status:', response.status);
  }
  
  // If session expired, clear user data
  if (response.status === 401) {
    localStorage.removeItem('user');
    clearCSRFToken();
  }
  
  return response;
};
