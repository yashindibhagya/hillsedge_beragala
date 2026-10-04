import { useSite } from '../context/SiteData';
import { Button } from './Button';
import { MediaById } from './Media';
import { Reveal } from './Reveal';

const KIND = {
  offer: 'Offer',
  seasonal_menu: 'Seasonal menu',
  event: 'Event',
  discount: 'Offer',
  limited_dish: 'Limited time',
  holiday: 'Holiday',
};

const formatRange = (start, end) => {
  const fmt = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (end) return `Until ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return null;
};

/**
 * Whatever offers and events the admin has running today. Renders nothing
 * at all when there are none — an empty "Offers" heading reads as neglect.
 */
export function Promotions({ eyebrow = "What's on", title = 'Now at Hillsedge' }) {
  const { promotions } = useSite();
  if (promotions.length === 0) return null;

  return (
    <section className="section promos" aria-labelledby="promos-title">
      <div className="wrap">
        <header className="section-head">
          <div className="section-head-text">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="section-title" id="promos-title">
              {title}
            </h2>
          </div>
        </header>
        <Reveal className="promo-list" stagger>
          {promotions.map((promo, i) => {
            const dates = formatRange(promo.startsOn, promo.endsOn);
            const internal = promo.ctaHref?.startsWith('/');
            return (
              <article
                className={`promo ${promo.imageId ? 'has-image' : ''}`}
                key={promo.id}
                style={{ '--i': i }}
              >
                {promo.imageId && (
                  <div className="promo-media zoom">
                    <MediaById id={promo.imageId} sizes="(min-width: 64rem) 40vw, 100vw" />
                  </div>
                )}
                <div className="promo-body">
                  <p className="eyebrow">
                    {KIND[promo.kind] ?? 'Offer'}
                    {dates && <span className="promo-dates"> · {dates}</span>}
                  </p>
                  <h3 className="promo-title">{promo.title}</h3>
                  {promo.description && <p>{promo.description}</p>}
                  {promo.ctaHref && (
                    <Button
                      {...(internal ? { to: promo.ctaHref } : { href: promo.ctaHref })}
                      variant="outline"
                      size="sm"
                      arrow
                    >
                      {promo.ctaLabel || 'Find out more'}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export default Promotions;
