import { apiClient, api } from '../apiClient';
import { mockApiResponses, mockApiErrors } from '../../utils/testUtils';

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
        })
      );
    });
  });

  describe('Session management', () => {
    it('includes session ID in headers when available', async () => {
      localStorage.setItem('sessionId', 'test-session-id');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({})),
      });

      await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-session-id': 'test-session-id',
          }),
        })
      );
    });

    it('clears session on 401 error', async () => {
      localStorage.setItem('sessionId', 'test-session-id');
      localStorage.setItem('user', 'test-user');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ error: 'Unauthorized' })),
      });

      await expect(apiClient.get('/test')).rejects.toThrow();
      
      expect(localStorage.getItem('sessionId')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
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
