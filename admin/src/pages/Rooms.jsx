import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { MediaField, MediaListField, MediaThumb } from '../components/MediaPicker';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  IconButton,
  MoveButtons,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  TagsInput,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { useResource } from '../hooks/useResource';
import {
  ROOM_BOOKING_STATUSES,
  ROOM_KINDS,
  editable,
  formatPrice,
  labelOf,
  toneOf,
} from '../lib/format';
import { moveAndSave } from '../lib/reorder';

const blank = {
  name: '',
  kind: 'private_dining',
  summary: '',
  description: '',
  capacity: '',
  price: '',
  priceUnit: '',
  features: [],
  imageIds: [],
  videoId: null,
  available: true,
  bookingStatus: 'open',
  active: true,
};

function RoomForm({ room, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm(
    room ? { ...blank, ...room, capacity: room.capacity ?? '', price: room.price ?? '' } : blank
  );

  const save = async (event) => {
    event?.preventDefault();
    const body = editable(values);
    body.capacity = body.capacity === '' ? null : body.capacity;
    body.price = body.price === '' ? null : body.price;
    try {
      const { item } = await submit(() =>
        room ? api.patch(`/admin/rooms/${room.id}`, body) : api.post('/admin/rooms', body)
      );
      toast.success(room ? 'Saved.' : `Added “${item.name}”.`);
      onSaved(item, !room);
    } catch {
      // shown in place
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      size="l"
      onClose={onClose}
      busy={saving}
      title={room ? `Edit ${room.name}` : 'Add a room or space'}
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
            {room ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={save} noValidate>
        <Field label="Name" error={errors.name}>
          <TextInput value={values.name} onChange={set('name')} data-autofocus maxLength={100} />
        </Field>
        <Field label="Type" error={errors.kind}>
          <Select value={values.kind} onChange={set('kind')} options={ROOM_KINDS} />
        </Field>
        <Field
          label="Summary"
          error={errors.summary}
          className="span-2"
          hint="One line for cards and listings."
        >
          <TextInput value={values.summary} onChange={set('summary')} maxLength={240} />
        </Field>
        <Field label="Description" error={errors.description} className="span-2">
          <TextArea
            value={values.description}
            onChange={set('description')}
            rows={5}
            maxLength={3000}
          />
        </Field>
        <Field label="Capacity (guests)" error={errors.capacity} optional>
          <TextInput
            type="number"
            inputMode="numeric"
            min="1"
            value={values.capacity}
            onChange={set('capacity')}
          />
        </Field>
        <div className="field-pair">
          <Field label="Price" error={errors.price} optional hint="Blank shows “price on request”.">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              value={values.price}
              onChange={set('price')}
            />
          </Field>
          <Field label="Per" error={errors.priceUnit} optional hint="e.g. night, person, event">
            <TextInput value={values.priceUnit} onChange={set('priceUnit')} maxLength={40} />
          </Field>
        </div>
        <Field label="Features & facilities" error={errors.features} className="span-2" optional>
          <TagsInput
            value={values.features}
            onChange={set('features')}
            suggestions={[
              'Valley views',
              'Open-air',
              'Private',
              'Fireplace',
              'Wi-Fi',
              'Projector',
              'Hot water',
              'Parking',
            ]}
          />
        </Field>
        <Field label="Booking status" error={errors.bookingStatus}>
          <Select
            value={values.bookingStatus}
            onChange={set('bookingStatus')}
            options={ROOM_BOOKING_STATUSES}
          />
        </Field>
        <fieldset className="checks">
          <legend className="field-label">Visibility</legend>
          <Switch label="Available" checked={values.available} onChange={set('available')} />
          <Switch label="Shown on the website" checked={values.active} onChange={set('active')} />
        </fieldset>
        <Field
          label="Photos"
          error={errors.imageIds}
          className="span-2"
          optional
          hint="The first photo is the cover."
        >
          <MediaListField value={values.imageIds} onChange={set('imageIds')} />
        </Field>
        <Field label="Video" error={errors.videoId} optional>
          <MediaField value={values.videoId} onChange={set('videoId')} kind="video" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Rooms() {
  const { can } = useAuth();
  const toast = useToast();
  const { byId } = useMediaLibrary();
  const { items, setItems, status, error, reload } = useResource('/admin/rooms');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const canEdit = can('rooms:write');
  const sorted = [...items].sort((a, b) => a.order - b.order);

  const quick = async (room, change) => {
    setItems((list) => list.map((r) => (r.id === room.id ? { ...r, ...change } : r)));
    try {
      const { item } = await api.patch(`/admin/rooms/${room.id}/availability`, change);
      setItems((list) => list.map((r) => (r.id === item.id ? item : r)));
      toast.success(`${room.name} updated.`);
    } catch (err) {
      setItems((list) => list.map((r) => (r.id === room.id ? room : r)));
      toast.error(err.message);
    }
  };

  const move = async (id, direction) => {
    try {
      const next = await moveAndSave('/admin/rooms', sorted, id, direction);
      if (next) setItems(next);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/rooms/${deleting.id}`);
      setItems((list) => list.filter((r) => r.id !== deleting.id));
      toast.success(`Deleted “${deleting.name}”.`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Spaces"
        title="Rooms & spaces"
        description="Dining areas, private rooms, event spaces and stays."
        actions={
          canEdit && (
            <Button icon="plus" onClick={() => setEditing('new')}>
              Add space
            </Button>
          )
        }
      />
      {status === 'loading' && <Skeleton rows={4} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'ready' && sorted.length === 0 && (
        <Empty title="No rooms or spaces yet" icon="rooms" />
      )}

      <ul className="cards-grid">
        {sorted.map((room, index) => (
          <li key={room.id} className={`room-card ${room.active ? '' : 'is-muted'}`}>
            <MediaThumb media={byId(room.imageIds[0])} className="room-cover" size={960} />
            <div className="room-body">
              <p className="eyebrow">{labelOf(ROOM_KINDS, room.kind)}</p>
              <h2 className="room-title">{room.name}</h2>
              <p className="muted room-summary">{room.summary}</p>
              <p className="row-badges">
                <Badge tone={toneOf(ROOM_BOOKING_STATUSES, room.bookingStatus)}>
                  {labelOf(ROOM_BOOKING_STATUSES, room.bookingStatus)}
                </Badge>
                {!room.available && <Badge tone="danger">Unavailable</Badge>}
                {!room.active && <Badge tone="neutral">Hidden from site</Badge>}
              </p>
              <dl className="room-facts">
                <div>
                  <dt>Capacity</dt>
                  <dd>{room.capacity ? `${room.capacity} guests` : '—'}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {room.price === null
                      ? 'On request'
                      : `${formatPrice(room.price)}${room.priceUnit ? ` / ${room.priceUnit}` : ''}`}
                  </dd>
                </div>
              </dl>
              <div className="room-quick">
                <Switch
                  compact
                  label="Available"
                  checked={room.available}
                  onChange={(available) => quick(room, { available })}
                />
                <label className="inline-select">
                  <span className="sr-only">Booking status of {room.name}</span>
                  <select
                    className="input select input-s"
                    value={room.bookingStatus}
                    onChange={(e) => quick(room, { bookingStatus: e.target.value })}
                  >
                    {ROOM_BOOKING_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {canEdit && (
                <div className="row-actions room-actions">
                  <MoveButtons
                    name={room.name}
                    onUp={() => move(room.id, -1)}
                    onDown={() => move(room.id, 1)}
                    disabledUp={index === 0}
                    disabledDown={index === sorted.length - 1}
                  />
                  <IconButton
                    icon="edit"
                    label={`Edit ${room.name}`}
                    onClick={() => setEditing(room)}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete ${room.name}`}
                    className="danger"
                    onClick={() => setDeleting(room)}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <RoomForm
          room={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(item, created) => {
            setItems((list) =>
              created ? [...list, item] : list.map((r) => (r.id === item.id ? item : r))
            );
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.name}”?`}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>
          Existing bookings for this space are kept, but will no longer name it. To stop bookings
          for now, set it to closed or unavailable instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
