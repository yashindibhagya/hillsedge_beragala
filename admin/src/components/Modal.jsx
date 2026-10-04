import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog or side drawer.
 *
 * Accessible the way a native <dialog> should be but is not reliably across
 * the browsers staff use: focus moves in on open and is trapped there, Escape
 * and the backdrop close it, focus returns to whatever opened it, and the
 * page behind stops scrolling.
 *
 * `variant="drawer"` slides from the right on wide screens and becomes a full
 * sheet on a phone — the long edit forms live there.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  size = 'm',
  busy = false,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = busy ? () => {} : onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // The first field, if there is one, otherwise the panel itself.
    const first =
      panel?.querySelector('[data-autofocus]') ?? panel?.querySelector(`.modal-body ${FOCUSABLE}`);
    (first ?? panel)?.focus();

    const onKey = (event) => {
      // With a confirm stacked over a drawer, only the topmost one answers.
      const roots = document.querySelectorAll('.modal-root');
      if (panel && roots[roots.length - 1] !== panel.closest('.modal-root')) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`modal-root modal-${variant}`}>
      <div className="modal-backdrop" onClick={() => closeRef.current?.()} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="modal-description">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => closeRef.current?.()}
            aria-label="Close"
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/** "Are you sure?" with the consequence spelled out. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Delete',
  tone = 'danger',
  onConfirm,
  onCancel,
  busy,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="s"
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-${tone}`}
            onClick={onConfirm}
            disabled={busy}
            data-autofocus
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-text">{children}</div>
    </Modal>
  );
}

export default Modal;
