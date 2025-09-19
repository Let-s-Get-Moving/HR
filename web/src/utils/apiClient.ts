import { ApiError } from '@/types';
import { errorHandler } from './errorHandler';
import { withRetry, RetryStrategy } from './retry';
import { SecurityHeaders, RateLimiter, CSRFProtection } from './security';

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// API Client class with caching and error handling
class ApiClient {
  private baseURL: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Generate cache key
  private getCacheKey(endpoint: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  // Check if cache entry is valid
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Get from cache
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  // Set cache
  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  // Clear cache
  public clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Get session ID from localStorage
  private getSessionId(): string | null {
    return localStorage.getItem('sessionId');
  }

  // Handle API errors
  private handleError(response: Response, errorText: string, endpoint: string): ApiError {
    let errorMessage = 'An error occurred';
    let errorDetails: any = null;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData;
    } catch {
      errorMessage = errorText || `HTTP ${response.status}`;
    }

    // Clear session on auth errors
    if (response.status === 401) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
    }

    // Log error using error handler
    const appError = errorHandler.handleApiError(
      { status: response.status, message: errorMessage, details: errorDetails },
      { endpoint }
    );

    return new ApiError(response.status, errorMessage, errorDetails);
  }

  // Make API request
  public async request<T = any>(
    endpoint: string, 
    options: RequestInit = {},
    useCache: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const cacheKey = this.getCacheKey(endpoint, options);

    // Check cache for GET requests
    if (useCache && method === 'GET') {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...SecurityHeaders.getSecurityHeaders(),
      ...options.headers,
    };

    // Add session ID if available
    const sessionId = this.getSessionId();
    if (sessionId) {
      (headers as any)['x-session-id'] = sessionId;
    }

    // Add CSRF token for state-changing requests
    if (method !== 'GET') {
      const csrfToken = CSRFProtection.getToken();
      if (csrfToken) {
        (headers as any)['X-CSRF-Token'] = csrfToken;
      }
    }

    try {
      // Check rate limit
      if (!RateLimiter.isAllowed('api')) {
        throw new ApiError(429, 'Rate limit exceeded. Please try again later.');
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        throw this.handleError(response, responseText, endpoint);
      }

      // Cache successful GET requests
      if (useCache && method === 'GET' && response.status === 200) {
        this.setCache(cacheKey, data);
      }

      // Store session ID if provided
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        0, 
        error instanceof Error ? error.message : 'Network error',
        { originalError: error }
      );
    }
  }

  // Convenience methods with retry
  public async get<T = any>(endpoint: string, useCache: boolean = true, retry: boolean = true): Promise<T> {
    const operation = () => this.request<T>(endpoint, { method: 'GET' }, useCache);
    return retry ? withRetry(operation, RetryStrategy.exponentialBackoff()) : operation();
  }

  public async post<T = any>(endpoint: string, data?: any, retry: boolean = false): Promise<T> {
    const operation = () => this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
    return retry ? withRetry(operation, RetryStrategy.conservative()) : operation();
  }

  public async put<T = any>(endpoint: string, data?: any, retry: boolean = false): Promise<T> {
    const operation = () => this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
    return retry ? withRetry(operation, RetryStrategy.conservative()) : operation();
  }

  public async delete<T = any>(endpoint: string, retry: boolean = false): Promise<T> {
    const operation = () => this.request<T>(endpoint, { method: 'DELETE' }, false);
    return retry ? withRetry(operation, RetryStrategy.conservative()) : operation();
  }

  // Paginated requests
  public async getPaginated<T = any>(
    endpoint: string, 
    page: number = 1, 
    limit: number = 10,
    params?: Record<string, any>
  ): Promise<{ data: T[]; pagination: any }> {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...params,
    });
    
    return this.get(`${endpoint}?${searchParams}`);
  }

  // Upload file
  public async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary
        'x-session-id': this.getSessionId() || '',
      },
    }, false);
  }
}

// Create singleton instance
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-hr.onrender.com';
export const apiClient = new ApiClient(API_BASE_URL);

// Export convenience functions
export const api = {
  get: <T = any>(endpoint: string, useCache = true) => apiClient.get<T>(endpoint, useCache),
  post: <T = any>(endpoint: string, data?: any) => apiClient.post<T>(endpoint, data),
  put: <T = any>(endpoint: string, data?: any) => apiClient.put<T>(endpoint, data),
  delete: <T = any>(endpoint: string) => apiClient.delete<T>(endpoint),
  upload: <T = any>(endpoint: string, file: File, data?: any) => apiClient.uploadFile<T>(endpoint, file, data),
  clearCache: (pattern?: string) => apiClient.clearCache(pattern),
};

export default apiClient;
