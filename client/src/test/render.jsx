import { render } from '@testing-library/react';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { SiteDataProvider } from '../context/SiteData';
import { HeroProvider } from '../context/Hero';
import { menuFixture, siteFixture } from './fixtures';

/** Renders a component inside a plain router, which most of the app needs. */
export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/**
 * Renders inside the same providers the app uses — a data router (so
 * view-transition links behave as in production), live site data from
 * fixtures instead of the network, and the hero context.
 */
export function renderWithSite(
  ui,
  { route = '/', site = siteFixture(), menu = menuFixture() } = {}
) {
  const loadSite = typeof site === 'function' ? site : () => Promise.resolve(site);
  const loadMenu = typeof menu === 'function' ? menu : () => Promise.resolve(menu);
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <SiteDataProvider loadSite={loadSite} loadMenu={loadMenu}>
            <HeroProvider>{ui}</HeroProvider>
          </SiteDataProvider>
        ),
      },
    ],
    { initialEntries: [route] }
  );
  const result = render(<RouterProvider router={router} />);
  return { ...result, router };
}

export * from '@testing-library/react';
