import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/**
 * Everything a modal needs to behave: locks the page behind it, moves focus
 * in on open, keeps Tab inside, closes on Escape, and hands focus back to
 * whatever opened it.
 *
 * `onKey` sees every other keydown, for arrow-key navigation and the like.
 */
export function useDialog(open, { onClose, onKey } = {}) {
  const ref = useRef(null);
  const openerRef = useRef(null);
  const handlers = useRef({ onClose, onKey });
  handlers.current = { onClose, onKey };

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const node = ref.current;
    // The dialog itself, not its first button: a screen reader then starts
    // from the dialog's label rather than mid-way through it.
    node?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handlers.current.onClose?.();
        return;
      }
      if (event.key === 'Tab' && node) {
        const stops = [...node.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest('[inert]'));
        if (stops.length === 0) {
          event.preventDefault();
          return;
        }
        const first = stops[0];
        const last = stops[stops.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === node)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      handlers.current.onKey?.(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return ref;
}

export default useDialog;
