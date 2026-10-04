import { useMemo, useRef, useState } from 'react';
import { uploadMedia } from '../api';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { MEDIA_CATEGORIES, formatBytes, mediaSrc } from '../lib/format';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Button, Icon, Select, TextInput } from './ui';

/** A thumbnail of any media item: the photo, or the poster, or a video glyph. */
export function MediaThumb({ media, size = 480, className = '' }) {
  const { byId } = useMediaLibrary();
  if (!media) {
    return (
      <span className={`thumb thumb-empty ${className}`} aria-hidden="true">
        <Icon name="image" size={20} />
      </span>
    );
  }
  const poster = media.kind === 'video' && media.posterId ? byId(media.posterId) : null;
  const src = mediaSrc(poster ?? media, size);
  return (
    <span className={`thumb ${className}`}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          style={media.lqip ? { backgroundImage: `url("${media.lqip}")` } : undefined}
        />
      ) : (
        <video src={`${media.url}#t=0.5`} muted preload="metadata" playsInline aria-hidden="true" />
      )}
      {media.kind === 'video' && (
        <span className="thumb-badge">
          <Icon name="video" size={14} />
          <span className="sr-only">Video</span>
        </span>
      )}
    </span>
  );
}

const ACCEPT = {
  image: 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif',
  video: 'video/mp4,video/webm',
};

/**
 * Uploads a list of files one after another, reporting each one's progress.
 * Sequential on purpose: a phone on hill-country data does better with one
 * upload at full speed than four fighting for the same thin pipe.
 */
export function useUploadQueue({ defaults = {} } = {}) {
  const library = useMediaLibrary();
  const toast = useToast();
  const [queue, setQueue] = useState([]);

  const patch = (key, update) =>
    setQueue((list) => list.map((q) => (q.key === key ? { ...q, ...update } : q)));

  async function upload(files) {
    const entries = [...files].map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      progress: 0,
      status: 'waiting',
    }));
    setQueue((list) => [...list.filter((q) => q.status !== 'done'), ...entries]);
    const uploaded = [];
    for (const entry of entries) {
      patch(entry.key, { status: 'uploading' });
      try {
        const caption = entry.file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const item = await uploadMedia(entry.file, { caption, ...defaults }, (progress) =>
          patch(entry.key, { progress })
        );
        library.add(item);
        uploaded.push(item);
        patch(entry.key, { status: 'done', progress: 1 });
      } catch (error) {
        patch(entry.key, { status: 'failed', error: error.message });
        toast.error(`${entry.file.name}: ${error.message}`);
      }
    }
    if (uploaded.length)
      toast.success(uploaded.length === 1 ? 'Uploaded.' : `${uploaded.length} files uploaded.`);
    return uploaded;
  }

  return { queue, upload, clear: () => setQueue([]) };
}

/** A drop zone plus a visible "choose files" button — dragging is never the only way. */
export function DropZone({
  onFiles,
  accept = `${ACCEPT.image},${ACCEPT.video}`,
  multiple = true,
  hint,
}) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
      }}
    >
      <Icon name="upload" size={22} />
      <p className="dropzone-text">
        Drop photos or video here, or{' '}
        <button type="button" className="link" onClick={() => input.current?.click()}>
          choose files
        </button>
      </p>
      <p className="dropzone-hint">
        {hint ??
          'Photos: JPEG, PNG, WebP, HEIC — resized automatically. Video: MP4 (H.264) or WebM; keep hero videos short, under ~10 MB.'}
      </p>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          if (event.target.files.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function UploadQueue({ queue }) {
  if (!queue.length) return null;
  return (
    <ul className="upload-queue" aria-label="Uploads">
      {queue.map((q) => (
        <li key={q.key} className={`upload-item is-${q.status}`}>
          <span className="upload-name">{q.file.name}</span>
          <span className="upload-size">{formatBytes(q.file.size)}</span>
          <progress max="1" value={q.progress} aria-label={`${q.file.name} upload progress`} />
          <span className="upload-status">
            {q.status === 'failed'
              ? q.error
              : q.status === 'done'
                ? 'Done'
                : q.status === 'uploading'
                  ? `${Math.round(q.progress * 100)}%`
                  : 'Waiting'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Choose from the library, or upload and choose in one go.
 *
 * `kind` limits it to images or videos; `multiple` returns an array.
 */
export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  kind = 'image',
  multiple = false,
  initial = [],
}) {
  const library = useMediaLibrary();
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const { queue, upload } = useUploadQueue({
    defaults: kind === 'video' ? { inGallery: false } : {},
  });

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return library.items
      .filter((m) => !kind || m.kind === kind)
      .filter((m) => !category || m.category === category)
      .filter(
        (m) => !needle || `${m.caption} ${m.alt} ${m.originalName}`.toLowerCase().includes(needle)
      );
  }, [library.items, kind, category, query]);

  const toggle = (id) => {
    if (multiple)
      setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
    else setSelected([id]);
  };

  const confirm = () => {
    onSelect(multiple ? selected : (selected[0] ?? null));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'video' ? 'Choose a video' : multiple ? 'Choose photos' : 'Choose a photo'}
      size="l"
      footer={
        <>
          <span className="modal-foot-note">{multiple ? `${selected.length} selected` : ''}</span>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!multiple && !selected.length}>
            Use {multiple ? 'selected' : kind === 'video' ? 'this video' : 'this photo'}
          </Button>
        </>
      }
    >
      <DropZone
        accept={ACCEPT[kind]}
        onFiles={async (files) => {
          const uploaded = await upload(files);
          const ids = uploaded.filter((m) => m.kind === kind).map((m) => m.id);
          if (ids.length)
            setSelected((list) => (multiple ? [...list, ...ids] : [ids[ids.length - 1]]));
        }}
      />
      <UploadQueue queue={queue} />
      <div className="toolbar">
        <label className="toolbar-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search the library</span>
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search captions"
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Category</span>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={MEDIA_CATEGORIES}
            placeholder="All categories"
          />
        </label>
      </div>
      {library.status === 'loading' && <p className="muted">Loading the library…</p>}
      {library.status === 'ready' && items.length === 0 && (
        <p className="muted">Nothing here yet — upload above.</p>
      )}
      <ul
        className="picker-grid"
        role="listbox"
        aria-multiselectable={multiple}
        aria-label="Media library"
      >
        {items.map((m) => {
          const isOn = selected.includes(m.id);
          return (
            <li key={m.id} role="option" aria-selected={isOn}>
              <button
                type="button"
                className={`picker-item ${isOn ? 'is-on' : ''}`}
                onClick={() => toggle(m.id)}
                onDoubleClick={() => !multiple && (setSelected([m.id]), onSelect(m.id), onClose())}
              >
                <MediaThumb media={m} />
                <span className="picker-caption">{m.caption || m.originalName}</span>
                {isOn && (
                  <span className="picker-check" aria-hidden="true">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/**
 * A form field holding one media id: thumbnail, choose, clear. Use with
 * <Field>, which supplies the id for the "Choose" button's label.
 */
export function MediaField({ value, onChange, kind = 'image', id, ...rest }) {
  const { byId } = useMediaLibrary();
  const [open, setOpen] = useState(false);
  const media = value ? byId(value) : null;
  return (
    <div className="media-field">
      <MediaThumb media={media} className="media-field-thumb" />
      <div className="media-field-body">
        <p className="media-field-name">
          {media ? media.caption || media.originalName : `No ${kind} chosen`}
        </p>
        <div className="media-field-actions">
          <Button variant="secondary" size="s" id={id} {...rest} onClick={() => setOpen(true)}>
            {media ? 'Change' : `Choose ${kind}`}
          </Button>
          {media && (
            <Button variant="quiet" size="s" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {open && (
        <MediaPickerModal
          open
          kind={kind}
          initial={value ? [value] : []}
          onClose={() => setOpen(false)}
          onSelect={onChange}
        />
      )}
    </div>
  );
}

/** A field holding several image ids, in order. */
export function MediaListField({ value = [], onChange, id, ...rest }) {
  const { byId } = useMediaLibrary();
  const [open, setOpen] = useState(false);
  const move = (index, direction) => {
    const next = [...value];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="media-list-field">
      {value.length > 0 && (
        <ol className="media-list">
          {value.map((mediaId, index) => {
            const media = byId(mediaId);
            const name = media?.caption || `Photo ${index + 1}`;
            return (
              <li key={mediaId} className="media-list-item">
                <MediaThumb media={media} />
                <span className="media-list-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${name} earlier`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label={`Move ${name} later`}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => onChange(value.filter((x) => x !== mediaId))}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <Button
        variant="secondary"
        size="s"
        icon="plus"
        id={id}
        {...rest}
        onClick={() => setOpen(true)}
      >
        {value.length ? 'Add or change photos' : 'Choose photos'}
      </Button>
      {open && (
        <MediaPickerModal
          open
          multiple
          kind="image"
          initial={value}
          onClose={() => setOpen(false)}
          onSelect={onChange}
        />
      )}
    </div>
  );
}
