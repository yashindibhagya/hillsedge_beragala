/**
 * Eyebrow, heading and an optional lede, in the editorial rhythm every
 * section uses. `as` sets the heading level so the outline stays correct.
 */
export function SectionHead({
  eyebrow,
  title,
  as: Heading = 'h2',
  children,
  align = 'start',
  className = '',
  id,
  action,
}) {
  return (
    <header className={`section-head section-head-${align} ${className}`.trim()}>
      <div className="section-head-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading className="section-title" id={id}>
          {title}
        </Heading>
        {children && <div className="lede">{children}</div>}
      </div>
      {action && <div className="section-head-action">{action}</div>}
    </header>
  );
}

export default SectionHead;
