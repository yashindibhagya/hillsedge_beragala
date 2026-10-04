import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { renderWithSite } from '../test/render';
import { media, siteFixture } from '../test/fixtures';
import Gallery from './Gallery';

const tiles = () => screen.getAllByRole('button', { name: /^Open “/ });

async function renderGallery(options) {
  renderWithSite(<Gallery />, options);
  await screen.findAllByRole('button', { name: /^Open “/ });
}

describe('Gallery', () => {
  it('shows everything marked for the gallery', async () => {
    await renderGallery();
    expect(tiles()).toHaveLength(4);
  });

  it('narrows the wall to the chosen category', async () => {
    const user = userEvent.setup();
    await renderGallery();

    await user.click(screen.getByRole('tab', { name: 'The Table' }));

    expect(tiles()).toHaveLength(2);
    expect(screen.getByAltText(media.m3.alt)).toBeInTheDocument();
    expect(screen.queryByAltText(media.m1.alt)).not.toBeInTheDocument();
  });

  it('marks the active filter for assistive technology', async () => {
    const user = userEvent.setup();
    await renderGallery();

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'The Smokehouse' }));
    expect(screen.getByRole('tab', { name: 'The Smokehouse' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
  });

  it('offers a filter only for categories in use', async () => {
    await renderGallery();
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toStrictEqual(['All', 'The Place', 'The Smokehouse', 'The Table']);
  });

  it('opens a photograph in a lightbox and steps through with the keyboard', async () => {
    const user = userEvent.setup();
    await renderGallery();

    await user.click(tiles()[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1 / 4')).toBeInTheDocument();
    expect(within(dialog).getByText('The walk up')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(within(screen.getByRole('dialog')).getByText('2 / 4')).toBeInTheDocument();

    // Wraps rather than dead-ending.
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(within(screen.getByRole('dialog')).getByText('4 / 4')).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the photograph that opened it', async () => {
    const user = userEvent.setup();
    await renderGallery();

    const opener = tiles()[1];
    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('falls back to the bundled photographs when the server is unreachable', async () => {
    renderWithSite(<Gallery />, { site: () => Promise.reject(new Error('offline')) });
    const fallback = await screen.findAllByRole('button', { name: /^Open “/ });
    expect(fallback.length).toBeGreaterThan(4);
  });

  it('says nothing about filters when there is only one category', async () => {
    renderWithSite(<Gallery />, { site: siteFixture({ gallery: ['m1'] }) });
    await screen.findAllByRole('button', { name: /^Open “/ });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
