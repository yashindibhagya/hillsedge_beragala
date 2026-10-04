import { useMemo, useState } from 'react';
import { api } from '../api';
import {
  DropZone,
  MediaField,
  MediaThumb,
  UploadQueue,
  useUploadQueue,
} from '../components/MediaPicker';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  Empty,
  Field,
  Icon,
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
import { MEDIA_CATEGORIES, formatBytes, formatDateTime, labelOf } from '../lib/format';

function MediaEditor({ media, onClose, onDelete }) {
  const toast = useToast();
  const library = useMediaLibrary();
  const { values, set, errors, saving, formError, submit } = useForm({
    alt: media.alt ?? '',
    caption: media.caption ?? '',
    category: media.category ?? 'other',
    featured: Boolean(media.featured),
    inGallery: Boolean(media.inGallery),
    posterId: media.posterId ?? null,
  });

  const save = async (event) => {
    event?.preventDefault();
    try {
      const { item } = await submit(() => api.patch(`/admin/media/${media.id}`, values));
      library.replace(item);
      toast.success('Saved.');
      onClose();
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
      title={media.kind === 'video' ? 'Video details' : 'Photo details'}
      description={`${media.originalName ?? ''} · ${media.width ? `${media.width}×${media.height} · ` : ''}${formatBytes(media.size)} · added ${formatDateTime(media.createdAt)}`}
      footer={
        <>
          <Button
            variant="danger-quiet"
            icon="trash"
            onClick={onDelete}
            className="modal-foot-start"
          >
            Delete
          </Button>
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
      <form className="stack" onSubmit={save} noValidate>
        <div className="media-preview">
          {media.kind === 'video' ? (
            <video
              src={media.url}
              controls
              muted
              playsInline
              preload="metadata"
              poster={library.byId(media.posterId)?.url}
            />
          ) : (
            <MediaThumb media={media} size={960} />
          )}
        </div>
        <Field
          label="Alt text"
          error={errors.alt}
          hint="What the image shows, for people using screen readers and for search engines. Describe it plainly."
        >
          <TextArea
            value={values.alt}
            onChange={set('alt')}
            rows={2}
            maxLength={300}
            data-autofocus
          />
        </Field>
        <Field label="Caption" error={errors.caption} optional hint="Shown in the gallery.">
          <TextInput value={values.caption} onChange={set('caption')} maxLength={200} />
        </Field>
        <Field label="Category" error={errors.category}>
          <Select value={values.category} onChange={set('category')} options={MEDIA_CATEGORIES} />
        </Field>
        <Switch
          label="Show in the website gallery"
          checked={values.inGallery}
          onChange={set('inGallery')}
        />
        <Switch
          label="Featured"
          checked={values.featured}
          onChange={set('featured')}
          description="Featured items lead the gallery."
        />
        {media.kind === 'video' && (
          <Field
            label="Poster image"
            error={errors.posterId}
            optional
            hint="Shown before the video plays, and to anyone who prefers reduced motion."
          >
            <MediaField value={values.posterId} onChange={set('posterId')} />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Media() {
  const toast = useToast();
  const library = useMediaLibrary();
  const { queue, upload } = useUploadQueue();
  const [kind, setKind] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...library.items].sort((a, b) => a.order - b.order),
    [library.items]
  );
  const filtering = Boolean(kind || category || query);
  const shown = sorted.filter(
    (m) =>
      (!kind || m.kind === kind) &&
      (!category || m.category === category) &&
      (!query ||
        `${m.caption} ${m.alt} ${m.originalName}`.toLowerCase().includes(query.toLowerCase()))
  );

  const move = async (id, direction) => {
    const index = sorted.findIndex((m) => m.id === id);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    library.setAll(next.map((m, order) => ({ ...m, order })));
    try {
      await api.put('/admin/media/reorder', { ids: next.map((m) => m.id) });
    } catch (err) {
      toast.error(err.message);
      library.reload();
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/media/${deleting.id}`);
      library.remove(deleting.id);
      toast.success('Deleted.');
      setDeleting(null);
      setEditing(null);
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
        title="Media library"
        description="Photos and video for the gallery, menu, rooms and homepage."
      />

      <DropZone onFiles={upload} />
      <UploadQueue queue={queue} />

      <div className="toolbar">
        <label className="toolbar-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search captions</span>
          <TextInput
            type="search"
            placeholder="Search captions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Type</span>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            placeholder="Photos & video"
            options={[
              { value: 'image', label: 'Photos' },
              { value: 'video', label: 'Video' },
            ]}
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Category</span>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="All categories"
            options={MEDIA_CATEGORIES}
          />
        </label>
      </div>

      {library.status === 'loading' && <Skeleton rows={3} label="Loading the library…" />}
      {library.status === 'ready' && shown.length === 0 && (
        <Empty title={filtering ? 'Nothing matches' : 'The library is empty'} icon="media">
          {filtering ? 'Clear the filters to see everything.' : 'Drop photos above to get started.'}
        </Empty>
      )}

      <ul className="media-grid">
        {shown.map((m) => {
          const index = sorted.indexOf(m);
          const name = m.caption || m.originalName || 'item';
          return (
            <li key={m.id} className="media-card">
              <button
                type="button"
                className="media-card-open"
                onClick={() => setEditing(m)}
                aria-label={`Edit ${name}`}
              >
                <MediaThumb media={m} />
              </button>
              <div className="media-card-body">
                <p className="media-card-caption">{name}</p>
                <p className="row-badges">
                  <Badge tone="neutral" dot={false}>
                    {labelOf(MEDIA_CATEGORIES, m.category)}
                  </Badge>
                  {m.featured && (
                    <Badge tone="gold" dot={false}>
                      Featured
                    </Badge>
                  )}
                  {m.inGallery && (
                    <Badge tone="ok" dot={false}>
                      Gallery
                    </Badge>
                  )}
                  {!m.alt && m.kind === 'image' && <Badge tone="warn">No alt text</Badge>}
                </p>
                {!filtering && (
                  <MoveButtons
                    name={name}
                    onUp={() => move(m.id, -1)}
                    onDown={() => move(m.id, 1)}
                    disabledUp={index === 0}
                    disabledDown={index === sorted.length - 1}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <MediaEditor
          media={editing}
          onClose={() => setEditing(null)}
          onDelete={() => setDeleting(editing)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this file?"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>
          It is removed from the gallery, and from any dish, category, room, offer or homepage
          section that uses it — those will show no image until you choose another. This cannot be
          undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
