import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth';
import { Sidebar } from './Layout';
import { mockFetch, renderAt, screen, staff, superAdmin } from '../test/helpers';

const renderSidebar = () =>
  renderAt(
    <AuthProvider>
      <Sidebar />
    </AuthProvider>
  );

describe('navigation', () => {
  it('shows staff only what their role can use', async () => {
    mockFetch({ 'GET /auth/me': { body: staff } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: /reservations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dishes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rooms & spaces/i })).toBeInTheDocument();
    for (const hidden of [
      /categories/i,
      /website content/i,
      /media library/i,
      /users & roles/i,
      /offers/i,
    ]) {
      expect(screen.queryByRole('link', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('shows a super admin everything, including users', async () => {
    mockFetch({ 'GET /auth/me': { body: superAdmin } });
    renderSidebar();
    expect(await screen.findByRole('link', { name: /users & roles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /website content/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /categories/i })).toBeInTheDocument();
  });
});
