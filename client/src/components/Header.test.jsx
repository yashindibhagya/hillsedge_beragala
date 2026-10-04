import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { renderWithSite } from '../test/render';
import { Header } from './Header';
import { navLinks } from '../data/routes';

const primary = navLinks.filter((link) => link.nav !== false);

describe('Header', () => {
  it('lists every main route in the desktop navigation', async () => {
    renderWithSite(<Header />);
    const desktop = await screen.findByRole('navigation', { name: 'Main' });
    for (const { label } of primary) {
      expect(within(desktop).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the current route for assistive technology', async () => {
    renderWithSite(<Header />, { route: '/menu' });
    const desktop = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(desktop).getByRole('link', { name: 'Menu' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(desktop).getByRole('link', { name: 'About' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('always offers a way to reserve', async () => {
    renderWithSite(<Header />);
    expect(await screen.findByRole('link', { name: 'Reserve' })).toHaveAttribute(
      'href',
      '/reservations'
    );
  });

  it('opens the menu as a modal dialog and locks the page behind it', async () => {
    const user = userEvent.setup();
    renderWithSite(<Header />);

    const toggle = await screen.findByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(toggle);

    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
    // Every page is reachable from the menu, the booking page included.
    for (const { label } of navLinks) {
      expect(within(dialog).getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('closes on Escape, releases the page and hands focus back', async () => {
    const user = userEvent.setup();
    renderWithSite(<Header />);

    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
    expect(toggle).toHaveFocus();
  });

  it('keeps Tab inside the open menu', async () => {
    const user = userEvent.setup();
    renderWithSite(<Header />);
    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 25; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('shows social links only for profiles that are set', async () => {
    const user = userEvent.setup();
    renderWithSite(<Header />);
    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/hillsedge'
    );
    expect(within(dialog).queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
  });
});
