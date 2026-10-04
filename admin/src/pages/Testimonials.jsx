import { useState } from 'react';
import { api } from '../api';
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
  Notice,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useResource } from '../hooks/useResource';
import { moveAndSave } from '../lib/reorder';

const blank = {
  author: '',
  origin: '',
  quote: '',
  rating: '',
  source: '',
  sourceUrl: '',
  active: true,
};
const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} out of 5` }));

function TestimonialForm({ testimonial, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm(
    testimonial
      ? { ...blank, ...testimonial, rating: testimonial.rating ? String(testimonial.rating) : '' }
      : blank
  );
  const save = async (event) => {
    event?.preventDefault();
    const body = {
      author: values.author,
      origin: values.origin,
      quote: values.quote,
      rating: values.rating === '' ? null : Number(values.rating),
      source: values.source,
      sourceUrl: values.sourceUrl,
      active: values.active,
    };
    try {
      const { item } = await submit(() =>
        testimonial
          ? api.patch(`/admin/testimonials/${testimonial.id}`, body)
          : api.post('/admin/testimonials', body)
      );
      toast.success('Saved.');
      onSaved(item, !testimonial);
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
      title={testimonial ? 'Edit testimonial' : 'Add a testimonial'}
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
        <Field
          label="Quote"
          error={errors.quote}
          className="span-2"
          hint="Their words, unedited apart from trimming."
        >
          <TextArea
            value={values.quote}
            onChange={set('quote')}
            rows={4}
            maxLength={800}
            data-autofocus
          />
        </Field>
        <Field
          label="Guest name"
          error={errors.author}
          hint="As they agreed to be named, e.g. “Anna K.”"
        >
          <TextInput value={values.author} onChange={set('author')} maxLength={80} />
        </Field>
        <Field label="From" error={errors.origin} optional hint="e.g. Colombo, or Germany">
          <TextInput value={values.origin} onChange={set('origin')} maxLength={80} />
        </Field>
        <Field label="Rating" error={errors.rating} optional>
          <Select
            value={values.rating}
            onChange={set('rating')}
            placeholder="No rating"
            options={RATINGS}
          />
        </Field>
        <Field
          label="Source"
          error={errors.source}
          optional
          hint="Google, TripAdvisor, guest book…"
        >
          <TextInput value={values.source} onChange={set('source')} maxLength={60} />
        </Field>
        <Field label="Link to the original" error={errors.sourceUrl} className="span-2" optional>
          <TextInput value={values.sourceUrl} onChange={set('sourceUrl')} />
        </Field>
        <Switch label="Shown on the website" checked={values.active} onChange={set('active')} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Testimonials() {
  const toast = useToast();
  const { items, setItems, status, error, reload } = useResource('/admin/testimonials');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...items].sort((a, b) => a.order - b.order);

  const move = async (id, direction) => {
    try {
      const next = await moveAndSave('/admin/testimonials', sorted, id, direction);
      if (next) setItems(next);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/testimonials/${deleting.id}`);
      setItems((list) => list.filter((t) => t.id !== deleting.id));
      toast.success('Deleted.');
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
        eyebrow="Website"
        title="Testimonials"
        actions={
          <Button icon="plus" onClick={() => setEditing('new')}>
            Add
          </Button>
        }
      />
      <Notice tone="warn">
        Only publish genuine reviews, with the guest’s permission to quote them. Invented or edited
        reviews mislead guests and break consumer law and the review platforms’ terms. The section
        is hidden on the website while there are none.
      </Notice>
      {status === 'loading' && <Skeleton rows={3} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'ready' && sorted.length === 0 && (
        <Empty title="No testimonials yet" icon="testimonials" />
      )}
      <ul className="rows">
        {sorted.map((t, index) => (
          <li key={t.id} className={`row ${t.active ? '' : 'is-muted'}`}>
            <div className="row-main">
              <blockquote className="quote">“{t.quote}”</blockquote>
              <p className="row-meta">
                — {t.author}
                {t.origin && `, ${t.origin}`}
                {t.source && <span className="muted"> · {t.source}</span>}
                {t.rating && <span className="muted"> · {t.rating}/5</span>}
              </p>
              {!t.active && (
                <p className="row-badges">
                  <Badge tone="neutral">Hidden</Badge>
                </p>
              )}
            </div>
            <div className="row-actions">
              <MoveButtons
                name={`quote from ${t.author}`}
                onUp={() => move(t.id, -1)}
                onDown={() => move(t.id, 1)}
                disabledUp={index === 0}
                disabledDown={index === sorted.length - 1}
              />
              <IconButton
                icon="edit"
                label={`Edit quote from ${t.author}`}
                onClick={() => setEditing(t)}
              />
              <IconButton
                icon="trash"
                label={`Delete quote from ${t.author}`}
                className="danger"
                onClick={() => setDeleting(t)}
              />
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <TestimonialForm
          testimonial={editing === 'new' ? null : editing}
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
        title="Delete this testimonial?"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}
