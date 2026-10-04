import { useEffect } from 'react';
import { recordView } from '../api/client';
import { useMediaLookup } from '../context/SiteData';
import { formatPrice, SPICE } from '../lib/format';
import { AvailabilityBadge, DishTags } from './Badge';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { Media } from './Media';
import { Modal } from './Modal';

/**
 * One line of the menu, set like a printed menu: name and price on a dotted
 * leader, description beneath. A dish with a photograph shows a thumbnail,
 * and on a hover-capable pointer a larger preview floats beside the row.
 *
 * Unavailable dishes stay on the menu, dimmed and labelled, so a guest who
 * came for one learns why it is missing rather than wondering if it ever
 * existed.
 */
export function DishRow({ item, currency, onOpen }) {
  const lookup = useMediaLookup();
  const image = lookup(item.imageId);
  const price = formatPrice(item.price, currency);
  const unavailable = item.availability !== 'available';

  return (
    <li className={`dish ${unavailable ? 'is-unavailable' : ''} ${image ? 'has-image' : ''}`}>
      <button
        type="button"
        className="dish-button"
        onClick={() => onOpen(item)}
        aria-haspopup="dialog"
      >
        {image && (
          <span className="dish-thumb">
            <Media media={image} sizes="96px" className="dish-thumb-img" alt="" />
          </span>
        )}
        <span className="dish-body">
          <span className="dish-line">
            <span className="dish-name">{item.name}</span>
            <span className="dish-leader" aria-hidden="true" />
            {price && <span className="dish-price">{price}</span>}
          </span>
          {item.description && <span className="dish-desc">{item.description}</span>}
          <span className="dish-meta">
            <AvailabilityBadge availability={item.availability} />
            <DishTags item={item} compact />
          </span>
        </span>
        {image && (
          <span className="dish-preview" aria-hidden="true">
            <Media media={image} sizes="320px" alt="" />
          </span>
        )}
      </button>
    </li>
  );
}

/** A featured dish on the home page: large image where there is one, type where not. */
export function DishFeature({ item, currency, index }) {
  const lookup = useMediaLookup();
  const image = lookup(item.imageId);
  const price = formatPrice(item.price, currency);
  return (
    <article className={`dish-feature ${image ? 'has-image' : 'is-type'}`}>
      {image ? (
        <div className="dish-feature-media zoom">
          <Media media={image} sizes="(min-width: 64rem) 40vw, 90vw" />
        </div>
      ) : (
        <div className="dish-feature-numeral" aria-hidden="true">
          <BrandMark className="dish-feature-crest" />
          <span>{String(index + 1).padStart(2, '0')}</span>
        </div>
      )}
      <div className="dish-feature-text">
        <DishTags item={item} compact />
        <h3 className="dish-feature-name">{item.name}</h3>
        {item.description && <p>{item.description}</p>}
        {price && <p className="dish-feature-price">{price}</p>}
      </div>
    </article>
  );
}

/** The full detail of one dish, opened from the menu. */
export function DishModal({ item, currency, categoryName, onClose }) {
  const lookup = useMediaLookup();
  const open = Boolean(item);

  useEffect(() => {
    if (item) recordView(item.id);
  }, [item]);

  if (!item) return <Modal open={false} onClose={onClose} />;

  const video = lookup(item.videoId);
  const image = lookup(item.imageId);
  const price = formatPrice(item.price, currency);
  const facts = [
    item.ingredients?.length > 0 && ['Ingredients', item.ingredients.join(', ')],
    item.dietary?.length > 0 && ['Dietary', item.dietary.join(', ')],
    item.allergens?.length > 0 && ['Allergens', item.allergens.join(', ')],
    item.spicy > 0 && ['Spice', SPICE[item.spicy]],
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="dish-title"
      className={`dish-modal ${video || image ? 'has-media' : ''}`}
    >
      {(video || image) && (
        <div className="dish-modal-media">
          <Media
            media={video ?? image}
            sizes="(min-width: 56rem) 50vw, 100vw"
            fallback={null}
            priority
          />
        </div>
      )}
      <div className="dish-modal-body">
        {categoryName && (
          <p className="eyebrow">
            {categoryName}
            {item.subcategory ? ` · ${item.subcategory}` : ''}
          </p>
        )}
        <h2 id="dish-title" className="dish-modal-title">
          {item.name}
        </h2>
        <div className="dish-modal-row">
          {price && <p className="dish-modal-price">{price}</p>}
          <AvailabilityBadge availability={item.availability} />
        </div>
        <DishTags item={item} />
        {item.description && <p className="dish-modal-desc">{item.description}</p>}
        {facts.length > 0 && (
          <dl className="dish-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="dish-modal-note">
          <Icon name="leaf" size={16} /> Allergies or dietary needs? Tell us when you book and the
          kitchen will plan around them.
        </p>
      </div>
    </Modal>
  );
}
