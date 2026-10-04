import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

/**
 * Short confirmations ("Saved", "Marked sold out") and failures.
 *
 * Announced through a polite live region so a screen reader hears the
 * outcome of an action without focus moving; errors use an assertive one.
 * Successes go after four seconds, errors stay until dismissed — an error
 * that disappears before it is read is an error nobody acts on.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message, tone = 'success') => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, tone }]);
      if (tone !== 'error') setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  const polite = toasts.filter((t) => t.tone !== 'error');
  const urgent = toasts.filter((t) => t.tone === 'error');

  const render = (toast) => (
    <div key={toast.id} className={`toast toast-${toast.tone}`}>
      <span className="toast-dot" aria-hidden="true" />
      <span className="toast-text">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts">
        <div role="status" aria-live="polite">
          {polite.map(render)}
        </div>
        <div role="alert" aria-live="assertive">
          {urgent.map(render)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
