import { useSite } from '../context/SiteData';
import { photos } from '../data/site';
import { greetings, hierarchyTiers, pillars, settingPoints } from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button, TLink } from '../components/Button';
import { Icon } from '../components/Icon';
import { Visual } from '../components/Media';
import { PageHero } from '../components/PageHero';
import { Picture } from '../components/Picture';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/SectionHead';

export default function About() {
  useDocumentTitle(
    'About — Mountain Dining Destination, Beragala',
    "A dining destination on the Beragala–Haputale hill road in Sri Lanka's tea country. How the smokehouse, the setting and nine kitchens fit together.",
    { brandSuffix: false }
  );
  const { settings } = useSite();
  const { about } = settings;

  return (
    <>
      <PageHero
        photo={photos.sunsetValley}
        eyebrow="About Hillsedge"
        title={
          <>
            A destination, <em>not a stop.</em>
          </>
        }
        intro="On the Beragala–Haputale hill road, on an escarpment above the valleys — built from timber, stone and thatch, and built to be remembered."
      />

      <section className="section statement">
        <Reveal className="wrap">
          <p className="statement-text">
            Most places can offer food. Hillsedge offers <em>an experience around it.</em>
          </p>
        </Reveal>
      </section>

      <section className="section split-section" aria-labelledby="about-title">
        <div className="wrap split">
          <Reveal motion="mask" className="split-media">
            <Visual
              id={about.imageId}
              photo={photos.timberThatch}
              sizes="(min-width: 64rem) 45vw, 100vw"
            />
          </Reveal>
          <Reveal className="split-text">
            <p className="eyebrow">Our story</p>
            <h2 className="display-3" id="about-title">
              {about.title}
            </h2>
            <p className="lede">{about.body}</p>
            {about.story && <p>{about.story}</p>}
            <ol className="points">
              {settingPoints.map(({ key, text }) => (
                <li key={key}>
                  <span className="points-key">{key}</span>
                  {text}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="section tiers-section" aria-labelledby="tiers-title">
        <div className="wrap">
          <SectionHead
            eyebrow="How it fits together"
            title="One destination, one signature, nine kitchens."
            id="tiers-title"
          />
          <Reveal as="ol" className="tiers" stagger>
            {hierarchyTiers.map(({ level, title, text, link }, i) => (
              <li key={title} className="tier" style={{ '--i': i }}>
                <span className="tier-level">{level}</span>
                <h3 className="tier-title">{title}</h3>
                <p>{text}</p>
                {link && (
                  <TLink
                    to={link.to.replace('/smokehouse', '/experiences').replace('/cuisine', '/menu')}
                    className="text-link"
                  >
                    {link.label} <Icon name="arrow" size={16} />
                  </TLink>
                )}
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section pillars-section" aria-labelledby="pillars-title">
        <div className="wrap">
          <SectionHead
            eyebrow="What we hold to"
            title="Five words for the place."
            id="pillars-title"
            align="center"
          />
          <Reveal as="ul" className="pillars" stagger>
            {pillars.map(({ title, text }, i) => (
              <li key={title} style={{ '--i': i }}>
                <h3 className="pillar-title">{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section split-section welcome" aria-labelledby="welcome-title">
        <div className="wrap split split-reverse">
          <Reveal className="split-text">
            <p className="eyebrow">Everyone at the table</p>
            <h2 className="display-3" id="welcome-title">
              A wide table, on purpose.
            </h2>
            <p>
              Hill-country travellers arrive from everywhere — the Ella and Haputale circuit brings
              visitors from China, the UK, India, France, Germany, Italy, Russia, Switzerland, the
              Czech Republic, Pakistan, Norway, Malaysia and the Middle East, alongside Sri Lankan
              families on weekend drives.
            </p>
            <p>
              Nine cuisines means a family, a couple, a tour group and a food-focused traveller can
              all eat well at the same table — while the smokehouse still gives the place one
              identity everybody remembers.
            </p>
          </Reveal>
          <Reveal className="greetings" aria-label="Welcome, in the languages of our guests">
            {greetings.map((word, i) => (
              <span key={word} style={{ '--i': i }}>
                {word}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section closing">
        <div className="closing-media" aria-hidden="true">
          <Picture photo={photos.underTheStars} className="media is-loaded" alt="" />
        </div>
        <Reveal className="wrap closing-content">
          <p className="closing-title">Where mountain nature meets smoke and flavour.</p>
          <div className="closing-actions">
            <Button to="/menu" variant="gold" arrow>
              Explore the menu
            </Button>
            <Button to="/contact" variant="light">
              Plan your visit
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
