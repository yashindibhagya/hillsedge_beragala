import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog';
import { Icon } from './Icon';

/**
 * An accessible modal dialog: labelled, focus-trapped, closed by Escape, by
 * the close button or by clicking the backdrop, and returning focus to
 * whatever opened it. Rendered into <body> so no ancestor's overflow or
 * transform can clip it.
 */
export function Modal({ open, onClose, labelledBy, className = '', children, onKey }) {
  const ref = useDialog(open, { onClose, onKey });
  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
        tabIndex={-1}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <Icon name="close" size={22} />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
