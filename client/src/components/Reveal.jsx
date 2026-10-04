import { useReveal } from '../hooks/useReveal';

/**
 * Scroll-in wrapper. `motion` picks the entry: fade | up | left | right |
 * mask (an image wiped in from below) | none. `stagger` delays each direct
 * child in turn — the children read `--i` from their own style.
 */
export function Reveal({
  as: Tag = 'div',
  motion = 'up',
  delay,
  stagger = false,
  className = '',
  style,
  children,
  ...rest
}) {
  const [ref, visible] = useReveal();
  const classes = [
    'reveal',
    `reveal-${motion}`,
    stagger ? 'reveal-stagger' : '',
    visible ? 'is-in' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      ref={ref}
      className={classes}
      style={delay ? { '--reveal-delay': delay, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
