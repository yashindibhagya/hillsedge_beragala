import { useMediaLookup } from '../context/SiteData';
import { formatPrice, isBookable, ROOM_KIND, ROOM_STATUS } from '../lib/format';
import { Badge } from './Badge';
import { Button } from './Button';
import { Icon } from './Icon';
import { Media } from './Media';

/**
 * A bookable space. Capacity and price appear only when the admin has set
 * them; the booking button only when the space is actually taking bookings.
 */
export function RoomCard({ room, currency, layout = 'card', headingLevel = 'h3' }) {
  const lookup = useMediaLookup();
  const Heading = headingLevel;
  const cover = lookup(room.videoId) ?? lookup(room.imageIds?.[0]);
  const status = ROOM_STATUS[room.bookingStatus];
  const price = formatPrice(room.price, currency);
  const bookable = isBookable(room);

  return (
    <article className={`room room-${layout}`} id={room.slug}>
      <div className="room-media zoom">
        {cover ? (
          <Media
            media={cover}
            sizes={
              layout === 'wide' ? '(min-width: 64rem) 55vw, 100vw' : '(min-width: 64rem) 33vw, 90vw'
            }
          />
        ) : (
          <div className="room-media-empty" aria-hidden="true" />
        )}
        {status && (
          <Badge tone={status.tone} className="room-status">
            {status.label}
          </Badge>
        )}
      </div>
      <div className="room-body">
        <p className="eyebrow">{ROOM_KIND[room.kind] ?? 'Space'}</p>
        <Heading className="room-name">{room.name}</Heading>
        {room.summary && <p className="room-summary">{room.summary}</p>}
        {layout === 'wide' && room.description && <p className="room-desc">{room.description}</p>}
        <ul className="room-facts">
          {room.capacity && (
            <li>
              <Icon name="users" size={18} /> Up to {room.capacity} guests
            </li>
          )}
          {price && (
            <li>
              <span className="room-price">{price}</span>
              {room.priceUnit && <span className="room-price-unit"> {room.priceUnit}</span>}
            </li>
          )}
        </ul>
        {room.features?.length > 0 && (
          <ul className="room-features" aria-label="Features">
            {room.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
        {bookable && (
          <Button
            to={`/reservations?space=${encodeURIComponent(room.id)}`}
            variant="outline"
            size="sm"
            arrow
            aria-label={`Book ${room.name}`}
          >
            Book this space
          </Button>
        )}
      </div>
    </article>
  );
}

export default RoomCard;
