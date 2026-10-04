import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthorizedHandler } from './api';
import { mockFetch } from './test/helpers';

afterEach(() => setUnauthorizedHandler(null));

describe('api', () => {
  it('sends the admin header, JSON, and same-origin credentials', async () => {
    const fetch = mockFetch({ 'PATCH /admin/menu-items/abc': { item: { id: 'abc' } } });
    await api.patch('/admin/menu-items/abc', { name: 'Watalappan' });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/admin/menu-items/abc');
    expect(init.headers['X-Requested-With']).toBe('hillsedge-admin');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body)).toEqual({ name: 'Watalappan' });
  });

  it('surfaces the server’s field errors on a 422', async () => {
    mockFetch({
      'POST /admin/categories': {
        status: 422,
        body: { error: 'Some details need checking.', errors: { name: 'This is required.' } },
      },
    });
    const error = await api.post('/admin/categories', {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe('Some details need checking.');
    expect(error.errors).toEqual({ name: 'This is required.' });
  });

  it('reports an expired session, but not a failed sign-in', async () => {
    const onExpired = vi.fn();
    setUnauthorizedHandler(onExpired);
    mockFetch({
      'GET /admin/dashboard': { status: 401, body: { error: 'Please sign in.' } },
      'POST /auth/login': { status: 401, body: { error: 'That email and password do not match.' } },
    });

    await api.get('/admin/dashboard').catch(() => {});
    expect(onExpired).toHaveBeenCalledTimes(1);

    await api.post('/auth/login', {}).catch(() => {});
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('turns a network failure into a readable error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/admin/rooms')).rejects.toThrow(/could not reach the server/i);
  });
});
