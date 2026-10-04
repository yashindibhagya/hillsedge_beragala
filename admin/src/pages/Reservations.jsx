import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Icon,
  IconButton,
  PageHeader,
  Select,
  Skeleton,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useResource } from '../hooks/useResource';
import {
  RESERVATION_STATUSES,
  SITTINGS,
  formatDate,
  formatDateTime,
  labelOf,
  todayLocal,
  toneOf,
  whatsappLink,
} from '../lib/format';

/** Each tab is a server query; the server decides what "upcoming" means. */
const TABS = [
  { id: 'today', label: 'Today', query: { view: 'today' } },
  { id: 'upcoming', label: 'Upcoming', query: { view: 'upcoming' } },
  { id: 'pending', label: 'Pending', query: { status: 'pending' }, count: 'pending' },
  { id: 'completed', label: 'Completed', query: { status: 'completed' } },
  { id: 'cancelled', label: 'Cancelled', query: { status: 'cancelled' } },
  { id: 'all', label: 'All', query: { view: 'all' } },
];

/** The next step from each status, offered as one-click buttons. */
const NEXT = {
  pending: [
    { status: 'confirmed', label: 'Confirm', variant: 'primary' },
    { status: 'cancelled', label: 'Cancel', variant: 'quiet' },
  ],
  confirmed: [
    { status: 'completed', label: 'Mark completed', variant: 'secondary' },
    { status: 'cancelled', label: 'Cancel', variant: 'quiet' },
  ],
  completed: [{ status: 'confirmed', label: 'Reopen', variant: 'quiet' }],
  cancelled: [{ status: 'pending', label: 'Restore', variant: 'quiet' }],
};

const blank = () => ({
  name: '',
  phone: '',
  email: '',
  date: todayLocal(),
  time: 'Dinner',
  exactTime: '',
  guests: 2,
  roomId: '',
  message: '',
  status: 'confirmed',
  notes: '',
});

function ReservationForm({ reservation, rooms, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm(
    reservation
      ? {
          ...blank(),
          ...reservation,
          exactTime: reservation.exactTime ?? '',
          roomId: reservation.roomId ?? '',
        }
      : blank()
  );

  const save = async (event) => {
    event?.preventDefault();
    const body = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      date: values.date,
      time: values.time,
      exactTime: values.exactTime || null,
      guests: Number(values.guests),
      roomId: values.roomId || null,
      message: values.message,
      status: values.status,
      notes: values.notes,
    };
    try {
      const { item } = await submit(() =>
        reservation
          ? api.patch(`/admin/reservations/${reservation.id}`, body)
          : api.post('/admin/reservations', body)
      );
      toast.success(reservation ? 'Booking saved.' : `Booking added for ${item.name}.`);
      onSaved(item);
    } catch {
      // shown in place
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      busy={saving}
      title={reservation ? `Booking — ${reservation.name}` : 'Add a booking'}
      description={
        reservation
          ? `Received ${formatDateTime(reservation.receivedAt)} via ${reservation.source === 'admin' ? 'the admin' : 'the website'}.`
          : 'For bookings taken by phone, WhatsApp or at the door.'
      }
      footer={
        <>
          {formError && (
            <p className="form-error modal-foot-note" role="alert">
              {formError}
            </p>
          )}
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} busy={saving}>
            {reservation ? 'Save' : 'Add booking'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={save} noValidate>
        <Field label="Guest name" error={errors.name} className="span-2">
          <TextInput value={values.name} onChange={set('name')} autoComplete="off" data-autofocus />
        </Field>
        <Field label="Phone" error={errors.phone} optional>
          <TextInput type="tel" value={values.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email" error={errors.email} optional>
          <TextInput type="email" value={values.email} onChange={set('email')} />
        </Field>
        <Field label="Date" error={errors.date}>
          <TextInput type="date" value={values.date} onChange={set('date')} />
        </Field>
        <Field label="Guests" error={errors.guests}>
          <TextInput
            type="number"
            inputMode="numeric"
            min="1"
            max="500"
            value={values.guests}
            onChange={set('guests')}
          />
        </Field>
        <Field label="Sitting" error={errors.time}>
          <Select value={values.time} onChange={set('time')} options={SITTINGS} />
        </Field>
        <Field label="Exact time" error={errors.exactTime} optional>
          <TextInput type="time" value={values.exactTime} onChange={set('exactTime')} />
        </Field>
        <Field label="Room or table area" error={errors.roomId} optional>
          <Select
            value={values.roomId}
            onChange={set('roomId')}
            placeholder="Any"
            options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Field>
        <Field label="Status" error={errors.status}>
          <Select value={values.status} onChange={set('status')} options={RESERVATION_STATUSES} />
        </Field>
        <Field label="Guest’s request" error={errors.message} className="span-2" optional>
          <TextArea value={values.message} onChange={set('message')} rows={3} />
        </Field>
        <Field
          label="Internal notes"
          error={errors.notes}
          className="span-2"
          optional
          hint="Only staff see these."
        >
          <TextArea value={values.notes} onChange={set('notes')} rows={3} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Reservations() {
  const { can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const initialTab = TABS.find((t) => t.id === params.get('view'))?.id ?? 'upcoming';
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const rooms = useResource('/admin/rooms');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (params.get('new') && can('reservations:write')) {
      setEditing('new');
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, can]);

  const path = useMemo(() => {
    const query = new URLSearchParams(TABS.find((t) => t.id === tab).query);
    if (debounced.trim()) query.set('q', debounced.trim());
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    return `/admin/reservations?${query}`;
  }, [tab, debounced, from, to]);

  const { data, items, setItems, status, error, reload } = useResource(path);
  const counts = data?.counts ?? {};
  const roomName = (id) => rooms.items.find((r) => r.id === id)?.name;

  const setStatus = async (reservation, next) => {
    setItems((list) => list.map((r) => (r.id === reservation.id ? { ...r, status: next } : r)));
    try {
      await api.patch(`/admin/reservations/${reservation.id}`, { status: next });
      toast.success(`${reservation.name}: ${labelOf(RESERVATION_STATUSES, next).toLowerCase()}.`);
      reload();
    } catch (err) {
      setItems((list) => list.map((r) => (r.id === reservation.id ? reservation : r)));
      toast.error(err.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/reservations/${deleting.id}`);
      setItems((list) => list.filter((r) => r.id !== deleting.id));
      toast.success('Booking deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Group the list under date headings: a booking list is read day by day.
  const byDay = useMemo(() => {
    const groups = [];
    for (const r of items) {
      const last = groups[groups.length - 1];
      if (last && last.date === r.date) last.items.push(r);
      else groups.push({ date: r.date, items: [r] });
    }
    return groups;
  }, [items]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Today"
        title="Reservations"
        description="Website bookings arrive as pending. Confirm them by message, then here."
        actions={
          can('reservations:write') && (
            <Button icon="plus" onClick={() => setEditing('new')}>
              Add booking
            </Button>
          )
        }
      />

      <div className="tabs" role="tablist" aria-label="Which bookings">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => {
              setTab(t.id);
              setParams(t.id === 'upcoming' ? {} : { view: t.id }, { replace: true });
            }}
          >
            {t.label}
            {t.count && counts[t.count] > 0 && <span className="tab-count">{counts[t.count]}</span>}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="toolbar-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search by name, phone, email or note</span>
          <TextInput
            type="search"
            placeholder="Name, phone, email or note"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="toolbar-field toolbar-date">
          <span className="toolbar-label">From</span>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="toolbar-field toolbar-date">
          <span className="toolbar-label">To</span>
          <TextInput
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {(from || to || q) && (
          <Button
            variant="quiet"
            size="s"
            onClick={() => {
              setFrom('');
              setTo('');
              setQ('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === tab).label}
        aria-busy={status === 'loading'}
      >
        {status === 'loading' && !data && <Skeleton rows={5} label="Loading bookings…" />}
        {status === 'error' && <ErrorState error={error} onRetry={reload} />}
        {status === 'ready' && items.length === 0 && (
          <Empty title="No bookings here" icon="reservations">
            {tab === 'today'
              ? 'Nothing booked for today yet.'
              : 'Try another tab, or clear the search.'}
          </Empty>
        )}

        {byDay.map((day) => (
          <section
            key={day.date}
            className="group"
            aria-label={formatDate(day.date, { year: true })}
          >
            <h2 className="group-title">
              {day.date === data?.today ? 'Today' : formatDate(day.date, { year: true })}
              <span className="group-count">
                {day.items.length} ·{' '}
                {day.items
                  .filter((r) => r.status !== 'cancelled')
                  .reduce((s, r) => s + r.guests, 0)}{' '}
                guests
              </span>
            </h2>
            <ul className="rows">
              {day.items.map((r) => {
                const wa = whatsappLink(r.phone);
                return (
                  <li key={r.id} className={`row booking-row status-${r.status}`}>
                    <div className="booking-when">
                      <span className="booking-time">{r.exactTime ?? r.time}</span>
                      <span className="booking-guests">
                        <Icon name="guests" size={14} /> {r.guests}
                      </span>
                    </div>
                    <div className="row-main">
                      <p className="row-title">
                        <button
                          type="button"
                          className="row-title-btn"
                          onClick={() => setEditing(r)}
                        >
                          {r.name}
                        </button>
                        <Badge tone={toneOf(RESERVATION_STATUSES, r.status)}>
                          {labelOf(RESERVATION_STATUSES, r.status)}
                        </Badge>
                      </p>
                      <p className="row-meta">
                        {r.exactTime && <span>{r.time} · </span>}
                        {roomName(r.roomId) && <span>{roomName(r.roomId)} · </span>}
                        <span className="muted">
                          {r.source === 'admin' ? 'Added by staff' : 'Website'}
                        </span>
                      </p>
                      {r.message && <p className="booking-message">“{r.message}”</p>}
                      {r.notes && (
                        <p className="booking-notes">
                          <strong>Note:</strong> {r.notes}
                        </p>
                      )}
                      <p className="contact-links">
                        {r.phone && (
                          <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="contact-link">
                            <Icon name="phone" size={14} /> {r.phone}
                          </a>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-link"
                          >
                            <Icon name="chat" size={14} /> WhatsApp
                          </a>
                        )}
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="contact-link">
                            <Icon name="mail" size={14} /> {r.email}
                          </a>
                        )}
                      </p>
                    </div>
                    <div className="row-controls">
                      {can('reservations:write') && (
                        <div className="booking-actions">
                          {(NEXT[r.status] ?? []).map((n) => (
                            <Button
                              key={n.status}
                              variant={n.variant}
                              size="s"
                              onClick={() => setStatus(r, n.status)}
                            >
                              {n.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      <div className="row-actions">
                        {can('reservations:write') && (
                          <IconButton
                            icon="edit"
                            label={`Edit booking for ${r.name}`}
                            onClick={() => setEditing(r)}
                          />
                        )}
                        {can('reservations:delete') && (
                          <IconButton
                            icon="trash"
                            label={`Delete booking for ${r.name}`}
                            className="danger"
                            onClick={() => setDeleting(r)}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {editing && (
        <ReservationForm
          reservation={editing === 'new' ? null : editing}
          rooms={rooms.items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this booking?"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>
          {deleting?.name}, {formatDate(deleting?.date)} — deleting removes it for good. To keep the
          record, mark it cancelled instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
