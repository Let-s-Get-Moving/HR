// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com';

// Debug logging
console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Final API_BASE_URL:', API_BASE_URL);

export const API = (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  console.log('Making API request to:', url);
  
  return fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }).then(async (response) => {
    console.log('API response status:', response.status);
    if (!response.ok) {
      const error = await response.text();
      console.error('API error:', error);
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    return response.json();
  }).catch(error => {
    console.error('API request failed:', error);
    throw error;
  });
};
