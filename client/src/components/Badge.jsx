import { Icon } from './Icon';
import { AVAILABILITY, SPICE } from '../lib/format';

/** A small status or attribute label. `tone`: ok | warn | danger | info | gold | olive. */
export function Badge({ tone = 'olive', icon, children, className = '' }) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

export function AvailabilityBadge({ availability }) {
  const state = AVAILABILITY[availability];
  if (!state || availability === 'available') return null;
  return <Badge tone={state.tone}>{state.label}</Badge>;
}

/**
 * The tags a dish carries, in a fixed order: what it is to the kitchen
 * first (signature, bestseller, special), then what it is to the guest.
 */
export function DishTags({ item, compact = false }) {
  const tags = [];
  if (item.featured)
    tags.push(
      <Badge key="sig" tone="gold" icon="star">
        Signature
      </Badge>
    );
  if (item.bestseller)
    tags.push(
      <Badge key="best" tone="gold" icon="flame">
        Bestseller
      </Badge>
    );
  if (item.special)
    tags.push(
      <Badge key="spec" tone="gold" icon="sparkle">
        Special
      </Badge>
    );
  if (item.vegan)
    tags.push(
      <Badge key="vegan" tone="olive" icon="sprout">
        Vegan
      </Badge>
    );
  else if (item.vegetarian)
    tags.push(
      <Badge key="veg" tone="olive" icon="leaf">
        Vegetarian
      </Badge>
    );
  if (item.spicy > 0) {
    tags.push(
      <Badge key="spice" tone="danger" icon="chili">
        {compact ? SPICE[item.spicy] : `${SPICE[item.spicy]} spice`}
      </Badge>
    );
  }
  if (tags.length === 0) return null;
  return <div className="tags">{tags}</div>;
}
