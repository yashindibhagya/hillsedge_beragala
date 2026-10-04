import { Icon } from './Icon';

/**
 * Loading, empty and error states, in one consistent voice.
 *
 * Loading renders skeleton rows rather than a spinner: the layout is held
 * open, and the eye reads it as "content arriving" rather than "waiting".
 */
export function Skeleton({ rows = 3, className = '' }) {
  return (
    <div className={`skeleton ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton-row" style={{ '--i': index }} />
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading', rows = 3, className }) {
  return (
    <div className="state state-loading" role="status">
      <span className="sr-only">{label}…</span>
      <Skeleton rows={rows} className={className} />
    </div>
  );
}

export function ErrorState({ title = 'This part did not load.', message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p className="state-title">{title}</p>
      {message && <p className="state-text">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon = 'sparkle' }) {
  return (
    <div className="state state-empty">
      <Icon name={icon} size={28} className="state-icon" />
      <p className="state-title">{title}</p>
      {children && <div className="state-text">{children}</div>}
    </div>
  );
}
