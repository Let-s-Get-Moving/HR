import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API, clearCSRFToken, setCSRFToken } from '../api.js';

describe('API wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCSRFToken();
    localStorage.clear();
  });

  it('keeps CSRF header when custom headers are passed', async () => {
    setCSRFToken('csrf-test-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ ok: true })
    });

    await API('/api/test', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' })
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-CSRF-Token']).toBe('csrf-test-token');
  });

  it('throws structured API errors with request id and code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: (key) => (key.toLowerCase() === 'content-type' ? 'application/json' : key.toLowerCase() === 'x-request-id' ? 'req-123' : null)
      },
      json: async () => ({
        error: 'CSRF token required',
        message: 'Missing CSRF token',
        code: 'CSRF_MISSING',
        details: 'Missing header'
      })
    });

    await expect(API('/api/test', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      name: 'APIError',
      status: 403,
      code: 'CSRF_MISSING',
      error: 'CSRF token required',
      message: 'Missing CSRF token',
      details: 'Missing header',
      requestId: 'req-123',
      method: 'POST'
    });
  });
});
