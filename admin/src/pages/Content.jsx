import { useEffect, useState } from 'react';
import { api } from '../api';
import { MediaField } from '../components/MediaPicker';
import { useToast } from '../components/Toast';
import {
  Button,
  ErrorState,
  Field,
  Notice,
  PageHeader,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useResource } from '../hooks/useResource';

/**
 * Each section is saved on its own (PATCH /admin/settings/:section), so
 * correcting the phone number never resends — or clobbers — the homepage.
 * Field limits mirror settingsSchema on the server.
 */
const SECTIONS = [
  {
    id: 'restaurant',
    label: 'Restaurant & contact',
    intro: 'Used in the header, footer, contact page and the structured data search engines read.',
    fields: [
      { key: 'name', label: 'Restaurant name', max: 80 },
      { key: 'tagline', label: 'Tagline', type: 'textarea', max: 240, rows: 2 },
      {
        key: 'description',
        label: 'Short description',
        type: 'textarea',
        max: 1200,
        rows: 3,
        hint: 'Used for search results and link previews.',
      },
      { key: 'region', label: 'Region line', max: 120 },
      { key: 'address', label: 'Address', type: 'textarea', max: 300, rows: 3 },
      { key: 'phone', label: 'Phone', max: 40, inputType: 'tel' },
      {
        key: 'whatsapp',
        label: 'WhatsApp number',
        max: 20,
        hint: 'Digits only, with country code: 94742373394',
      },
      { key: 'email', label: 'Email', inputType: 'email' },
      { key: 'mapsUrl', label: 'Google Maps link', inputType: 'url' },
      { key: 'currency', label: 'Currency code', max: 8, hint: 'ISO code, e.g. LKR or USD' },
      { key: 'priceRange', label: 'Price range', max: 8, hint: '$ to $$$$ — for search engines' },
    ],
  },
  {
    id: 'hours',
    label: 'Opening hours',
    intro:
      'Times are published to search engines only when every open day has both times filled in.',
  },
  {
    id: 'social',
    label: 'Social links',
    intro: 'Leave blank to hide that icon. Full links, starting https://',
    fields: ['instagram', 'facebook', 'tripadvisor', 'tiktok', 'youtube'].map((key) => ({
      key,
      label:
        key === 'tiktok'
          ? 'TikTok'
          : key === 'youtube'
            ? 'YouTube'
            : key === 'tripadvisor'
              ? 'Tripadvisor'
              : key[0].toUpperCase() + key.slice(1),
      inputType: 'url',
    })),
  },
  {
    id: 'home',
    label: 'Homepage',
    intro: 'The opening screen and the homepage’s main sections.',
    fields: [
      { key: 'heroEyebrow', label: 'Hero — small line above the title', max: 80 },
      { key: 'heroTitle', label: 'Hero — title', max: 120 },
      { key: 'heroSubtitle', label: 'Hero — subtitle', type: 'textarea', max: 300, rows: 2 },
      {
        key: 'heroImageId',
        label: 'Hero image',
        type: 'image',
        hint: 'Shown at once, and instead of the video for anyone on reduced motion or saving data. Landscape, at least 2000px wide.',
      },
      {
        key: 'heroVideoId',
        label: 'Hero video',
        type: 'video',
        hint: 'Optional. Muted and looping: keep it 10–20 seconds, under ~10 MB, MP4 (H.264).',
      },
      { key: 'introTitle', label: 'Introduction — heading', max: 160 },
      { key: 'introBody', label: 'Introduction — text', type: 'textarea', max: 1500, rows: 4 },
      { key: 'experienceTitle', label: 'Experience — heading', max: 160 },
      { key: 'experienceBody', label: 'Experience — text', type: 'textarea', max: 1500, rows: 4 },
      { key: 'reserveTitle', label: 'Closing call to reserve — heading', max: 160 },
      {
        key: 'reserveBody',
        label: 'Closing call to reserve — text',
        type: 'textarea',
        max: 600,
        rows: 3,
      },
    ],
  },
  {
    id: 'about',
    label: 'About page',
    fields: [
      { key: 'title', label: 'Heading', max: 160 },
      { key: 'body', label: 'Main text', type: 'textarea', max: 4000, rows: 6 },
      { key: 'story', label: 'Our story', type: 'textarea', max: 4000, rows: 6 },
      { key: 'imageId', label: 'Image', type: 'image' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu page',
    fields: [
      { key: 'intro', label: 'Introduction', type: 'textarea', max: 600, rows: 3 },
      {
        key: 'note',
        label: 'Note under the menu',
        type: 'textarea',
        max: 600,
        rows: 3,
        hint: 'Allergies, service charge, prices including tax…',
      },
      {
        key: 'hideUnavailable',
        label: 'Hide unavailable and sold-out dishes',
        type: 'switch',
        description:
          'Off: they stay listed, marked unavailable. On: they disappear until available again.',
      },
    ],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    fields: [
      {
        key: 'acceptingOnline',
        label: 'Accept bookings through the website',
        type: 'switch',
        description: 'Off: the form is replaced by phone and WhatsApp details.',
      },
      { key: 'intro', label: 'Introduction', type: 'textarea', max: 600, rows: 3 },
      { key: 'policy', label: 'Booking policy', type: 'textarea', max: 1200, rows: 4 },
    ],
  },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function SectionForm({ section, initial, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm(initial ?? {});

  const save = async (event) => {
    event.preventDefault();
    const body = {};
    for (const field of section.fields)
      body[field.key] =
        values[field.key] ??
        (field.type === 'switch'
          ? false
          : field.type === 'image' || field.type === 'video'
            ? null
            : '');
    try {
      const { settings } = await submit(() => api.patch(`/admin/settings/${section.id}`, body));
      toast.success(`${section.label} saved.`);
      onSaved(settings);
    } catch {
      // shown in place
    }
  };

  return (
    <form className="stack" onSubmit={save} noValidate>
      {section.fields.map((field) => {
        if (field.type === 'switch') {
          return (
            <Switch
              key={field.key}
              label={field.label}
              description={field.description}
              checked={Boolean(values[field.key])}
              onChange={set(field.key)}
            />
          );
        }
        return (
          <Field key={field.key} label={field.label} hint={field.hint} error={errors[field.key]}>
            {field.type === 'textarea' ? (
              <TextArea
                value={values[field.key]}
                onChange={set(field.key)}
                rows={field.rows ?? 3}
                maxLength={field.max}
              />
            ) : field.type === 'image' || field.type === 'video' ? (
              <MediaField
                value={values[field.key] ?? null}
                onChange={set(field.key)}
                kind={field.type}
              />
            ) : (
              <TextInput
                type={field.inputType ?? 'text'}
                value={values[field.key]}
                onChange={set(field.key)}
                maxLength={field.max}
              />
            )}
          </Field>
        );
      })}
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" busy={saving}>
          Save {section.label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function HoursForm({ initial, onSaved }) {
  const toast = useToast();
  const start = {
    summary: initial?.summary ?? '',
    note: initial?.note ?? '',
    days: DAYS.map(
      (day) =>
        initial?.days?.find((d) => d.day === day) ?? {
          day,
          closed: false,
          opens: null,
          closes: null,
        }
    ),
  };
  const { values, setValues, set, errors, saving, formError, submit } = useForm(start);

  const setDay = (index, change) =>
    setValues((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => (i === index ? { ...d, ...change } : d)),
    }));

  const copyFirst = () =>
    setValues((prev) => ({
      ...prev,
      days: prev.days.map((d) => ({
        ...d,
        opens: prev.days[0].opens,
        closes: prev.days[0].closes,
        closed: prev.days[0].closed,
      })),
    }));

  const save = async (event) => {
    event.preventDefault();
    const body = {
      summary: values.summary,
      note: values.note,
      days: values.days.map((d) => ({
        day: d.day,
        closed: Boolean(d.closed),
        opens: d.opens || null,
        closes: d.closes || null,
      })),
    };
    try {
      const { settings } = await submit(() => api.patch('/admin/settings/hours', body));
      toast.success('Opening hours saved.');
      onSaved(settings);
    } catch {
      // shown below
    }
  };

  return (
    <form className="stack" onSubmit={save} noValidate>
      <Field
        label="Summary line"
        error={errors.summary}
        hint="Shown wherever hours appear in short, e.g. “Lunch & dinner, daily”."
      >
        <TextInput value={values.summary} onChange={set('summary')} maxLength={120} />
      </Field>
      <fieldset className="hours">
        <legend className="field-label">Each day</legend>
        <div className="hours-grid" role="table" aria-label="Opening hours">
          {values.days.map((d, index) => (
            <div key={d.day} className="hours-row" role="row">
              <span className="hours-day" role="rowheader">
                {d.day}
              </span>
              <span role="cell">
                <Switch
                  compact
                  label="Closed"
                  checked={d.closed}
                  onChange={(closed) => setDay(index, { closed })}
                />
              </span>
              <label className="hours-time" role="cell">
                <span className="sr-only">{d.day} opens</span>
                <input
                  type="time"
                  className="input input-s"
                  value={d.opens ?? ''}
                  disabled={d.closed}
                  onChange={(e) => setDay(index, { opens: e.target.value })}
                />
              </label>
              <span aria-hidden="true" className="muted">
                –
              </span>
              <label className="hours-time" role="cell">
                <span className="sr-only">{d.day} closes</span>
                <input
                  type="time"
                  className="input input-s"
                  value={d.closes ?? ''}
                  disabled={d.closed}
                  onChange={(e) => setDay(index, { closes: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
        <Button variant="quiet" size="s" onClick={copyFirst}>
          Copy Monday to every day
        </Button>
        {errors.days && (
          <p className="field-error">Check the times: use 24-hour time, like 18:30.</p>
        )}
      </fieldset>
      <Field label="Note" error={errors.note} optional>
        <TextArea value={values.note} onChange={set('note')} rows={2} maxLength={300} />
      </Field>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" busy={saving}>
          Save opening hours
        </Button>
      </div>
    </form>
  );
}

export default function Content() {
  const { data, status, error, reload } = useResource('/admin/settings', { key: 'settings' });
  const [settings, setSettings] = useState(null);
  const [active, setActive] = useState(
    () => (typeof window !== 'undefined' && window.location.hash.slice(1)) || 'restaurant'
  );

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  const choose = (id) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Website"
        title="Website content"
        description="Words, pictures and details shown across the public site. Saved changes go live within half a minute."
      />
      {status === 'loading' && <Skeleton rows={4} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {settings && (
        <div className="split">
          <nav className="split-nav" aria-label="Content sections">
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`split-link ${s.id === section.id ? 'is-on' : ''}`}
                    aria-current={s.id === section.id ? 'true' : undefined}
                    onClick={() => choose(s.id)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <section className="card split-body" aria-labelledby="section-title">
            <header className="card-head">
              <h2 className="card-title" id="section-title">
                {section.label}
              </h2>
            </header>
            <div className="card-pad">
              {section.intro && <Notice tone="info">{section.intro}</Notice>}
              {section.id === 'hours' ? (
                <HoursForm key="hours" initial={settings.hours} onSaved={setSettings} />
              ) : (
                <SectionForm
                  key={section.id}
                  section={section}
                  initial={settings[section.id]}
                  onSaved={setSettings}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
