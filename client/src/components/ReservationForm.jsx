import { useId, useMemo, useRef, useState } from 'react';
import { createReservation } from '../api/client';
import { useSite } from '../context/SiteData';
import { sittingOptions } from '../data/content';
import { formatDate, isBookable, lastBookableDay, telHref, today } from '../lib/format';
import { Button } from './Button';
import { Icon } from './Icon';

export const MAX_GUESTS = 200;
const FIELD_ORDER = ['name', 'phone', 'email', 'date', 'time', 'guests', 'roomId', 'message'];

/**
 * The same rules the server enforces (server/src/validators/reservation.js),
 * checked here so the guest hears about a slip without a round trip. The
 * server is still the authority: anything it rejects is mapped back onto the
 * fields below.
 */
export function validate(values, minDate) {
  const errors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();

  if (!name) errors.name = 'Please tell us who the table is for.';
  else if (name.length > 120) errors.name = 'Please keep the name under 120 characters.';

  const phoneDigits = phone.replace(/\D/g, '').length;
  if (phone && (!/^[+\d][\d\s()-]{5,}$/.test(phone) || phoneDigits < 6 || phoneDigits > 15)) {
    errors.phone = 'That phone number does not look right.';
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'That email address does not look right.';
  if (!phone && !email) errors.phone = 'Please leave a phone number or email so we can confirm.';

  if (!values.date) errors.date = 'Please choose a date.';
  else if (values.date < minDate) errors.date = 'Please choose today or a later date.';
  else if (values.date > lastBookableDay(minDate)) {
    errors.date = 'We take bookings up to a year ahead. For later dates, please message us.';
  }

  const guests = Number(values.guests);
  if (!Number.isInteger(guests) || guests < 1)
    errors.guests = 'Please tell us how many are coming.';
  else if (guests > MAX_GUESTS)
    errors.guests = `For more than ${MAX_GUESTS}, please message us directly.`;

  if (!sittingOptions.includes(values.time)) errors.time = 'Please choose a sitting.';
  if (values.message.length > 2000) errors.message = 'Please keep the note under 2000 characters.';
  return errors;
}

function whatsappText(values, roomName) {
  const lines = [
    'Hello Hillsedge, I would like to reserve a table.',
    '',
    `Name: ${values.name.trim() || '—'}`,
    `Guests: ${values.guests}`,
    `Date: ${values.date || '—'}`,
    `Sitting: ${values.time}`,
  ];
  if (roomName) lines.push(`Space: ${roomName}`);
  if (values.message.trim()) lines.push(`Notes: ${values.message.trim()}`);
  return lines.join('\n');
}

/**
 * Sends the booking to the kitchen.
 *
 * The request goes to our own API, so a booking is recorded whether or not
 * the guest does anything else. WhatsApp stays as a second route: it is how
 * most people here prefer to talk to a restaurant, and the way through if
 * the server is unreachable.
 */
export function ReservationForm({ initialRoomId = '' }) {
  const { settings, rooms } = useSite();
  const { restaurant, reservations } = settings;
  const bookableRooms = rooms.filter(isBookable);
  const minDate = useMemo(today, []);
  const uid = useId();
  const id = (field) => `${uid}-${field}`;

  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: 'Sunset',
    guests: 2,
    roomId: initialRoomId,
    message: '',
  });
  const [errors, setErrors] = useState({});
  // Errors appear after the first submit, not while the guest is still typing.
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
  const [failure, setFailure] = useState(null);
  const refs = useRef({});

  const roomName = rooms.find((r) => r.id === values.roomId)?.name;
  const shown = submitted ? errors : {};

  const set = (field, value) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validate(next, minDate));
    if (status === 'failed') {
      setStatus('idle');
      setFailure(null);
    }
  };

  const focusFirst = (found) => {
    const first = FIELD_ORDER.find((field) => found[field]);
    refs.current[first]?.focus();
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${restaurant.whatsapp}?text=${encodeURIComponent(whatsappText(values, roomName))}`,
      '_blank',
      'noopener'
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    // Judged against today as it is now, not when the form opened — a page
    // left open overnight must not accept yesterday.
    const found = validate(values, today());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirst(found);
      return;
    }

    setStatus('sending');
    setFailure(null);
    try {
      await createReservation({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        date: values.date,
        time: values.time,
        guests: Number(values.guests),
        roomId: values.roomId || null,
        message: values.message.trim(),
      });
      setStatus('sent');
    } catch (error) {
      // The server validates independently; if it disagrees, show its view.
      if (error.errors) {
        setErrors(error.errors);
        focusFirst(error.errors);
      }
      setStatus('failed');
      setFailure(error.message);
    }
  };

  if (reservations.acceptingOnline === false) {
    return (
      <div className="form-panel form-closed" role="status">
        <p className="eyebrow">Bookings</p>
        <h2 className="form-panel-title">We are taking bookings by phone for now.</h2>
        <p>Call or message us and we will find you a table.</p>
        <div className="form-actions">
          {restaurant.phone && (
            <Button href={telHref(restaurant.phone)} variant="solid" icon="phone">
              Call {restaurant.phone}
            </Button>
          )}
          <Button href={`https://wa.me/${restaurant.whatsapp}`} variant="outline" icon="whatsapp">
            WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <div className="form-panel form-sent" role="status">
        <span className="form-sent-icon" aria-hidden="true">
          <Icon name="check" size={28} />
        </span>
        <p className="eyebrow">Request received</p>
        <h2 className="form-panel-title">Thank you, {values.name.trim()}.</h2>
        <p>
          We have your request for {formatDate(values.date)}, {values.time.toLowerCase()} sitting,
          for {values.guests} {Number(values.guests) === 1 ? 'guest' : 'guests'}
          {roomName ? ` in ${roomName}` : ''} — and will confirm by message shortly.
        </p>
        <p className="form-note">
          Nothing to do now. If it is urgent, call{' '}
          <a href={telHref(restaurant.phone)}>{restaurant.phone}</a> or{' '}
          <button type="button" className="text-link" onClick={openWhatsApp}>
            message us on WhatsApp
          </button>
          .
        </p>
      </div>
    );
  }

  /** Wires a field to its message so screen readers announce the two together. */
  const describe = (field, hint) => {
    const ids = [shown[field] && id(`${field}-error`), hint && id(`${field}-hint`)].filter(Boolean);
    return {
      id: id(field),
      ref: (node) => {
        refs.current[field] = node;
      },
      'aria-invalid': shown[field] ? 'true' : undefined,
      'aria-describedby': ids.length ? ids.join(' ') : undefined,
    };
  };
  const ErrorText = ({ field }) =>
    shown[field] ? (
      <span className="field-error" id={id(`${field}-error`)}>
        {shown[field]}
      </span>
    ) : null;

  const sending = status === 'sending';
  const guests = Number(values.guests) || 0;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-busy={sending}>
      <fieldset className="form-group" disabled={sending}>
        <legend className="form-legend">Your visit</legend>

        <div className="field field-full">
          <span className="field-label" id={id('time-label')}>
            Sitting
          </span>
          <div className="chips" role="radiogroup" aria-labelledby={id('time-label')}>
            {sittingOptions.map((option) => (
              <label key={option} className={`chip ${values.time === option ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name={id('time')}
                  value={option}
                  checked={values.time === option}
                  onChange={() => set('time', option)}
                  ref={option === sittingOptions[0] ? (n) => (refs.current.time = n) : undefined}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <ErrorText field="time" />
        </div>

        <div className="field">
          <label htmlFor={id('date')}>Date</label>
          <input
            type="date"
            min={minDate}
            max={lastBookableDay(minDate)}
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            {...describe('date')}
          />
          <ErrorText field="date" />
        </div>

        <div className="field">
          <label htmlFor={id('guests')}>Guests</label>
          <div className="stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => set('guests', Math.max(1, guests - 1))}
              disabled={guests <= 1}
            >
              <Icon name="minus" size={18} />
              <span className="sr-only">One fewer guest</span>
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_GUESTS}
              value={values.guests}
              onChange={(e) => set('guests', e.target.value === '' ? '' : Number(e.target.value))}
              {...describe('guests')}
            />
            <button
              type="button"
              className="stepper-btn"
              onClick={() => set('guests', Math.min(MAX_GUESTS, guests + 1))}
              disabled={guests >= MAX_GUESTS}
            >
              <Icon name="plus" size={18} />
              <span className="sr-only">One more guest</span>
            </button>
          </div>
          <ErrorText field="guests" />
        </div>

        {bookableRooms.length > 0 && (
          <div className="field field-full">
            <label htmlFor={id('roomId')}>
              Space <span className="optional">(optional)</span>
            </label>
            <select
              value={values.roomId}
              onChange={(e) => set('roomId', e.target.value)}
              {...describe('roomId')}
            >
              <option value="">No preference</option>
              {bookableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                  {room.capacity ? ` — up to ${room.capacity}` : ''}
                </option>
              ))}
            </select>
            <ErrorText field="roomId" />
          </div>
        )}
      </fieldset>

      <fieldset className="form-group" disabled={sending}>
        <legend className="form-legend">Your details</legend>
        <div className="field field-full">
          <label htmlFor={id('name')}>Name</label>
          <input
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            {...describe('name')}
          />
          <ErrorText field="name" />
        </div>
        <div className="field">
          <label htmlFor={id('phone')}>Phone or WhatsApp</label>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            {...describe('phone', true)}
          />
          <span className="field-hint" id={id('phone-hint')}>
            A phone number or an email — we confirm by message.
          </span>
          <ErrorText field="phone" />
        </div>
        <div className="field">
          <label htmlFor={id('email')}>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            {...describe('email')}
          />
          <ErrorText field="email" />
        </div>
        <div className="field field-full">
          <label htmlFor={id('message')}>
            Anything we should know <span className="optional">(optional)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Dietary needs, an occasion, tour group details…"
            value={values.message}
            onChange={(e) => set('message', e.target.value)}
            {...describe('message')}
          />
          <ErrorText field="message" />
        </div>
      </fieldset>

      {failure && (
        <p className="form-failure" role="alert">
          {failure}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-gold btn-lg" disabled={sending}>
          <span>{sending ? 'Sending…' : 'Request a table'}</span>
          {!sending && <Icon name="arrow" size={18} className="btn-arrow" />}
        </button>
        <button type="button" className="btn btn-ghost" onClick={openWhatsApp}>
          <Icon name="whatsapp" size={18} />
          <span>Send on WhatsApp instead</span>
        </button>
      </div>
      <p className="form-note">
        We confirm by message — nothing is charged and nothing is held until we do.
      </p>
    </form>
  );
}

export default ReservationForm;
