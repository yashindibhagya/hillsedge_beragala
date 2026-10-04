/**
 * Line icons, drawn on a 24px grid with a 1.5px stroke so they sit with the
 * hairline rules elsewhere. Decorative by default; pass `label` when an icon
 * is the only thing saying what a control does.
 */
const paths = {
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M3 8h18M3 16h18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14Z" />
      <path d="M5 19 13 11" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20v-8" />
      <path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Zm0 0c0-4 3-6 7-6 0 4-3 6-7 6Z" />
    </>
  ),
  chili: (
    <path d="M14 6c2 0 3 1 3 3 0 6-5 11-12 11 4-3 5-7 6-11 .5-2 1.5-3 3-3Zm0 0c0-1.5.8-2.5 2-3" />
  ),
  star: <path d="m12 4 2.3 4.9 5.2.6-3.9 3.6 1.1 5.2L12 15.7l-4.7 2.6 1.1-5.2-3.9-3.6 5.2-.6Z" />,
  flame: (
    <path d="M12 21c-3.9 0-6-2.5-6-5.6C6 11 11 9.5 10.5 3c3.5 2 7.5 6.3 7.5 11.6 0 3.6-2.4 6.4-6 6.4Z" />
  ),
  sparkle: (
    <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" />
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" />
      <path d="M15.5 5.2a3 3 0 0 1 0 5.6M18 14.3c1.6.7 2.6 2.2 3 4.7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  play: <path d="M8 5v14l11-7Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
    </>
  ),
  facebook: (
    <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5l.5-3.5h-3V9a.5.5 0 0 1 .5-.5Z" />
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8.6 19Z" />
      <path d="M9 9c0 3.2 2.8 6 6 6l1-1.5-2-1-1 .8A4 4 0 0 1 11 11.3l.8-1-1-2Z" />
    </>
  ),
  tripadvisor: (
    <>
      <circle cx="7" cy="13" r="3.5" />
      <circle cx="17" cy="13" r="3.5" />
      <path d="M3 9h18M12 9c-2-2-6-2.5-9 0M12 9c2-2 6-2.5 9 0M12 17.5l-1.5-1.8M12 17.5l1.5-1.8" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9 5 3-5 3Z" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.2 4.2 5 4.5" />,
};

export function Icon({ name, label, size = 20, className = '', ...rest }) {
  const accessible = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...accessible}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export default Icon;
