import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithSite } from '../test/render';
import { siteFixture } from '../test/fixtures';
import { ReservationForm } from './ReservationForm';

/**
 * A local calendar date `daysFromNow` away, as `YYYY-MM-DD`. Built from the
 * local parts rather than `toISOString`, which would shift the day for any
 * timezone behind UTC and make these tests fail only in some places.
 */
function soon(daysFromNow = 1) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Stands in for the booking endpoint. */
function mockFetch(response) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 201,
    json: async () => response.body ?? {},
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderForm(options) {
  const result = renderWithSite(<ReservationForm {...(options?.props ?? {})} />, options);
  // Wait for the live site data (the bookable spaces arrive with it).
  await screen.findByLabelText(/space/i);
  return result;
}

async function fillRequired(
  user,
  { name = 'Priya', phone = '+94 77 123 4567', date = soon() } = {}
) {
  await user.type(screen.getByLabelText('Name'), name);
  if (phone) await user.type(screen.getByLabelText(/phone or whatsapp/i), phone);
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } });
}

const submit = (user) => user.click(screen.getByRole('button', { name: /request a table/i }));

beforeEach(() => {
  vi.stubGlobal('open', vi.fn());
});

afterEach(() => vi.unstubAllGlobals());

describe('ReservationForm — sending', () => {
  it('posts the booking to the API', async () => {
    const user = userEvent.setup();
    await renderForm();
    const fetchMock = mockFetch({ body: { id: 'abc' } });

    const date = soon(3);
    await fillRequired(user, { date });
    await user.type(screen.getByLabelText('Email'), 'priya@example.com');
    await user.click(screen.getByRole('radio', { name: 'Dinner' }));
    await user.click(screen.getByRole('button', { name: /one more guest/i }));
    await user.selectOptions(screen.getByLabelText(/space/i), 'r1');
    await user.type(screen.getByLabelText(/anything we should know/i), 'One vegan');
    await submit(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/reservations');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toStrictEqual({
      name: 'Priya',
      phone: '+94 77 123 4567',
      email: 'priya@example.com',
      date,
      time: 'Dinner',
      guests: 3,
      roomId: 'r1',
      message: 'One vegan',
    });
  });

  it('only offers spaces that are taking bookings', async () => {
    await renderForm();
    const select = screen.getByLabelText(/space/i);
    expect(select).toHaveTextContent('The Deck');
    expect(select).not.toHaveTextContent('Chalets');
  });

  it('preselects a space passed in from the rooms page', async () => {
    await renderForm({ props: { initialRoomId: 'r1' } });
    expect(screen.getByLabelText(/space/i)).toHaveValue('r1');
  });

  it('confirms to the guest once the booking is accepted', async () => {
    const user = userEvent.setup();
    await renderForm();
    mockFetch({ body: { id: 'abc' } });

    await fillRequired(user, { name: 'Nuwan' });
    await submit(user);

    expect(await screen.findByText(/thank you, nuwan/i)).toBeInTheDocument();
    // The form is gone, so the same booking cannot be sent twice.
    expect(screen.queryByRole('button', { name: /request a table/i })).not.toBeInTheDocument();
  });
});

describe('ReservationForm — validation', () => {
  it('asks for a name, a way to reach the guest and a date before sending anything', async () => {
    const user = userEvent.setup();
    await renderForm();
    const fetchMock = mockFetch({});

    await submit(user);

    expect(screen.getByText(/who the table is for/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number or email so we can confirm/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a date/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts an email in place of a phone number', async () => {
    const user = userEvent.setup();
    await renderForm();
    const fetchMock = mockFetch({ body: { id: 'x' } });

    await fillRequired(user, { phone: '' });
    await user.type(screen.getByLabelText('Email'), 'guest@example.com');
    await submit(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });

  it('refuses a date in the past', async () => {
    const user = userEvent.setup();
    await renderForm();
    mockFetch({});

    await fillRequired(user, { date: soon(-2) });
    await submit(user);

    expect(screen.getByText(/today or a later date/i)).toBeInTheDocument();
  });

  it('does not show errors until the first attempt to send', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.type(screen.getByLabelText('Name'), 'P');
    await user.clear(screen.getByLabelText('Name'));
    expect(screen.queryByText(/who the table is for/i)).not.toBeInTheDocument();
  });
});

describe('ReservationForm — when the server says no', () => {
  it('shows the server’s field errors against the right fields', async () => {
    const user = userEvent.setup();
    await renderForm();
    mockFetch({
      ok: false,
      status: 422,
      body: {
        error: 'Some details need checking.',
        errors: { date: 'Please choose today or a later date.' },
      },
    });

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByText('Some details need checking.')).toBeInTheDocument();
    expect(screen.getByText('Please choose today or a later date.')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true');
  });

  it('offers WhatsApp when the server cannot be reached', async () => {
    const user = userEvent.setup();
    await renderForm();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/whatsapp/i);
    await user.click(screen.getByRole('button', { name: /send on whatsapp instead/i }));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/94742373394'),
      '_blank',
      'noopener'
    );
  });

  it('tells the guest to call when online booking is switched off', async () => {
    renderWithSite(<ReservationForm />, {
      site: siteFixture({ settings: { reservations: { acceptingOnline: false } } }),
    });
    expect(await screen.findByText(/taking bookings by phone/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request a table/i })).not.toBeInTheDocument();
  });
});
