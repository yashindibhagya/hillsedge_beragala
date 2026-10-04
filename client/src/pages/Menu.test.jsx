import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithSite } from '../test/render';
import Menu from './Menu';

async function renderMenu(options) {
  const result = renderWithSite(<Menu />, { route: '/menu', ...options });
  await screen.findByRole('heading', { name: 'Smokehouse & BBQ' });
  return result;
}

const dishButton = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => null });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('Menu', () => {
  it('lists each category with its dishes', async () => {
    await renderMenu();
    const smoke = screen.getByRole('region', { name: 'Smokehouse & BBQ' });
    expect(within(smoke).getByText('Sharing Platter')).toBeInTheDocument();
    expect(within(smoke).getByText('Grilled Corn')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Desserts' })).toHaveTextContent('Watalappan');
  });

  it('formats prices, and shows none where none is set', async () => {
    await renderMenu();
    expect(dishButton('Sharing Platter')).toHaveTextContent(/6,500/);
    expect(dishButton('Grilled Corn')).not.toHaveTextContent(/LKR|Rs/);
  });

  it('keeps sold-out dishes on the menu, labelled', async () => {
    await renderMenu();
    expect(dishButton('Grilled Corn')).toHaveTextContent('Sold out');
  });

  it('searches names, descriptions and ingredients', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.type(screen.getByRole('searchbox', { name: /search the menu/i }), 'brisket');

    await waitFor(() => expect(screen.queryByText('Watalappan')).not.toBeInTheDocument());
    expect(screen.getByText('Sharing Platter')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 dish matches');
  });

  it('filters to vegan dishes, and hides categories left empty', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'Vegan' }));

    expect(screen.getByRole('button', { name: 'Vegan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Grilled Corn')).toBeInTheDocument();
    expect(screen.queryByText('Sharing Platter')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Desserts' })).not.toBeInTheDocument();
  });

  it('combines filters, and offers a way back when nothing matches', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'Vegan' }));
    await user.click(screen.getByRole('button', { name: 'Available now' }));

    expect(screen.getByText(/nothing on the menu matches/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear search and filters/i }));
    expect(screen.getByText('Sharing Platter')).toBeInTheDocument();
  });

  it('opens a dish in a dialog with its full details, and counts the view', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(dishButton('Sharing Platter'));

    const dialog = screen.getByRole('dialog', { name: 'Sharing Platter' });
    expect(within(dialog).getByText('Brisket, Pickles')).toBeInTheDocument();
    expect(within(dialog).getByText('Mustard')).toBeInTheDocument();
    expect(within(dialog).getByText('Bestseller')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/menu/i1/view',
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('closes the dish on Escape and returns focus to it', async () => {
    const user = userEvent.setup();
    await renderMenu();

    const opener = dishButton('Watalappan');
    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('opens straight to a dish from a shared link', async () => {
    await renderMenu({ route: '/menu?dish=watalappan' });
    expect(await screen.findByRole('dialog', { name: 'Watalappan' })).toBeInTheDocument();
  });

  it('says so, with a retry, when the menu cannot be loaded', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    renderWithSite(<Menu />, {
      menu: () => {
        attempts += 1;
        return Promise.reject(new Error('We could not reach the restaurant.'));
      },
    });

    expect(await screen.findByText(/menu did not load/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(attempts).toBe(2);
  });
});
