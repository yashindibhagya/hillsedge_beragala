import { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog';
import { Icon } from './Icon';
import { Media } from './Media';

/** How far a finger has to travel before a swipe counts. */
const SWIPE_PX = 50;

/**
 * Full-screen viewer for the gallery: photographs and video.
 *
 * `index` addresses into `items` so the viewer steps through the wall as it
 * is currently filtered; `null` closes it. Arrow keys and swipes both move,
 * and both wrap at the ends so the controls never dead-end — on a phone the
 * swipe is the only way through.
 */
export function Lightbox({ items = [], index = null, onClose, onNavigate }) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const touch = useRef(null);

  const step = useCallback(
    (delta) => {
      if (!open || items.length < 2) return;
      onNavigate((index + delta + items.length) % items.length);
    },
    [open, index, items.length, onNavigate]
  );

  const ref = useDialog(open, {
    onClose,
    onKey: (event) => {
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    },
  });

  if (!open) return null;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.caption || 'Photograph'}
      ref={ref}
      tabIndex={-1}
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const delta = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(delta) > SWIPE_PX) step(delta < 0 ? 1 : -1);
      }}
    >
      <div className="lightbox-bar">
        <span className="lightbox-count" aria-live="polite">
          {index + 1} / {items.length}
        </span>
        <button type="button" className="lightbox-btn" onClick={onClose}>
          <Icon name="close" size={24} />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <figure className="lightbox-figure" key={item.id}>
        <Media
          media={item}
          sizes="100vw"
          priority
          controls={item.kind === 'video'}
          className="lightbox-media"
        />
        {item.caption && <figcaption>{item.caption}</figcaption>}
      </figure>

      {items.length > 1 && (
        <>
          <button type="button" className="lightbox-btn lightbox-prev" onClick={() => step(-1)}>
            <Icon name="chevronLeft" size={28} />
            <span className="sr-only">Previous</span>
          </button>
          <button type="button" className="lightbox-btn lightbox-next" onClick={() => step(1)}>
            <Icon name="chevronRight" size={28} />
            <span className="sr-only">Next</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

export default Lightbox;
