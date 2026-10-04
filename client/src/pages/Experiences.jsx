import { photos } from '../data/site';
import {
  builtByHandPoints,
  firstVisitPoints,
  smokehouseSteps,
  sundownerPoints,
  reservePoints,
} from '../data/content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Picture } from '../components/Picture';
import { Promotions } from '../components/Promotions';
import { Reveal } from '../components/Reveal';
import { SectionHead } from '../components/SectionHead';

function Points({ items }) {
  return (
    <ul className="points">
      {items.map(({ key, text }) => (
        <li key={text}>
          <span className="points-key">{key}</span>
          {text}
        </li>
      ))}
    </ul>
  );
}

function Feature({ id, photo, eyebrow, title, children, reverse = false }) {
  return (
    <section className="section split-section" id={id} aria-labelledby={`${id}-title`}>
      <div className={`wrap split ${reverse ? 'split-reverse' : ''}`}>
        <Reveal motion="mask" className="split-media">
          <Picture
            photo={photo}
            sizes="(min-width: 64rem) 45vw, 100vw"
            className="media is-loaded"
          />
        </Reveal>
        <Reveal className="split-text">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display-3" id={`${id}-title`}>
            {title}
          </h2>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The smokehouse leads: it is what carries the name, and the search terms
 * people use to find a barbecue in the hill country land here.
 */
export default function Experiences() {
  useDocumentTitle(
    "Smokehouse & Experiences — Slow-Smoked BBQ in Sri Lanka's Hill Country",
    "Sri Lanka's mountain smokehouse: hardwood, hours and charcoal in hand-built offset smokers, 1,000 m above the sea at Beragala — plus the sunset sitting and group dining.",
    { brandSuffix: false }
  );

  return (
    <>
      <PageHero
        photo={photos.smoker}
        eyebrow="Hillsedge Smoke Lovers"
        title={
          <>
            The smoker is <em>the signature.</em>
          </>
        }
        intro="Sri Lanka's mountain smokehouse: hand-built offset smokers, hardwood-fed and always working. Not equipment hidden in a kitchen — the reason the place is called what it is."
      >
        <Button href="#process" variant="light" arrow>
          The process
        </Button>
      </PageHero>

      <section className="section process" id="process" aria-labelledby="process-title">
        <div className="wrap">
          <SectionHead
            eyebrow="The process"
            title={
              <>
                Wood, time, <em>charcoal</em>.
              </>
            }
            id="process-title"
          >
            <p>
              Four stages, none of them hurried. The smokehouse sets the pace for the entire
              kitchen, and everything else on the menu is timed around it. Slow-smoked barbecue is
              still rare in Sri Lanka and rarer still in the hill country — this is the only one we
              know of at 1,000 m.
            </p>
          </SectionHead>
          <Reveal as="ol" className="steps" stagger>
            {smokehouseSteps.map(({ number, title, text }, i) => (
              <li className="step" key={number} style={{ '--i': i }}>
                <span className="step-num">{number}</span>
                <h3 className="step-title">{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <Feature
        id="built"
        photo={photos.afterDark}
        eyebrow="Built by hand"
        title="Made for this hillside."
      >
        <p>
          The smokers were built rather than bought — steel chambers, offset boxes and chimneys
          sized for the volume this kitchen actually cooks, standing in the open where guests walk
          past them.
        </p>
        <p>
          Keeping them visible is deliberate. The smoke drifting across the terrace at dusk does
          more for the place than any sign could.
        </p>
        <Points items={builtByHandPoints} />
      </Feature>

      <Feature
        id="first-visit"
        photo={photos.goldenHourTable}
        eyebrow="What to order"
        title="If it's your first time."
        reverse
      >
        <p>
          Start with something from the smoker, add a charcoal-grilled plate for the table, and let
          the rest of the menu fill in around it. Groups are best served by a sharing platter and a
          spread of sides.
        </p>
        <Points items={firstVisitPoints} />
        <Button to="/menu" variant="outline" arrow>
          See the full menu
        </Button>
      </Feature>

      <Feature
        id="sunset"
        photo={photos.sundowners}
        eyebrow="The sunset sitting"
        title="Sundowners on the deck."
      >
        <p>
          Arrive late afternoon: the valley in daylight, the sunset over the hills, then the lit
          pathways after dark — three versions of the place in one visit. The deck at sunset is the
          most requested seat in the house.
        </p>
        <Points items={sundownerPoints} />
        <Button to="/reservations" variant="gold" arrow>
          Reserve the sunset sitting
        </Button>
      </Feature>

      <Feature
        id="groups"
        photo={photos.diningHall}
        eyebrow="Groups & coaches"
        title="Built for a full table."
        reverse
      >
        <p>
          There&apos;s parking on site for coaches, and set or group menus can be arranged in
          advance around the smokehouse. Message us with numbers and timing.
        </p>
        <Points items={reservePoints} />
        <Button to="/rooms" variant="outline" arrow>
          Our spaces
        </Button>
      </Feature>

      <Promotions eyebrow="Events & offers" title="What's on." />

      <section className="section closing">
        <div className="closing-media" aria-hidden="true">
          <Picture photo={photos.litPathway} className="media is-loaded" alt="" />
        </div>
        <Reveal className="wrap closing-content">
          <p className="closing-title">
            Hardwood, hours and charcoal. That&apos;s the whole trick.
          </p>
          <div className="closing-actions">
            <Button to="/reservations" variant="gold" arrow>
              Reserve a table
            </Button>
            <Button to="/gallery" variant="light">
              See the place
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
