import { useCallback, useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMediaLookup } from '../context/SiteData';
import { Picture } from './Picture';

/**
 * A photograph or video uploaded through the admin panel.
 *
 * Photographs carry a WebP ladder (`variants`) and a 20px blurred placeholder
 * (`lqip`), so this emits a srcset the browser can choose from before layout
 * and shows the blur until the real file decodes. Intrinsic width and height
 * are always set, so nothing jumps as images arrive.
 *
 * Videos play muted, looped and inline — the only way any mobile browser will
 * autoplay — and only while on screen and only for visitors who have not
 * asked for less motion. Everyone else gets the poster (or `fallback`, a
 * photograph to show instead), which is also what shows while it buffers.
 */
export function Media({
  media,
  sizes = '100vw',
  priority = false,
  className = '',
  imgClassName = '',
  alt,
  fallback = null,
  controls = false,
  autoPlay = true,
}) {
  if (!media) return fallback;
  if (media.kind === 'video') {
    return (
      <MediaVideo
        media={media}
        className={className}
        sizes={sizes}
        alt={alt}
        fallback={fallback}
        controls={controls}
        autoPlay={autoPlay}
        priority={priority}
      />
    );
  }
  return (
    <MediaImage
      media={media}
      sizes={sizes}
      priority={priority}
      className={`${className} ${imgClassName}`.trim()}
      alt={alt}
    />
  );
}

export function MediaImage({ media, sizes = '100vw', priority = false, className = '', alt }) {
  const [loaded, setLoaded] = useState(false);
  // A cached image can finish before React attaches onLoad.
  const setNode = useCallback((node) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  const srcSet = (media.variants ?? []).map((v) => `${v.url} ${v.width}w`).join(', ');
  const placeholder =
    media.lqip && !loaded
      ? {
          backgroundImage: `url("${media.lqip}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : undefined;
  const priorityHint = priority ? { fetchpriority: 'high' } : {};

  return (
    <img
      ref={setNode}
      className={`media ${loaded ? 'is-loaded' : ''} ${className}`.trim()}
      src={media.url}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt ?? media.alt ?? ''}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      style={placeholder}
      {...priorityHint}
    />
  );
}

function MediaVideo({ media, className, sizes, alt, fallback, controls, autoPlay, priority }) {
  const lookup = useMediaLookup();
  const poster = lookup(media.posterId);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView({ threshold: 0.05 });
  const [failed, setFailed] = useState(false);
  const [video, setVideo] = useState(null);

  const shouldPlay = autoPlay && !reduced && inView && !controls;

  useEffect(() => {
    if (!video || controls) return;
    if (shouldPlay) video.play?.()?.catch?.(() => {});
    else video.pause?.();
  }, [video, shouldPlay, controls]);

  const still = poster ? (
    <MediaImage
      media={poster}
      sizes={sizes}
      priority={priority}
      className={className}
      alt={alt ?? media.alt}
    />
  ) : (
    fallback
  );

  // Reduced motion and no controls: a still is the whole point.
  if (failed || (reduced && !controls && still)) return still;

  return (
    <span ref={ref} className={`media-video ${className}`.trim()}>
      {still && !controls && <span className="media-video-poster">{still}</span>}
      <video
        ref={setVideo}
        className="media media-video-el"
        src={media.url}
        poster={poster?.url}
        muted={!controls}
        loop={!controls}
        playsInline
        controls={controls}
        preload={controls ? 'metadata' : priority ? 'auto' : 'none'}
        aria-label={alt ?? media.alt ?? undefined}
        aria-hidden={controls ? undefined : 'true'}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/** Resolves an id first — the common case in page code. */
export function MediaById({ id, ...props }) {
  const lookup = useMediaLookup();
  return <Media media={lookup(id)} {...props} />;
}

export default Media;

/**
 * Live media when the admin has set one, otherwise a bundled photograph —
 * so a section still has its picture before the API answers, or if it never
 * does.
 */
export function Visual({ id, photo, sizes, priority, className = '', alt }) {
  const lookup = useMediaLookup();
  const media = lookup(id);
  const fallback = photo ? (
    <Picture
      photo={photo}
      sizes={sizes}
      priority={priority}
      className={`media is-loaded ${className}`.trim()}
      alt={alt ?? photo.alt}
    />
  ) : null;
  return (
    <Media
      media={media}
      sizes={sizes}
      priority={priority}
      className={className}
      alt={alt}
      fallback={fallback}
    />
  );
}
