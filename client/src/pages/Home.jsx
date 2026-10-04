import { useSite } from '../context/SiteData';
import { useDeclareHero } from '../context/Hero';
import { photos, site } from '../data/site';
import { homeStats } from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useParallax } from '../hooks/useParallax';
import { telHref } from '../lib/format';
import { Button, TLink } from '../components/Button';
import { DishFeature } from '../components/Dish';
import { HorizontalStory } from '../components/HorizontalStory';
import { Icon } from '../components/Icon';
import { Media, MediaById, Visual } from '../components/Media';
import { Picture } from '../components/Picture';
import { Promotions } from '../components/Promotions';
import { Reveal } from '../components/Reveal';
import { RoomCard } from '../components/RoomCard';
import { SectionHead } from '../components/SectionHead';
import { Testimonials } from '../components/Testimonials';

/** The four moods of a visit, in the order the light moves through them. */
const story = [
  {
    photo: photos.sunsetValley,
    kicker: '01 · Daylight',
    title: 'The valley, laid out below.',
    text: 'Open-sided dining level with the treeline, and the hills folding away to the south coast on a clear day.',
  },
  {
    photo: photos.smoker,
    kicker: '02 · Smoke',
    title: 'You smell it long before you see the plate.',
    text: 'Hand-built offset smokers, hardwood-fed and always working — in the open, where guests walk past them.',
  },
  {
    photo: photos.deckDinner,
    kicker: '03 · Sunset',
    title: 'The deck turns gold.',
    text: 'The sunset sitting is the most requested seat in the house. Sundowners as the sun drops behind the hills.',
  },
  {
    photo: photos.afterDark,
    kicker: '04 · After dark',
    title: 'Lanterns on the path.',
    text: 'Terraced gardens and stone pathways lit from dusk onwards — a third version of the place, in the same visit.',
  },
];

function Hero() {
  useDeclareHero();
  const { settings, media } = useSite();
  const { home } = settings;
  const parallax = useParallax(80, { scale: 1.08 });
  const image = media[home.heroImageId];
  const video = media[home.heroVideoId];
  const still = image ? (
    <Media media={image} priority className="hero-img" />
  ) : (
    <Picture photo={photos.pathDusk} priority className="hero-img media is-loaded" alt="" />
  );

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-media" aria-hidden="true">
        <div className="hero-parallax" ref={parallax}>
          <div className="hero-kenburns">
            {video ? <Media media={video} priority className="hero-img" fallback={still} /> : still}
          </div>
        </div>
      </div>
      <div className="hero-content wrap">
        <p className="eyebrow eyebrow-light hero-in" style={{ '--i': 0 }}>
          {home.heroEyebrow}
        </p>
        <h1 className="hero-title hero-in" id="hero-title" style={{ '--i': 1 }}>
          {home.heroTitle}
        </h1>
        {home.heroSubtitle && (
          <p className="hero-sub hero-in" style={{ '--i': 2 }}>
            {home.heroSubtitle}
          </p>
        )}
        <div className="hero-actions hero-in" style={{ '--i': 3 }}>
          <Button to="/reservations" variant="gold" size="lg" arrow>
            Reserve a table
          </Button>
          <Button to="/menu" variant="light" size="lg">
            Explore the menu
          </Button>
          <TLink to="/rooms" className="hero-link">
            Discover our spaces <Icon name="arrow" size={16} />
          </TLink>
        </div>
      </div>
      <div className="hero-foot wrap hero-in" style={{ '--i': 4 }}>
        <span>{site.coordinates}</span>
        <span className="hero-foot-rule" aria-hidden="true" />
        <span>{settings.hours.summary}</span>
      </div>
      <a href="#intro" className="hero-scroll" aria-label="Scroll to the introduction">
        <span aria-hidden="true" />
      </a>
    </section>
  );
}

export default function Home() {
  useDocumentTitle(
    null,
    'A mountain smokehouse and BBQ restaurant in Beragala, on the hill road between Ella and Haputale. Slow-smoked meats, nine kitchens and views over the valley.'
  );
  const { settings, featured, categories, rooms, gallery, media } = useSite();
  const { home, restaurant } = settings;
  const galleryItems = gallery
    .map((id) => media[id])
    .filter(Boolean)
    .slice(0, 10);

  return (
    <>
      <Hero />

      <section className="section intro" id="intro" aria-labelledby="intro-title">
        <div className="wrap intro-grid">
          <Reveal className="intro-text">
            <p className="eyebrow">Welcome to Hillsedge</p>
            <h2 className="display-2" id="intro-title">
              {home.introTitle}
            </h2>
            <p className="lede">{home.introBody}</p>
            <Button to="/about" variant="outline" arrow>
              Our story
            </Button>
          </Reveal>
          <Reveal motion="mask" className="intro-media">
            <Visual
              id={settings.about.imageId}
              photo={photos.timberThatch}
              sizes="(min-width: 64rem) 45vw, 100vw"
            />
          </Reveal>
        </div>
        <Reveal as="dl" className="wrap stats" stagger>
          {homeStats.map(({ value, label }, i) => (
            <div key={label} style={{ '--i': i }}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </Reveal>
      </section>

      <Promotions />

      {featured.length > 0 && (
        <section className="section signature" aria-labelledby="signature-title">
          <div className="wrap">
            <SectionHead
              eyebrow="Signature dishes"
              title="What the hills are known for."
              id="signature-title"
              action={
                <Button to="/menu" variant="outline" arrow>
                  View full menu
                </Button>
              }
            />
            <Reveal className="signature-grid" stagger>
              {featured.slice(0, 6).map((item, index) => (
                <div key={item.id} style={{ '--i': index }}>
                  <DishFeature item={item} currency={restaurant.currency} index={index} />
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="section menu-preview" aria-labelledby="menu-preview-title">
          <div className="wrap menu-preview-grid">
            <SectionHead
              eyebrow="The menu"
              title="Nine kitchens, one table."
              id="menu-preview-title"
            >
              <p>{settings.menu.intro}</p>
              <Button to="/menu" variant="solid" arrow>
                View full menu
              </Button>
            </SectionHead>
            <Reveal as="ol" className="menu-index" stagger>
              {categories.map((category, index) => (
                <li key={category.id} style={{ '--i': index }}>
                  <TLink to={`/menu#${category.slug}`} className="menu-index-link">
                    <span className="menu-index-num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="menu-index-name">{category.name}</span>
                    {category.imageId && (
                      <span className="menu-index-peek" aria-hidden="true">
                        <MediaById id={category.imageId} sizes="240px" alt="" />
                      </span>
                    )}
                    <Icon name="arrowUpRight" className="menu-index-arrow" />
                  </TLink>
                </li>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      <section className="section experience-head" aria-labelledby="experience-title">
        <div className="wrap">
          <SectionHead eyebrow="The experience" title={home.experienceTitle} id="experience-title">
            <p>{home.experienceBody}</p>
          </SectionHead>
        </div>
      </section>
      <HorizontalStory label="A visit, from daylight to dark">
        {story.map((panel) => (
          <article className="hstory-panel" key={panel.kicker}>
            <div className="hstory-media zoom">
              <Picture
                photo={panel.photo}
                sizes="(min-width: 64rem) 60vw, 85vw"
                className="media is-loaded"
              />
            </div>
            <div className="hstory-text">
              <p className="eyebrow">{panel.kicker}</p>
              <h3 className="hstory-title">{panel.title}</h3>
              <p>{panel.text}</p>
            </div>
          </article>
        ))}
        <article className="hstory-panel hstory-end">
          <p className="eyebrow">Stay for all three</p>
          <p className="hstory-end-title">Arrive late afternoon.</p>
          <Button to="/experiences" variant="outline" arrow>
            Experiences
          </Button>
        </article>
      </HorizontalStory>

      {rooms.length > 0 && (
        <section className="section spaces" aria-labelledby="spaces-title">
          <div className="wrap">
            <SectionHead
              eyebrow="Rooms & private dining"
              title="Somewhere for every table."
              id="spaces-title"
              action={
                <Button to="/rooms" variant="outline" arrow>
                  All spaces
                </Button>
              }
            />
            <Reveal className="room-grid" stagger>
              {rooms.slice(0, 3).map((room, i) => (
                <div key={room.id} style={{ '--i': i }}>
                  <RoomCard room={room} currency={restaurant.currency} />
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {galleryItems.length > 0 && (
        <section className="section gallery-strip" aria-labelledby="strip-title">
          <div className="wrap">
            <SectionHead
              eyebrow="Gallery"
              title="Timber, stone and thatch."
              id="strip-title"
              action={
                <Button to="/gallery" variant="outline" arrow>
                  Open the gallery
                </Button>
              }
            />
          </div>
          <ul className="strip" tabIndex={0} aria-label="Photographs — scroll sideways">
            {galleryItems.map((item) => (
              <li key={item.id} className="strip-item zoom">
                <Media media={item} sizes="(min-width: 64rem) 30vw, 70vw" />
                {item.caption && <span className="strip-caption">{item.caption}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Testimonials />

      <section className="reserve-cta" aria-labelledby="reserve-title">
        <div className="reserve-cta-media" aria-hidden="true">
          <Picture photo={photos.sundowners} className="media is-loaded" alt="" />
        </div>
        <Reveal className="reserve-cta-content wrap">
          <p className="eyebrow eyebrow-light">Reservations</p>
          <h2 className="display-2" id="reserve-title">
            {home.reserveTitle}
          </h2>
          <p className="lede">{home.reserveBody}</p>
          <div className="reserve-cta-actions">
            <Button to="/reservations" variant="gold" size="lg" arrow>
              Reserve a table
            </Button>
            {restaurant.phone && (
              <Button href={telHref(restaurant.phone)} variant="light" icon="phone">
                {restaurant.phone}
              </Button>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}
