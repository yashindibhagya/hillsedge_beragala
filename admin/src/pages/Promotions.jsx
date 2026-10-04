import { useState } from 'react';
import { api } from '../api';
import { MediaField, MediaThumb } from '../components/MediaPicker';
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
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { useResource } from '../hooks/useResource';
import { PROMOTION_KINDS, formatDate, labelOf, todayLocal } from '../lib/format';
import { moveAndSave } from '../lib/reorder';

/** What a guest would see today: the same rule the public API applies. */
export function promotionState(p, today = todayLocal()) {
  if (!p.active) return { label: 'Off', tone: 'neutral' };
  if (p.startsOn && p.startsOn > today) return { label: 'Scheduled', tone: 'info' };
  if (p.endsOn && p.endsOn < today) return { label: 'Expired', tone: 'warn' };
  return { label: 'Live', tone: 'ok' };
}

const blank = {
  title: '',
  kind: 'offer',
  description: '',
  imageId: null,
  startsOn: '',
  endsOn: '',
  ctaLabel: '',
  ctaHref: '',
  active: true,
};

function PromotionForm({ promotion, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm(
    promotion
      ? {
          ...blank,
          ...promotion,
          startsOn: promotion.startsOn ?? '',
          endsOn: promotion.endsOn ?? '',
        }
      : blank
  );
  const save = async (event) => {
    event?.preventDefault();
    const body = {
      title: values.title,
      kind: values.kind,
      description: values.description,
      imageId: values.imageId,
      startsOn: values.startsOn || null,
      endsOn: values.endsOn || null,
      ctaLabel: values.ctaLabel,
      ctaHref: values.ctaHref,
      active: values.active,
    };
    try {
      const { item } = await submit(() =>
        promotion
          ? api.patch(`/admin/promotions/${promotion.id}`, body)
          : api.post('/admin/promotions', body)
      );
      toast.success('Saved.');
      onSaved(item, !promotion);
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
      title={promotion ? `Edit ${promotion.title}` : 'New offer or event'}
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
            Save
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={save} noValidate>
        <Field label="Title" error={errors.title} className="span-2">
          <TextInput value={values.title} onChange={set('title')} maxLength={120} data-autofocus />
        </Field>
        <Field label="Type" error={errors.kind}>
          <Select value={values.kind} onChange={set('kind')} options={PROMOTION_KINDS} />
        </Field>
        <div className="field">
          <Switch
            label="Active"
            checked={values.active}
            onChange={set('active')}
            description="Off hides it whatever the dates."
          />
        </div>
        <Field label="Description" error={errors.description} className="span-2">
          <TextArea
            value={values.description}
            onChange={set('description')}
            rows={4}
            maxLength={1200}
          />
        </Field>
        <Field label="Starts" error={errors.startsOn} optional hint="Blank: from now.">
          <TextInput type="date" value={values.startsOn} onChange={set('startsOn')} />
        </Field>
        <Field label="Ends" error={errors.endsOn} optional hint="Blank: until switched off.">
          <TextInput
            type="date"
            value={values.endsOn}
            min={values.startsOn || undefined}
            onChange={set('endsOn')}
          />
        </Field>
        <Field label="Button label" error={errors.ctaLabel} optional hint="e.g. Reserve a table">
          <TextInput value={values.ctaLabel} onChange={set('ctaLabel')} maxLength={40} />
        </Field>
        <Field
          label="Button link"
          error={errors.ctaHref}
          optional
          hint="/reservations, or a full https:// link"
        >
          <TextInput value={values.ctaHref} onChange={set('ctaHref')} />
        </Field>
        <Field label="Image" error={errors.imageId} className="span-2" optional>
          <MediaField value={values.imageId} onChange={set('imageId')} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Promotions() {
  const toast = useToast();
  const { byId } = useMediaLibrary();
  const { items, setItems, status, error, reload } = useResource('/admin/promotions');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...items].sort((a, b) => a.order - b.order);

  const move = async (id, direction) => {
    try {
      const next = await moveAndSave('/admin/promotions', sorted, id, direction);
      if (next) setItems(next);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/promotions/${deleting.id}`);
      setItems((list) => list.filter((p) => p.id !== deleting.id));
      toast.success('Deleted.');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (p) => {
    try {
      const { item } = await api.patch(`/admin/promotions/${p.id}`, { active: !p.active });
      setItems((list) => list.map((x) => (x.id === item.id ? item : x)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Website"
        title="Offers & events"
        description="Seasonal menus, events and offers. Each appears on the website between its dates while active."
        actions={
          <Button icon="plus" onClick={() => setEditing('new')}>
            New
          </Button>
        }
      />
      {status === 'loading' && <Skeleton rows={3} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'ready' && sorted.length === 0 && (
        <Empty
          title="No offers or events"
          icon="promotions"
          action={<Button onClick={() => setEditing('new')}>Create one</Button>}
        >
          A sunset menu, a holiday lunch, a limited-time dish.
        </Empty>
      )}
      <ul className="rows">
        {sorted.map((p, index) => {
          const state = promotionState(p);
          return (
            <li key={p.id} className="row">
              <MediaThumb media={byId(p.imageId)} className="row-thumb" size={240} />
              <div className="row-main">
                <p className="row-title">
                  <button type="button" className="row-title-btn" onClick={() => setEditing(p)}>
                    {p.title}
                  </button>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </p>
                <p className="row-meta muted">
                  {labelOf(PROMOTION_KINDS, p.kind)} ·{' '}
                  {p.startsOn ? formatDate(p.startsOn, { weekday: false }) : 'Now'} –{' '}
                  {p.endsOn ? formatDate(p.endsOn, { weekday: false, year: true }) : 'open-ended'}
                </p>
              </div>
              <div className="row-controls">
                <Switch compact label="Active" checked={p.active} onChange={() => toggle(p)} />
                <div className="row-actions">
                  <MoveButtons
                    name={p.title}
                    onUp={() => move(p.id, -1)}
                    onDown={() => move(p.id, 1)}
                    disabledUp={index === 0}
                    disabledDown={index === sorted.length - 1}
                  />
                  <IconButton icon="edit" label={`Edit ${p.title}`} onClick={() => setEditing(p)} />
                  <IconButton
                    icon="trash"
                    label={`Delete ${p.title}`}
                    className="danger"
                    onClick={() => setDeleting(p)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && (
        <PromotionForm
          promotion={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(item, created) => {
            setItems((list) =>
              created ? [...list, item] : list.map((x) => (x.id === item.id ? item : x))
            );
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.title}”?`}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>To bring it back next season, switch it off instead.</p>
      </ConfirmDialog>
    </div>
  );
}
