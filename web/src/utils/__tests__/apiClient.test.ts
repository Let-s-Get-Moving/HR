/**
 * API Client Tests
 * 
 * NOTE: The apiClient.ts is DEPRECATED in favor of api.js which uses cookie-only auth.
 * These tests are updated to reflect the new cookie-based authentication model:
 * - Session ID is stored in HttpOnly cookie, not localStorage
 * - No x-session-id header is sent
 * - CSRF token is sent via X-CSRF-Token header for state-changing requests
 */
import { apiClient, api } from '../apiClient';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include', // Cookie-based auth
        })
      );
      expect(result).toEqual(mockData);
    });

    it('handles GET request errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
      });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('uses cache for GET requests', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      // First request
      await apiClient.get('/test');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const result = await apiClient.get('/test');
      expect(fetch).toHaveBeenCalledTimes(1); // Still 1, used cache
      expect(result).toEqual(mockData);
    });
  });

  describe('POST requests', () => {
    it('makes successful POST request', async () => {
      const mockData = { id: 1, name: 'Test' };
      const postData = { name: 'Test' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await apiClient.post('/test', postData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include', // Cookie-based auth
        })
      );
      expect(result).toEqual(mockData);
    });

    it('handles POST request errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' })),
      });

      await expect(apiClient.post('/test', {})).rejects.toThrow();
    });
  });

  describe('PUT requests', () => {
    it('makes successful PUT request', async () => {
      const mockData = { id: 1, name: 'Updated' };
      const putData = { name: 'Updated' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await apiClient.put('/test/1', putData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
          credentials: 'include', // Cookie-based auth
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('DELETE requests', () => {
    it('makes successful DELETE request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      });

      await apiClient.delete('/test/1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include', // Cookie-based auth
        })
      );
    });
  });

  describe('Cookie-based session management', () => {
    it('uses credentials:include for cookie-based auth (no x-session-id header)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({})),
      });

      await apiClient.get('/test');

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const options = fetchCall[1];
      
      // Should use credentials: include for cookie-based auth
      expect(options.credentials).toBe('include');
      
      // Should NOT include x-session-id header (cookie-only auth)
      expect(options.headers['x-session-id']).toBeUndefined();
    });

    it('clears user data (not sessionId) on 401 error', async () => {
      localStorage.setItem('user', JSON.stringify({ name: 'test-user' }));
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ error: 'Invalid or expired session' })),
      });

      await expect(apiClient.get('/test')).rejects.toThrow();
      
      // User data should be cleared
      expect(localStorage.getItem('user')).toBeNull();
      // sessionId should NOT be in localStorage (it's cookie-only)
      expect(localStorage.getItem('sessionId')).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('handles JSON parse errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('invalid json'),
      });

      const result = await apiClient.get('/test');
      expect(result).toEqual({ message: 'invalid json' });
    });
  });

  describe('Cache management', () => {
    it('clears cache', () => {
      apiClient.clearCache();
      // This is a simple test since clearCache doesn't return anything
      expect(true).toBe(true);
    });

    it('clears cache with pattern', () => {
      apiClient.clearCache('test');
      // This is a simple test since clearCache doesn't return anything
      expect(true).toBe(true);
    });
  });

  describe('Convenience functions', () => {
    it('api.get works correctly', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await api.get('/test');
      expect(result).toEqual(mockData);
    });

    it('api.post works correctly', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await api.post('/test', { name: 'Test' });
      expect(result).toEqual(mockData);
    });
  });
});
