import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  DESIGNS,
  FONTS,
  PALETTES,
  designById,
  fontsById,
  normalizeTheme,
  paletteById,
} from '../../../shared/themes.js';
import { api } from '../api';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  PageHeader,
  Segmented,
  Skeleton,
  Switch,
} from '../components/ui';
import { useResource } from '../hooks/useResource';

/** Must match PREVIEW_MESSAGE in client/src/lib/theme.js. */
const PREVIEW_MESSAGE = 'hillsedge:theme';

const PAGES = [
  { value: '/', label: 'Home' },
  { value: '/menu', label: 'Menu' },
  { value: '/about', label: 'About' },
  { value: '/experiences', label: 'Experiences' },
  { value: '/reservations', label: 'Reserve' },
];

const DEVICES = [
  { value: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { value: 'phone', label: 'Phone', width: 390, height: 844 },
];

/** Every pairing's fonts, so each card can set its specimen in them. */
function usePairingFonts() {
  useEffect(() => {
    const links = FONTS.filter((f) => f.href).map((f) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = f.href;
      document.head.append(link);
      return link;
    });
    return () => links.forEach((link) => link.remove());
  }, []);
}

const sameTheme = (a, b) => a.design === b.design && a.fonts === b.fonts && a.palette === b.palette;
const previewUrl = (path, theme) =>
  `${path}?preview=theme&design=${theme.design}&fonts=${theme.fonts}&palette=${theme.palette}`;

/*
 * A thumbnail of each design's layout — its hero, its sections and its
 * footer — drawn in the chosen palette, so the cards show how the designs
 * differ in structure and not only in type.
 */
function DesignThumb({ id, palette }) {
  const [ink, mid, accent, light, paper] = palette.swatches;
  const lines = (x, y, w, n = 2, c = mid, gap = 6) =>
    Array.from({ length: n }, (_, i) => (
      <rect
        key={i}
        x={x}
        y={y + i * gap}
        width={w * (i === n - 1 ? 0.7 : 1)}
        height="2.5"
        rx="1.2"
        fill={c}
        opacity="0.55"
      />
    ));
  const shapes = {
    heritage: (
      <>
        <rect width="160" height="54" fill={ink} />
        <rect x="12" y="24" width="64" height="7" rx="1" fill={paper} />
        <rect x="12" y="35" width="44" height="7" rx="1" fill={paper} />
        <rect x="12" y="46" width="22" height="4" rx="2" fill={accent} />
        {lines(12, 64, 56, 3)}
        <rect x="88" y="60" width="60" height="24" rx="4" fill={light} />
        <path d="M0 108V102C40 88 120 88 160 102V108Z" fill={light} />
      </>
    ),
    roastery: (
      <>
        <rect width="160" height="108" fill={paper} />
        <rect x="52" y="10" width="56" height="7" rx="1" fill={ink} />
        <rect x="70" y="21" width="20" height="4" rx="2" fill={accent} />
        <g transform="rotate(-3 80 44)">
          <rect x="30" y="30" width="100" height="30" rx="3" fill="#fff" />
          <rect x="33" y="33" width="94" height="24" rx="2" fill={mid} />
        </g>
        <path
          d="M0 70L10 67L20 71L32 66L44 70L56 66L68 71L80 66L92 70L104 66L116 71L128 66L140 70L152 66L160 69V108H0Z"
          fill={ink}
        />
        {[30, 70, 110].map((x) => (
          <g key={x}>
            <circle cx={x + 10} cy="88" r="9" fill={light} />
            <circle cx={x + 10} cy="98" r="3" fill={accent} />
          </g>
        ))}
      </>
    ),
    hikari: (
      <>
        <rect width="160" height="108" fill={paper} />
        <rect width="160" height="46" fill={ink} />
        {lines(8, 6, 26, 1, paper)}
        <rect x="74" y="4" width="12" height="5" fill={accent} />
        <rect x="40" y="22" width="80" height="4" fill={paper} opacity="0.9" />
        <rect x="56" y="30" width="48" height="2.5" fill={accent} />
        <path d="M0 46H160" stroke={mid} strokeOpacity="0.4" />
        {[18, 64, 110].map((x) => (
          <g key={x}>
            <path d={`M${x} 54H${x + 34}M${x} 88H${x + 34}`} stroke={mid} strokeWidth="0.8" />
            <rect x={x} y="57" width="34" height="28" fill={mid} />
          </g>
        ))}
        <rect x="104" y="96" width="44" height="4" fill={ink} />
      </>
    ),
    savore: (
      <>
        <rect width="160" height="108" fill={ink} />
        <rect x="12" y="14" width="56" height="5" rx="1" fill={paper} />
        <rect x="12" y="22" width="40" height="5" rx="1" fill={paper} opacity="0.7" />
        <rect x="12" y="32" width="18" height="5" rx="2.5" fill={paper} />
        <rect
          x="100"
          y="8"
          width="48"
          height="34"
          rx="4"
          fill={paper}
          opacity="0.08"
          stroke={paper}
          strokeOpacity="0.2"
        />
        <rect y="48" width="160" height="22" fill={paper} opacity="0.92" />
        {lines(12, 55, 48, 2, ink)}
        {[12, 48, 84, 120].map((x) => (
          <g key={x}>
            <rect x={x} y="76" width="30" height="26" rx="3" fill={paper} opacity="0.1" />
            <rect x={x} y="76" width="30" height="14" rx="3" fill={mid} />
            <rect x={x + 3} y="95" width="10" height="2.5" rx="1" fill={accent} />
          </g>
        ))}
      </>
    ),
    heha: (
      <>
        <rect width="160" height="108" fill={paper} />
        <rect x="4" y="4" width="152" height="62" rx="6" fill={mid} />
        <rect x="12" y="14" width="96" height="11" fill={paper} />
        <rect x="12" y="28" width="72" height="11" fill={paper} />
        <rect x="12" y="50" width="66" height="9" rx="2.5" fill={ink} opacity="0.55" />
        <rect x="14" y="52" width="18" height="5" rx="1.5" fill={accent} />
        <rect x="12" y="74" width="10" height="3" fill={accent} />
        <rect x="26" y="72" width="70" height="7" fill={ink} />
        <rect x="26" y="82" width="50" height="7" fill={ink} />
        <rect x="4" y="94" width="152" height="14" rx="4" fill={ink} />
      </>
    ),
    bento: (
      <>
        <rect width="160" height="108" fill="#fff" />
        <rect x="4" y="4" width="152" height="50" rx="7" fill={mid} />
        <rect x="16" y="7" width="128" height="7" rx="3.5" fill="#fff" />
        <rect x="10" y="24" width="56" height="26" rx="5" fill="#fff" />
        <rect x="15" y="30" width="34" height="5" rx="1" fill={ink} />
        <rect x="15" y="40" width="16" height="5" rx="2.5" fill={accent} />
        <rect x="4" y="58" width="74" height="46" rx="7" fill={light} />
        <rect
          x="82"
          y="58"
          width="74"
          height="22"
          rx="7"
          fill={palette.swatches[1]}
          opacity="0.35"
        />
        <rect x="82" y="82" width="35" height="22" rx="7" fill={ink} />
        <rect x="121" y="82" width="35" height="22" rx="7" fill={accent} opacity="0.7" />
      </>
    ),
    atelier: (
      <>
        <rect width="160" height="108" fill={paper} />
        <rect x="80" y="0" width="80" height="58" fill={mid} />
        <path d="M80 0V58M0 58H160M0 8H160" stroke={ink} strokeWidth="0.8" />
        <rect x="8" y="20" width="22" height="5" fill="none" stroke={accent} />
        <rect x="8" y="30" width="58" height="7" fill={ink} />
        <rect x="8" y="40" width="40" height="7" fill={ink} />
        <path
          d="M8 66H152V102H8ZM44 66V102M80 66V102M116 66V102"
          fill="none"
          stroke={ink}
          strokeWidth="0.8"
        />
        {[12, 48, 84, 120].map((x) => (
          <rect key={x} x={x} y="70" width="28" height="18" fill={light} />
        ))}
      </>
    ),
  };
  return (
    <svg className="design-thumb" viewBox="0 0 160 108" aria-hidden="true">
      {shapes[id]}
    </svg>
  );
}

function Choice({ name, value, checked, onSelect, className = '', children }) {
  return (
    <label className={`look-card ${className} ${checked ? 'is-on' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {children}
      <span className="look-check" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
    </label>
  );
}

function CardText({ title, live, description, meta }) {
  return (
    <span className="look-card-text">
      <span className="look-card-name">
        {title}
        {live && <Badge tone="ok">Live</Badge>}
      </span>
      <span className="look-card-desc">{description}</span>
      {meta && <span className="look-card-meta">{meta}</span>}
    </span>
  );
}

/**
 * The public site itself, in a frame, drawn at a real device size and
 * scaled to fit. Changes of design or palette are posted into the frame,
 * so the page restyles in place without reloading or losing its scroll.
 */
function LivePreview({ theme, path, device }) {
  const frame = useRef(null);
  const stage = useRef(null);
  const [fit, setFit] = useState({ scale: 0.5, height: 900 });
  const [loading, setLoading] = useState(true);
  const size = DEVICES.find((d) => d.value === device);
  // The address the frame was opened at; later theme changes are messages.
  const [src, setSrc] = useState(() => previewUrl(path, theme));
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    setLoading(true);
    setSrc(previewUrl(path, themeRef.current));
  }, [path]);

  const post = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE, ...themeRef.current },
      window.location.origin
    );
  }, []);

  useEffect(post, [theme, post]);

  // A phone is shown whole; a desktop fills the width and the stage height.
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return undefined;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      const room = { width: Math.max(1, width - 32), height: Math.max(1, height - 32) };
      if (device === 'phone') {
        const scale = Math.min(1, room.width / size.width, room.height / size.height);
        setFit({ scale, height: size.height });
      } else {
        const scale = Math.min(1, room.width / size.width);
        setFit({ scale, height: room.height / scale });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [device, size.width, size.height]);

  return (
    <div className={`preview-stage preview-${device}`} ref={stage}>
      <div
        className="preview-device"
        style={{ width: size.width * fit.scale, height: fit.height * fit.scale }}
      >
        <iframe
          ref={frame}
          title="Website preview"
          src={src}
          className="preview-frame"
          style={{
            width: size.width,
            height: fit.height,
            transform: `scale(${fit.scale})`,
          }}
          onLoad={() => {
            setLoading(false);
            post();
          }}
        />
        {loading && (
          <div className="preview-loading" role="status">
            <span className="preview-spinner" aria-hidden="true" />
            Loading the website…
          </div>
        )}
      </div>
    </div>
  );
}

export default function Design() {
  usePairingFonts();
  const toast = useToast();
  const { data, status, error, reload } = useResource('/admin/settings', { key: 'settings' });
  const [live, setLive] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_THEME);
  const [matched, setMatched] = useState(true);
  const [device, setDevice] = useState('desktop');
  const [path, setPath] = useState('/');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.settings) return;
    const saved = normalizeTheme(data.settings.theme);
    setLive(saved);
    setDraft(saved);
  }, [data]);

  const dirty = live && !sameTheme(draft, live);
  const palette = paletteById(draft.palette);

  const chooseDesign = (id) => {
    const design = designById(id);
    setDraft((t) =>
      matched ? { design: id, fonts: design.fonts, palette: design.palette } : { ...t, design: id }
    );
  };

  const surprise = () => {
    const pick = (list) => list[Math.floor(Math.random() * list.length)].id;
    let next = draft;
    while (sameTheme(next, draft)) {
      next = { design: pick(DESIGNS), fonts: pick(FONTS), palette: pick(PALETTES) };
    }
    setDraft(next);
  };

  const publish = async () => {
    setSaving(true);
    try {
      const { settings } = await api.patch('/admin/settings/theme', draft);
      setLive(normalizeTheme(settings.theme));
      toast.success(`${designById(draft.design).name} is now live on the website.`);
    } catch (err) {
      toast.error(err.message ?? 'That did not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-design">
      <PageHeader
        eyebrow="Website"
        title="Design & colours"
        description="Choose a design, a font pairing and a colour palette, and watch the real website change beside you. Nothing goes live until you publish."
      />
      {status === 'loading' && <Skeleton rows={4} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {live && (
        <div className="design-studio">
          <div className="design-controls">
            <fieldset className="look-group">
              <legend className="look-legend">
                <span className="look-step">1</span> Design
              </legend>
              <p className="look-hint">
                The layout itself: header, hero, sections, cards and footer.
              </p>
              <Switch
                label="Use each design's own fonts and colours"
                description="Off: keep your font and colour choices when you switch designs."
                checked={matched}
                onChange={setMatched}
              />
              <div className="look-grid">
                {DESIGNS.map((d) => (
                  <Choice
                    key={d.id}
                    name="design"
                    value={d.id}
                    checked={draft.design === d.id}
                    onSelect={chooseDesign}
                    className="design-card"
                  >
                    <DesignThumb id={d.id} palette={palette} />
                    <CardText
                      title={d.name}
                      live={live.design === d.id}
                      description={d.description}
                      meta={`${fontsById(d.fonts).name} · ${paletteById(d.palette).name}`}
                    />
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset className="look-group">
              <legend className="look-legend">
                <span className="look-step">2</span> Fonts
              </legend>
              <div className="font-grid">
                {FONTS.map((f) => (
                  <Choice
                    key={f.id}
                    name="fonts"
                    value={f.id}
                    checked={draft.fonts === f.id}
                    onSelect={(fonts) => setDraft((t) => ({ ...t, fonts }))}
                    className="font-card"
                  >
                    <span className="font-specimen" aria-hidden="true">
                      <span className="font-specimen-display" style={{ fontFamily: f.display }}>
                        Slow smoke
                      </span>
                      <span className="font-specimen-body" style={{ fontFamily: f.body }}>
                        Hardwood fire, nine kitchens and a view of the hills.
                      </span>
                    </span>
                    <CardText
                      title={f.name}
                      live={live.fonts === f.id}
                      description={f.description}
                    />
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset className="look-group">
              <legend className="look-legend">
                <span className="look-step">3</span> Colours
              </legend>
              <div className="palette-grid">
                {PALETTES.map((p) => (
                  <Choice
                    key={p.id}
                    name="palette"
                    value={p.id}
                    checked={draft.palette === p.id}
                    onSelect={(paletteId) => setDraft((t) => ({ ...t, palette: paletteId }))}
                    className="palette-card"
                  >
                    <span className="palette-strip" aria-hidden="true">
                      {p.swatches.map((colour) => (
                        <span key={colour} style={{ background: colour }} />
                      ))}
                    </span>
                    <CardText
                      title={p.name}
                      live={live.palette === p.id}
                      description={p.description}
                    />
                  </Choice>
                ))}
              </div>
            </fieldset>

            <div className="design-publish">
              <div className="design-publish-text">
                <span className="design-publish-label">{dirty ? 'Previewing' : 'Live now'}</span>
                <strong>{designById(draft.design).name}</strong>
                <span className="design-publish-sub">
                  {fontsById(draft.fonts).name} · {palette.name}
                </span>
              </div>
              <div className="design-publish-actions">
                <Button variant="quiet" icon="star" onClick={surprise}>
                  Surprise me
                </Button>
                {dirty && (
                  <Button variant="secondary" onClick={() => setDraft(live)}>
                    Back to live
                  </Button>
                )}
                <Button onClick={publish} busy={saving} disabled={!dirty}>
                  {dirty ? 'Publish' : 'Published'}
                </Button>
              </div>
            </div>
          </div>

          <section className="design-preview" aria-label="Preview">
            <div className="preview-bar">
              <span className="preview-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <Segmented legend="Page" options={PAGES} value={path} onChange={setPath} size="s" />
              <Segmented
                legend="Device"
                options={DEVICES}
                value={device}
                onChange={setDevice}
                size="s"
              />
              <a
                className="icon-btn preview-open"
                href={previewUrl(path, draft)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the preview in a new tab"
                title="Open the preview in a new tab"
              >
                <Icon name="external" size={18} />
              </a>
            </div>
            <LivePreview theme={draft} path={path} device={device} />
          </section>
        </div>
      )}
    </div>
  );
}
