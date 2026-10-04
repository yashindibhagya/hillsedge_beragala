import { cloneElement, isValidElement, useId, useState } from 'react';

/**
 * The admin's form controls and states. Every control takes its label as a
 * prop and is wired to it (and to its error) by id, so no field can ship
 * unlabelled and every error is announced with the field it belongs to.
 */

/* ----------------------------------------------------------------- icons */

const PATHS = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z',
  menu: 'M5 4v7a3 3 0 006 0V4M8 4v16M17 4c-2 0-3 2-3 5s1 4 3 4v7',
  categories: 'M4 6h16M4 12h10M4 18h6',
  rooms: 'M3 20V9l9-5 9 5v11M9 20v-6h6v6',
  reservations: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4',
  media: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01',
  promotions: 'M4 10v4l12 5V5zM16 9a3 3 0 010 6M7 15l1 5h3l-1-4',
  testimonials: 'M5 5h14v10H9l-4 4z',
  content: 'M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5',
  users:
    'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4-6.3',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  account: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff:
    'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3 3.6M6.6 6.6A17 17 0 002 12s4 7 10 7a9.6 9.6 0 004.4-1M9.9 9.9a3 3 0 004.2 4.2',
  phone: 'M5 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  chat: 'M4 20l1.5-4A8 8 0 1112 20a8 8 0 01-3.6-.9z',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  menuOpen: 'M4 6h16M4 12h16M4 18h16',
  calendar: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  guests: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0',
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.more} />
    </svg>
  );
}

/* --------------------------------------------------------------- buttons */

export function Button({
  variant = 'primary',
  size,
  icon,
  children,
  className = '',
  busy,
  ...rest
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`}
      aria-busy={busy || undefined}
      {...rest}
      disabled={rest.disabled || busy}
    >
      {icon && <Icon name={icon} size={16} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** A square icon button. `label` is required: it is the accessible name. */
export function IconButton({ icon, label, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/* ---------------------------------------------------------------- fields */

/**
 * Label + control + hint + error. The control is the child; it is given the
 * id, the describedby list and aria-invalid here, so callers cannot forget.
 */
export function Field({ label, hint, error, children, className = '', optional, id: givenId }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const message = typeof error === 'string' ? error : error ? 'Check this.' : null;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
      })
    : children;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {optional && <span className="field-optional"> optional</span>}
      </label>
      {control}
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {message && (
        <p className="field-error" id={errorId}>
          {message}
        </p>
      )}
    </div>
  );
}

export const TextInput = (props) => (
  <input type="text" className="input" {...props} value={props.value ?? ''} />
);

export const TextArea = ({ rows = 4, ...props }) => (
  <textarea className="input textarea" rows={rows} {...props} value={props.value ?? ''} />
);

export function Select({ options, placeholder, ...props }) {
  return (
    <select className="input select" {...props} value={props.value ?? ''}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) =>
        typeof option === 'string' ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
    </select>
  );
}

/**
 * An on/off switch — a real checkbox with role="switch", so it is a
 * keyboard-operable, form-associated control with the state announced.
 */
export function Switch({ label, checked, onChange, description, disabled, id: givenId, compact }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <div className={`switch-row ${compact ? 'switch-compact' : ''}`}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch-input"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
      />
      <label htmlFor={id} className="switch-label">
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        <span className="switch-text">{label}</span>
      </label>
      {description && (
        <p className="switch-description" id={`${id}-d`}>
          {description}
        </p>
      )}
    </div>
  );
}

/** Segmented single choice, as radio buttons — for availability and status. */
export function Segmented({ legend, options, value, onChange, disabled, size, hideLegend = true }) {
  const name = useId();
  return (
    <fieldset className={`segmented ${size ? `segmented-${size}` : ''}`} disabled={disabled}>
      <legend className={hideLegend ? 'sr-only' : 'field-label'}>{legend}</legend>
      <div className="segmented-track">
        {options.map((option) => (
          <label
            key={option.value}
            className={`segmented-option tone-${option.tone ?? 'neutral'} ${value === option.value ? 'is-on' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.short ?? option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Free-text tags (ingredients, allergens, features). Enter or comma adds;
 * Backspace on an empty input removes the last; each tag has its own
 * labelled remove button.
 */
export function TagsInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter',
  suggestions = [],
  ...rest
}) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const add = (raw) => {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };

  return (
    <div className="tags-input">
      {value.length > 0 && (
        <ul className="tags-list">
          {value.map((tag) => (
            <li key={tag} className="tag">
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        {...rest}
        type="text"
        className="input"
        value={draft}
        list={suggestions.length ? listId : undefined}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          if (next.endsWith(',')) add(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add(draft);
          } else if (event.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- badges */

export function Badge({ tone = 'neutral', children, dot = true }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- layout */

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- states */

export function Empty({ title, children, action, icon = 'image' }) {
  return (
    <div className="state state-empty">
      <span className="state-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <h2 className="state-title">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <h2 className="state-title">That did not load</h2>
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Placeholder rows while a list loads, so the layout does not jump. */
export function Skeleton({ rows = 4, label = 'Loading…' }) {
  return (
    <div className="skeleton-list" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" aria-hidden="true">
          <span className="skeleton skeleton-thumb" />
          <span className="skeleton-lines">
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line short" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Notice({ tone = 'info', children }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

/** Reorder controls: real buttons, so reordering works from the keyboard. */
export function MoveButtons({ onUp, onDown, name, disabledUp, disabledDown }) {
  return (
    <span className="move-buttons">
      <IconButton icon="up" label={`Move ${name} up`} onClick={onUp} disabled={disabledUp} />
      <IconButton
        icon="down"
        label={`Move ${name} down`}
        onClick={onDown}
        disabled={disabledDown}
      />
    </span>
  );
}
