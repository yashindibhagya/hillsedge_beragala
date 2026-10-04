import { useMemo, useState } from 'react';
import { useSite } from '../context/SiteData';
import { photos } from '../data/site';
import { galleryOrder } from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Icon } from '../components/Icon';
import { Lightbox } from '../components/Lightbox';
import { Media } from '../components/Media';
import { PageIntro } from '../components/PageHero';
import { Loading } from '../components/StateBlock';

export const CATEGORY_LABELS = {
  place: 'The Place',
  smoke: 'The Smokehouse',
  table: 'The Table',
  views: 'Views & Nature',
  rooms: 'Spaces',
  menu: 'The Menu',
  events: 'Events',
  other: 'More',
};

/** A bundled photograph, shaped like an uploaded one. */
function photoAsMedia(key) {
  const photo = photos[key];
  const variants = (photo.srcSet || '')
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .filter(([url, w]) => url && w)
    .map(([url, w]) => ({ url, width: parseInt(w, 10) }));
  return { id: key, kind: 'image', ...photo, url: photo.src, variants };
}

/**
 * The gallery wall: everything the admin has marked for the gallery, in
 * their order, filterable by category.
 *
 * If the server cannot be reached the wall falls back to the photographs
 * bundled with the site, so the page is never empty.
 */
export default function Gallery() {
  useDocumentTitle(
    'Gallery — A Restaurant With A View, Haputale Road',
    'The lodge, the smoker, the table and the light over the valley — photographs of Hillsedge Beragala on the Beragala–Haputale hill road.',
    { brandSuffix: false }
  );
  const { gallery, media, status } = useSite();
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const all = useMemo(() => {
    const live = gallery.map((id) => media[id]).filter(Boolean);
    if (live.length || status !== 'error') return live;
    return galleryOrder.map(photoAsMedia);
  }, [gallery, media, status]);

  const filters = useMemo(() => {
    const used = new Set(all.map((item) => item.category));
    return [
      { id: 'all', label: 'All' },
      ...Object.entries(CATEGORY_LABELS)
        .filter(([id]) => used.has(id))
        .map(([id, label]) => ({ id, label })),
    ];
  }, [all]);

  const shown = filter === 'all' ? all : all.filter((item) => item.category === filter);

  return (
    <>
      <PageIntro
        eyebrow="Gallery"
        title={
          <>
            The light, <em>the smoke,</em> the view.
          </>
        }
        intro="The lodge, the smoker, the table and the light over the valley — as it looks from the hill road."
      />

      <section className="section gallery" aria-label="Photographs">
        <div className="wrap">
          {filters.length > 2 && (
            <div className="gallery-filters" role="tablist" aria-label="Filter the gallery">
              {filters.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`chip ${filter === id ? 'is-on' : ''}`}
                  onClick={() => {
                    setFilter(id);
                    setOpen(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {status === 'loading' && all.length === 0 ? (
            <Loading label="Loading the gallery" rows={4} />
          ) : (
            <ul className="masonry" key={filter}>
              {shown.map((item, index) => (
                <li key={item.id} className="masonry-item" style={{ '--i': Math.min(index, 12) }}>
                  <button
                    type="button"
                    className="masonry-button zoom"
                    onClick={() => setOpen(index)}
                    aria-label={`Open “${item.caption || item.alt || 'photograph'}”`}
                  >
                    <Media
                      media={item}
                      sizes="(min-width: 80rem) 25vw, (min-width: 48rem) 33vw, 50vw"
                    />
                    {item.kind === 'video' && (
                      <span className="masonry-play" aria-hidden="true">
                        <Icon name="play" size={22} />
                      </span>
                    )}
                    {item.caption && <span className="masonry-caption">{item.caption}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </>
  );
}
