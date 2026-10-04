import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import { mockFetch, renderAt, screen, superAdmin } from './test/helpers';

function Harness() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <p>Signed in area</p>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('signing in', () => {
  it('sends a signed-out visitor to the sign-in page, then back', async () => {
    let signedIn = false;
    const fetch = mockFetch({
      'GET /auth/me': () =>
        signedIn ? { body: superAdmin } : { status: 401, body: { error: 'Please sign in.' } },
      'POST /auth/login': ({ body }) => {
        if (body.password !== 'correct horse')
          return { status: 401, body: { error: 'That email and password do not match.' } };
        signedIn = true;
        return { body: superAdmin };
      },
    });

    renderAt(<Harness />, '/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/do not match/i)).toHaveAttribute('role', 'alert');

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Signed in area')).toBeInTheDocument();
    const login = fetch.calls.filter((c) => c.path === '/auth/login').at(-1);
    expect(login.body).toEqual({ email: 'asha@example.com', password: 'correct horse' });
  });

  it('asks for both fields before calling the server', async () => {
    const fetch = mockFetch({ 'GET /auth/me': { status: 401, body: {} } });
    renderAt(<Harness />, '/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(/enter your email and password/i)).toHaveAttribute('role', 'alert');
    expect(fetch.calls.some((c) => c.path === '/auth/login')).toBe(false);
  });
});
