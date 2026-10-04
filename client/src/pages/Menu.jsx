import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMenu, useSite } from '../context/SiteData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Button } from '../components/Button';
import { DishModal, DishRow } from '../components/Dish';
import { Icon } from '../components/Icon';
import { PageIntro } from '../components/PageHero';
import { EmptyState, ErrorState, Loading } from '../components/StateBlock';

/** One shared empty list, so memoised values do not change identity every render. */
const NONE = [];

const FILTERS = [
  { id: 'vegetarian', label: 'Vegetarian', icon: 'leaf', test: (i) => i.vegetarian || i.vegan },
  { id: 'vegan', label: 'Vegan', icon: 'sprout', test: (i) => i.vegan },
  { id: 'spicy', label: 'Spicy', icon: 'chili', test: (i) => i.spicy > 0 },
  {
    id: 'available',
    label: 'Available now',
    icon: 'check',
    test: (i) => i.availability === 'available',
  },
];

/** Name, description, subsection, ingredients and labels — what a guest might type. */
const haystack = (item) =>
  [
    item.name,
    item.description,
    item.subcategory,
    ...(item.ingredients ?? []),
    ...(item.dietary ?? []),
  ]
    .join(' ')
    .toLowerCase();

/**
 * Tracks which category section is under the sticky bar, so the nav can
 * highlight it. A band across the top fifth of the viewport decides; the
 * last section to enter it wins.
 */
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0] ?? null);
  const key = ids.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || ids.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
        if (hit.length) setActive(hit[hit.length - 1]);
      },
      { rootMargin: '-20% 0px -75% 0px' }
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
    // `key` stands in for the array, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Before anything has scrolled into the band, the first section is current.
  return [ids.includes(active) ? active : (ids[0] ?? null), setActive];
}

export default function Menu() {
  useDocumentTitle(
    'Menu — Sri Lankan, BBQ, Italian, Indian & Continental',
    'Nine kitchens: Sri Lankan rice and curry, slow-smoked BBQ, Italian, Indian tandoori, Chinese and continental grills, plus vegetarian and vegan throughout.',
    { brandSuffix: false }
  );
  const { settings } = useSite();
  const menu = useMenu();
  const reduced = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(() => new Set());
  const deferredQuery = useDeferredValue(query);
  const navRef = useRef(null);

  const categories = menu.data?.categories ?? NONE;
  const items = menu.data?.items ?? NONE;
  const currency = menu.data?.currency ?? settings.restaurant.currency;

  const needle = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    const active = FILTERS.filter((f) => filters.has(f.id));
    return items.filter(
      (item) => active.every((f) => f.test(item)) && (!needle || haystack(item).includes(needle))
    );
  }, [items, filters, needle]);

  const sections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: filtered.filter((item) => item.categoryId === category.id),
        }))
        .filter((section) => section.items.length > 0),
    [categories, filtered]
  );

  const [active, setActive] = useScrollSpy(sections.map((s) => s.category.slug));

  // Keep the highlighted chip in view inside the horizontally scrolling bar.
  useEffect(() => {
    const chip = navRef.current?.querySelector(`[data-slug="${active}"]`);
    chip?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [active, reduced]);

  const openSlug = params.get('dish');
  const openItem = openSlug ? (items.find((item) => item.slug === openSlug) ?? null) : null;

  const openDish = useCallback(
    (item) => {
      const next = new URLSearchParams(params);
      next.set('dish', item.slug);
      setParams(next, { preventScrollReset: true });
    },
    [params, setParams]
  );
  const closeDish = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('dish');
    setParams(next, { preventScrollReset: true, replace: true });
  }, [params, setParams]);

  const toggleFilter = (id) =>
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clear = () => {
    setQuery('');
    setFilters(new Set());
  };

  const jumpTo = (slug) => {
    setActive(slug);
    document
      .getElementById(slug)
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const narrowed = needle || filters.size > 0;
  const categoryName = (id) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="menu-page">
      <PageIntro eyebrow="The menu" title="Nine kitchens, one table." intro={settings.menu.intro} />

      <div className="menu-toolbar wrap" role="search">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Search the menu</span>
          <input
            type="search"
            placeholder="Search dishes, ingredients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-chips" role="group" aria-label="Filter dishes">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`chip ${filters.has(filter.id) ? 'is-on' : ''}`}
              aria-pressed={filters.has(filter.id)}
              onClick={() => toggleFilter(filter.id)}
            >
              <Icon name={filter.icon} size={16} />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {menu.status === 'error' && !menu.data ? (
        <div className="wrap">
          <ErrorState
            title="The menu did not load."
            message={menu.error?.message}
            onRetry={menu.retry}
          />
        </div>
      ) : !menu.data ? (
        <div className="wrap">
          <Loading label="Loading the menu" rows={6} />
        </div>
      ) : (
        <div className="menu-layout wrap">
          {sections.length > 0 && (
            <nav className="menu-nav" aria-label="Menu sections" ref={navRef}>
              <ul>
                {sections.map(({ category, items: list }) => (
                  <li key={category.id}>
                    <a
                      href={`#${category.slug}`}
                      data-slug={category.slug}
                      className={`menu-nav-link ${active === category.slug ? 'is-active' : ''}`}
                      aria-current={active === category.slug ? 'location' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        jumpTo(category.slug);
                      }}
                    >
                      {category.name}
                      <span className="menu-nav-count">{list.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="menu-sections" key={`${needle}|${[...filters].join(',')}`}>
            {narrowed && (
              <p className="menu-result" role="status">
                {filtered.length === 0
                  ? 'No dishes match.'
                  : `${filtered.length} ${filtered.length === 1 ? 'dish matches' : 'dishes match'}.`}{' '}
                <button type="button" className="text-link" onClick={clear}>
                  Clear search and filters
                </button>
              </p>
            )}

            {sections.length === 0 &&
              (narrowed ? (
                <EmptyState title="Nothing on the menu matches that." icon="search">
                  <p>Try another word, or clear the filters.</p>
                </EmptyState>
              ) : (
                <EmptyState title="The menu is being updated.">
                  <p>Please check back shortly, or ask us what the kitchen is cooking today.</p>
                </EmptyState>
              ))}

            {sections.map(({ category, items: list }) => (
              <section
                className="menu-section"
                id={category.slug}
                key={category.id}
                aria-labelledby={`${category.slug}-title`}
              >
                <header className="menu-section-head">
                  <h2 className="menu-section-title" id={`${category.slug}-title`}>
                    {category.name}
                  </h2>
                  {category.description && <p>{category.description}</p>}
                </header>
                <ul className="dish-list">
                  {list.map((item, index) => {
                    // A subsection heading ("From the grill") wherever the subsection changes.
                    const sub =
                      item.subcategory && item.subcategory !== list[index - 1]?.subcategory;
                    return [
                      sub && (
                        <li key={`${item.id}-sub`} className="dish-sub" role="presentation">
                          <h3>{item.subcategory}</h3>
                        </li>
                      ),
                      <DishRow key={item.id} item={item} currency={currency} onOpen={openDish} />,
                    ];
                  })}
                </ul>
              </section>
            ))}

            {settings.menu.note && (
              <aside className="menu-note">
                <Icon name="leaf" size={20} />
                <p>{settings.menu.note}</p>
                <Button to="/reservations" variant="outline" size="sm" arrow>
                  Reserve a table
                </Button>
              </aside>
            )}
          </div>
        </div>
      )}

      <DishModal
        item={openItem}
        currency={currency}
        categoryName={openItem ? categoryName(openItem.categoryId) : null}
        onClose={closeDish}
      />
    </div>
  );
}
