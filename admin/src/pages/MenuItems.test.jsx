import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth';
import { ToastProvider } from '../components/Toast';
import { MediaProvider } from '../hooks/useMediaLibrary';
import MenuItems from './MenuItems';
import { mockFetch, renderAt, screen, staff, waitFor, within } from '../test/helpers';

const category = { id: 'c1', name: 'Desserts', order: 0, active: true };
const dish = {
  id: 'd1',
  name: 'Watalappan',
  description: '',
  price: 950,
  categoryId: 'c1',
  subcategory: '',
  imageId: null,
  availability: 'available',
  hidden: false,
  vegetarian: true,
  vegan: false,
  spicy: 0,
  featured: false,
  bestseller: false,
  special: false,
  order: 0,
};

function renderPage(fetchRoutes) {
  const fetch = mockFetch({
    'GET /auth/me': { body: staff },
    'GET /admin/media': { body: { items: [] } },
    'GET /admin/categories': { body: { items: [category] } },
    'GET /admin/menu-items': { body: { items: [dish] } },
    ...fetchRoutes,
  });
  renderAt(
    <ToastProvider>
      <AuthProvider>
        <MediaProvider>
          <MenuItems />
        </MediaProvider>
      </AuthProvider>
    </ToastProvider>,
    '/menu'
  );
  return fetch;
}

describe('dish availability', () => {
  it('marks a dish sold out through the availability endpoint', async () => {
    const fetch = renderPage({
      'PATCH /admin/menu-items/d1/availability': ({ body }) => ({
        body: { item: { ...dish, ...body } },
      }),
    });

    const group = await screen.findByRole('group', { name: 'Availability of Watalappan' });
    await userEvent.setup().click(within(group).getByLabelText('Sold out'));

    await waitFor(() => expect(fetch.calls.some((c) => c.method === 'PATCH')).toBe(true));
    const call = fetch.calls.find((c) => c.method === 'PATCH');
    expect(call.path).toBe('/admin/menu-items/d1/availability');
    expect(call.body).toEqual({ availability: 'sold_out' });
    expect(within(group).getByLabelText('Sold out')).toBeChecked();
    expect(await screen.findByText(/watalappan: sold out/i)).toBeInTheDocument();
  });

  it('puts the switch back if the server refuses', async () => {
    renderPage({
      'PATCH /admin/menu-items/d1/availability': {
        status: 403,
        body: { error: 'Your role does not allow that.' },
      },
    });
    const group = await screen.findByRole('group', { name: 'Availability of Watalappan' });
    await userEvent.setup().click(within(group).getByLabelText('Sold out'));
    expect(await screen.findByText('Your role does not allow that.')).toBeInTheDocument();
    expect(within(group).getByLabelText('Available')).toBeChecked();
  });

  it('does not offer staff the editing tools', async () => {
    renderPage({});
    await screen.findByRole('group', { name: 'Availability of Watalappan' });
    expect(screen.queryByRole('button', { name: /add dish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete watalappan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide watalappan/i })).toBeInTheDocument();
  });
});
