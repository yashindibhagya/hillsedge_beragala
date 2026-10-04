import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

/** A fetch stub that answers by `METHOD path`, recording every call. */
export function mockFetch(routes) {
  const calls = [];
  const fn = vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = String(url).replace(/^.*?\/api/, '');
    calls.push({
      method,
      path,
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.split(' ');
      return m === method && (p === path || (p.endsWith('*') && path.startsWith(p.slice(0, -1))));
    });
    const answer = key ? routes[key] : { status: 404, body: { error: 'not mocked' } };
    const resolved =
      typeof answer === 'function' ? answer({ method, path, body: calls.at(-1).body }) : answer;
    const status = resolved.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => resolved.body ?? resolved,
    };
  });
  fn.calls = calls;
  globalThis.fetch = fn;
  return fn;
}

export function renderAt(ui, route = '/') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

export const superAdmin = {
  user: {
    id: 'u1',
    name: 'Asha Perera',
    email: 'asha@example.com',
    role: 'super_admin',
    active: true,
  },
  permissions: [
    'dashboard',
    'menu:write',
    'menu:availability',
    'rooms:write',
    'rooms:availability',
    'reservations:read',
    'reservations:write',
    'reservations:delete',
    'media:write',
    'promotions:write',
    'testimonials:write',
    'content:write',
    'users:manage',
    'settings:write',
  ],
};

export const staff = {
  user: { id: 'u2', name: 'Nimal', email: 'nimal@example.com', role: 'staff', active: true },
  permissions: [
    'dashboard',
    'menu:availability',
    'rooms:availability',
    'reservations:read',
    'reservations:write',
  ],
};

export * from '@testing-library/react';
