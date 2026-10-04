import { Link, NavLink } from 'react-router-dom';
import { Icon } from './Icon';

/**
 * Internal links run through the View Transitions API, so moving between
 * pages crossfades instead of cutting. Browsers without it navigate as
 * normal; the reduced-motion rule in motion.css turns the fade off.
 */
export function TLink(props) {
  return <Link viewTransition {...props} />;
}

export function TNavLink(props) {
  return <NavLink viewTransition {...props} />;
}

/**
 * One button style system for links and buttons alike.
 *
 * variant: solid (olive) | gold | outline | ghost | light (on images)
 * `to` renders a router link, `href` an anchor, neither a <button>.
 */
export function Button({
  to,
  href,
  variant = 'solid',
  size,
  arrow = false,
  icon,
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', className]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {arrow && <Icon name="arrow" size={18} className="btn-arrow" />}
    </>
  );

  if (to) {
    return (
      <TLink to={to} className={classes} {...rest}>
        {content}
      </TLink>
    );
  }
  if (href) {
    const external = /^https?:/.test(href);
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

export default Button;
