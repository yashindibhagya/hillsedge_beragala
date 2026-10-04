import { useSearchParams } from 'react-router-dom';
import { useSite } from '../context/SiteData';
import { photos } from '../data/site';
import { reservePoints } from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { groupHours, telHref } from '../lib/format';
import { Icon } from '../components/Icon';
import { Picture } from '../components/Picture';
import { ReservationForm } from '../components/ReservationForm';

export default function Reservations() {
  useDocumentTitle(
    'Reserve a Table',
    'Book a table at Hillsedge Beragala — the sunset sitting, lunch on the drive between Ella and Haputale, or a group or coach stop.'
  );
  const { settings } = useSite();
  const [params] = useSearchParams();
  const { restaurant, reservations, hours } = settings;
  const rows = groupHours(hours.days);

  return (
    <div className="reserve-page">
      <aside className="reserve-aside">
        <div className="reserve-aside-media" aria-hidden="true">
          <Picture photo={photos.deckDinner} priority className="media is-loaded" alt="" />
        </div>
        <div className="reserve-aside-content">
          <p className="eyebrow eyebrow-light">Reservations</p>
          <h1 className="display-2">Reserve a table.</h1>
          <p className="lede">{reservations.intro}</p>
          <ul className="reserve-facts">
            {hours.summary && (
              <li>
                <Icon name="clock" size={18} /> {hours.summary}
              </li>
            )}
            {rows.map(({ label, value }) => (
              <li key={label} className="reserve-facts-sub">
                {label}: {value}
              </li>
            ))}
            {restaurant.phone && (
              <li>
                <Icon name="phone" size={18} />{' '}
                <a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
              </li>
            )}
            <li>
              <Icon name="pin" size={18} /> {restaurant.region}
            </li>
          </ul>
        </div>
      </aside>

      <section className="reserve-main" aria-label="Booking form">
        <ReservationForm initialRoomId={params.get('space') ?? ''} />
        <div className="reserve-policy" id="policy">
          <h2 className="eyebrow">Good to know</h2>
          {reservations.policy && <p>{reservations.policy}</p>}
          <ul className="points">
            {reservePoints.map(({ text }) => (
              <li key={text}>
                <span className="points-key">—</span>
                {text}
              </li>
            ))}
          </ul>
          {hours.note && <p className="form-note">{hours.note}</p>}
        </div>
      </section>
    </div>
  );
}
