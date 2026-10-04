import { useSite } from '../context/SiteData';
import { photos, site } from '../data/site';
import { faqs, nearbyLandmarks, routes } from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { addressLines, groupHours, telHref } from '../lib/format';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/SectionHead';
import { SocialLinks } from '../components/SocialLinks';

export default function Contact() {
  useDocumentTitle(
    'Restaurant near Diyaluma Falls & Haputale — Hillsedge',
    'Where to eat between Ella and Haputale — on the A4 at Beragala, about 21 km from Diyaluma Falls. Directions, hours, coach parking and table reservations.',
    { brandSuffix: false }
  );
  const { settings } = useSite();
  const { restaurant, hours } = settings;
  const rows = groupHours(hours.days);

  return (
    <>
      <PageHero
        photo={photos.litPathway}
        eyebrow="Contact & visit"
        title={
          <>
            Find us above <em>the clouds.</em>
          </>
        }
        intro="On the Beragala–Haputale hill road in Sri Lanka's tea country — an easy stop between Ella, Bandarawela, Nuwara Eliya and the south coast."
      />

      <section className="section contact" aria-labelledby="where-title">
        <div className="wrap contact-grid">
          <Reveal className="contact-info">
            <p className="eyebrow">Where we are</p>
            <h2 className="display-3" id="where-title">
              Beragala, Badulla District.
            </h2>
            <p className="lede">
              The signboard sits right on the road — turn in and follow the lit path up to the
              lodge.
            </p>

            <dl className="contact-list">
              <div>
                <dt>
                  <Icon name="pin" size={18} /> Address
                </dt>
                <dd>
                  {addressLines(restaurant.address).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  <span className="muted">Plus code QW74+64 Beragala · {site.coordinates}</span>
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="clock" size={18} /> Hours
                </dt>
                <dd>
                  {hours.summary && <span>{hours.summary}</span>}
                  {rows.map(({ label, value }) => (
                    <span key={label}>
                      {label}: {value}
                    </span>
                  ))}
                </dd>
              </div>
              {restaurant.phone && (
                <div>
                  <dt>
                    <Icon name="phone" size={18} /> Call or message
                  </dt>
                  <dd>
                    <a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
                    <span className="muted">WhatsApp on the same number</span>
                  </dd>
                </div>
              )}
              {restaurant.email && (
                <div>
                  <dt>
                    <Icon name="mail" size={18} /> Email
                  </dt>
                  <dd>
                    <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
                    <span className="muted">Group and partnership enquiries welcome</span>
                  </dd>
                </div>
              )}
              <div>
                <dt>
                  <Icon name="users" size={18} /> Parking
                </dt>
                <dd>On site, including coaches</dd>
              </div>
            </dl>

            <div className="contact-actions">
              {restaurant.mapsUrl && (
                <Button href={restaurant.mapsUrl} variant="solid" icon="pin">
                  Open in Google Maps
                </Button>
              )}
              <Button to="/reservations" variant="gold" arrow>
                Reserve a table
              </Button>
            </div>
            <SocialLinks />
          </Reveal>

          <Reveal motion="mask" className="map">
            <iframe
              loading="lazy"
              title={`Map showing ${restaurant.name}`}
              src={site.mapEmbedUrl}
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        </div>
      </section>

      <section className="section routes-section" aria-labelledby="routes-title">
        <div className="wrap">
          <SectionHead eyebrow="Getting here" title="However you're travelling." id="routes-title">
            <p>
              Beragala sits at the junction of the A4 and A23, which puts Hillsedge on the natural
              route between the hill country and the south.
            </p>
          </SectionHead>
          <Reveal as="ol" className="routes" stagger>
            {routes.map(({ from, title, text, duration }, i) => (
              <li className="route" key={title} style={{ '--i': i }}>
                <p className="eyebrow">{from}</p>
                <h3 className="route-title">{title}</h3>
                <p>{text}</p>
                <p className="route-time">
                  <Icon name="clock" size={16} /> {duration}
                </p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section nearby-section" id="nearby" aria-labelledby="nearby-title">
        <div className="wrap">
          <SectionHead
            eyebrow="What's nearby"
            title="The waterfalls, the viewpoints, and us in the middle."
            id="nearby-title"
          >
            <p>
              Beragala sits between most of the hill country&apos;s best-known stops. Distances are
              by road and the times allow for mountain driving — nothing here is as quick as the
              kilometres suggest.
            </p>
          </SectionHead>
          <ul className="nearby">
            {nearbyLandmarks.map(({ name, also, distance, time, text }) => (
              <li className="near" key={name}>
                <div className="near-head">
                  <h3 className="near-name">{name}</h3>
                  <p className="near-meta">
                    {distance} · {time}
                  </p>
                </div>
                {also && <p className="near-also">{also}</p>}
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section faq-section" id="faq" aria-labelledby="faq-title">
        <div className="wrap faq-grid">
          <SectionHead eyebrow="Before you come" title="Good to know." id="faq-title">
            <p>
              A few things guests ask most often. Anything else, send us a message and we&apos;ll
              answer directly.
            </p>
          </SectionHead>
          <div className="faq">
            {faqs.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  <span>{q}</span>
                  <Icon name="plus" size={20} className="faq-icon" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
