import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { MediaField, MediaThumb } from '../components/MediaPicker';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Icon,
  IconButton,
  MoveButtons,
  PageHeader,
  Segmented,
  Select,
  Skeleton,
  Switch,
  TagsInput,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { useResource } from '../hooks/useResource';
import { AVAILABILITY, editable, formatPrice } from '../lib/format';

const COMMON_ALLERGENS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Fish',
  'Soy',
  'Sesame',
  'Mustard',
  'Celery',
  'Sulphites',
];
const COMMON_DIETARY = [
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Contains alcohol',
  'Can be made vegan',
  'Nut-free',
];
const SPICE = [
  { value: '0', label: 'Not spicy' },
  { value: '1', label: 'Mild' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hot' },
];

const blank = (categoryId) => ({
  name: '',
  description: '',
  price: '',
  categoryId: categoryId ?? '',
  subcategory: '',
  imageId: null,
  videoId: null,
  ingredients: [],
  dietary: [],
  allergens: [],
  vegetarian: false,
  vegan: false,
  spicy: 0,
  featured: false,
  bestseller: false,
  special: false,
  availability: 'available',
  hidden: false,
});

/** The full dish editor, in a drawer. Every field the server's menuItemSchema knows. */
function MenuItemForm({ item, categories, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, setValues, errors, saving, formError, submit } = useForm(
    item ? { ...blank(), ...item, price: item.price ?? '' } : blank(categories[0]?.id)
  );

  const save = async (event) => {
    event?.preventDefault();
    const body = editable(values);
    body.price = body.price === '' ? null : body.price;
    body.spicy = Number(body.spicy);
    try {
      const result = await submit(() =>
        item ? api.patch(`/admin/menu-items/${item.id}`, body) : api.post('/admin/menu-items', body)
      );
      toast.success(item ? `Saved “${result.item.name}”.` : `Added “${result.item.name}”.`);
      onSaved(result.item, !item);
    } catch {
      // Field errors are shown in place.
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      size="l"
      onClose={onClose}
      busy={saving}
      title={item ? `Edit ${item.name}` : 'Add a dish'}
      footer={
        <>
          {formError && (
            <p className="form-error modal-foot-note" role="alert">
              {formError}
            </p>
          )}
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} busy={saving}>
            {item ? 'Save changes' : 'Add dish'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={save} noValidate>
        <Field label="Name" error={errors.name} className="span-2">
          <TextInput value={values.name} onChange={set('name')} data-autofocus maxLength={120} />
        </Field>
        <Field
          label="Description"
          error={errors.description}
          className="span-2"
          hint="One or two sentences. What it is, not how good it is."
        >
          <TextArea
            value={values.description}
            onChange={set('description')}
            rows={3}
            maxLength={1000}
          />
        </Field>
        <Field
          label="Price"
          error={errors.price}
          optional
          hint="Leave blank to show no price rather than a wrong one."
        >
          <TextInput
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.price}
            onChange={set('price')}
          />
        </Field>
        <Field label="Category" error={errors.categoryId}>
          <Select
            value={values.categoryId}
            onChange={set('categoryId')}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field
          label="Subcategory"
          error={errors.subcategory}
          optional
          hint="Groups dishes within the category, e.g. “From the grill”."
        >
          <TextInput value={values.subcategory} onChange={set('subcategory')} maxLength={80} />
        </Field>
        <Field label="Spice level" error={errors.spicy}>
          <Select value={String(values.spicy)} onChange={set('spicy')} options={SPICE} />
        </Field>

        <div className="span-2">
          <Segmented
            legend="Availability"
            hideLegend={false}
            options={AVAILABILITY}
            value={values.availability}
            onChange={set('availability')}
          />
        </div>

        <fieldset className="span-2 checks">
          <legend className="field-label">Labels</legend>
          <Switch
            label="Vegetarian"
            checked={values.vegetarian}
            onChange={(v) =>
              setValues((p) => ({ ...p, vegetarian: v, vegan: v ? p.vegan : false }))
            }
          />
          <Switch
            label="Vegan"
            checked={values.vegan}
            onChange={(v) =>
              setValues((p) => ({ ...p, vegan: v, vegetarian: v ? true : p.vegetarian }))
            }
          />
          <Switch
            label="Featured on the homepage"
            checked={values.featured}
            onChange={set('featured')}
          />
          <Switch label="Bestseller" checked={values.bestseller} onChange={set('bestseller')} />
          <Switch label="Chef’s special" checked={values.special} onChange={set('special')} />
          <Switch
            label="Hidden from the website"
            checked={values.hidden}
            onChange={set('hidden')}
            description="Hidden dishes stay here but never appear on the site."
          />
          {errors.vegetarian && <p className="field-error">{errors.vegetarian}</p>}
        </fieldset>

        <Field label="Ingredients" error={errors.ingredients} optional className="span-2">
          <TagsInput value={values.ingredients} onChange={set('ingredients')} />
        </Field>
        <Field label="Allergens" error={errors.allergens} optional>
          <TagsInput
            value={values.allergens}
            onChange={set('allergens')}
            suggestions={COMMON_ALLERGENS}
          />
        </Field>
        <Field label="Other dietary notes" error={errors.dietary} optional>
          <TagsInput
            value={values.dietary}
            onChange={set('dietary')}
            suggestions={COMMON_DIETARY}
          />
        </Field>

        <Field label="Photo" error={errors.imageId} optional>
          <MediaField value={values.imageId} onChange={set('imageId')} kind="image" />
        </Field>
        <Field label="Video" error={errors.videoId} optional hint="A few seconds, muted. Optional.">
          <MediaField value={values.videoId} onChange={set('videoId')} kind="video" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/**
 * Dishes, grouped by category. The availability switch is the thing used
 * most — on a phone, mid-service — so it sits on every row and saves the
 * moment it is pressed, rolling back if the server refuses.
 */
export default function MenuItems() {
  const { can } = useAuth();
  const toast = useToast();
  const { byId } = useMediaLibrary();
  const [params, setParams] = useSearchParams();
  const items = useResource('/admin/menu-items');
  const categories = useResource('/admin/categories');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [flag, setFlag] = useState(params.get('filter') ?? '');
  const [editing, setEditing] = useState(null); // item | 'new' | null
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const canEdit = can('menu:write');

  useEffect(() => {
    if (params.get('new') && canEdit) {
      setEditing('new');
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, canEdit]);

  const filtering = Boolean(query || categoryFilter || availabilityFilter || flag);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (item) =>
      (!needle ||
        `${item.name} ${item.description} ${item.subcategory}`.toLowerCase().includes(needle)) &&
      (!categoryFilter || item.categoryId === categoryFilter) &&
      (!availabilityFilter || item.availability === availabilityFilter) &&
      (!flag ||
        (flag === 'featured' && item.featured) ||
        (flag === 'hidden' && item.hidden) ||
        (flag === 'noprice' && item.price === null) ||
        (flag === 'vegetarian' && item.vegetarian) ||
        (flag === 'special' && (item.special || item.bestseller)));
    const sorted = [...categories.items].sort((a, b) => a.order - b.order);
    const known = new Set(sorted.map((c) => c.id));
    const result = sorted.map((category) => ({
      category,
      items: items.items
        .filter((i) => i.categoryId === category.id && match(i))
        .sort((a, b) => a.order - b.order),
    }));
    const orphans = items.items.filter((i) => !known.has(i.categoryId) && match(i));
    if (orphans.length)
      result.push({ category: { id: 'none', name: 'No category' }, items: orphans });
    return result.filter((g) => g.items.length || !filtering);
  }, [items.items, categories.items, query, categoryFilter, availabilityFilter, flag, filtering]);

  const replaceItem = (next) =>
    items.setItems((list) => list.map((i) => (i.id === next.id ? { ...i, ...next } : i)));

  /** Optimistic: flip it now, put it back if the server says no. */
  const quickUpdate = async (item, change, message) => {
    replaceItem({ ...item, ...change });
    try {
      const { item: saved } = await api.patch(`/admin/menu-items/${item.id}/availability`, change);
      replaceItem(saved);
      toast.success(message(saved));
    } catch (error) {
      replaceItem(item);
      toast.error(error.message);
    }
  };

  const duplicate = async (item) => {
    try {
      const { item: copy } = await api.post(`/admin/menu-items/${item.id}/duplicate`);
      items.setItems((list) => [...list, copy]);
      toast.success(`Copied — the copy is hidden until you edit it.`);
      setEditing(copy);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/menu-items/${deleting.id}`);
      items.setItems((list) => list.filter((i) => i.id !== deleting.id));
      toast.success(`Deleted “${deleting.name}”.`);
      setDeleting(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (group, item, direction) => {
    const list = group.items;
    const index = list.findIndex((i) => i.id === item.id);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const ids = next.map((i) => i.id);
    items.setItems((all) =>
      all.map((i) => (ids.includes(i.id) ? { ...i, order: ids.indexOf(i.id) } : i))
    );
    try {
      await api.put('/admin/menu-items/reorder', { ids });
    } catch (error) {
      toast.error(error.message);
      items.reload();
    }
  };

  const loading = items.status === 'loading' || categories.status === 'loading';
  const failed =
    items.status === 'error' ? items : categories.status === 'error' ? categories : null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Menu"
        title="Dishes"
        description="Changes show on the website within half a minute."
        actions={
          canEdit && (
            <Button
              icon="plus"
              onClick={() => setEditing('new')}
              disabled={!categories.items.length}
            >
              Add dish
            </Button>
          )
        }
      />

      <div className="toolbar toolbar-sticky">
        <label className="toolbar-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search dishes</span>
          <TextInput
            type="search"
            placeholder="Search dishes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Category</span>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="All categories"
            options={categories.items.map((c) => ({ value: c.id, label: c.name }))}
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Availability</span>
          <Select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            placeholder="Any availability"
            options={AVAILABILITY}
          />
        </label>
        <label className="toolbar-field">
          <span className="sr-only">Show only</span>
          <Select
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            placeholder="All dishes"
            options={[
              { value: 'featured', label: 'Featured' },
              { value: 'special', label: 'Specials & bestsellers' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'hidden', label: 'Hidden' },
              { value: 'noprice', label: 'Without a price' },
            ]}
          />
        </label>
      </div>

      {loading && <Skeleton rows={6} label="Loading dishes…" />}
      {failed && <ErrorState error={failed.error} onRetry={failed.reload} />}

      {!loading && !failed && categories.items.length === 0 && (
        <Empty title="No categories yet" icon="categories">
          Dishes live in categories. Create one first, under Categories.
        </Empty>
      )}

      {!loading && !failed && filtering && groups.every((g) => g.items.length === 0) && (
        <Empty title="No dishes match" icon="search">
          Try a different search or clear the filters.
        </Empty>
      )}

      {!loading &&
        !failed &&
        groups.map((group) => (
          <section
            key={group.category.id}
            className="group"
            aria-labelledby={`cat-${group.category.id}`}
          >
            <h2 className="group-title" id={`cat-${group.category.id}`}>
              {group.category.name}
              <span className="group-count">{group.items.length}</span>
              {group.category.active === false && <Badge tone="neutral">Category hidden</Badge>}
            </h2>
            {group.items.length === 0 ? (
              <p className="muted group-empty">No dishes in this category.</p>
            ) : (
              <ul className="rows">
                {group.items.map((item, index) => (
                  <li key={item.id} className={`row dish-row ${item.hidden ? 'is-muted' : ''}`}>
                    <MediaThumb media={byId(item.imageId)} className="row-thumb" size={240} />
                    <div className="row-main">
                      <p className="row-title">
                        {canEdit ? (
                          <button
                            type="button"
                            className="row-title-btn"
                            onClick={() => setEditing(item)}
                          >
                            {item.name}
                          </button>
                        ) : (
                          item.name
                        )}
                      </p>
                      <p className="row-meta">
                        <span className={item.price === null ? 'muted' : 'row-price'}>
                          {formatPrice(item.price)}
                        </span>
                        {item.subcategory && <span className="muted"> · {item.subcategory}</span>}
                      </p>
                      <p className="row-badges">
                        {item.hidden && <Badge tone="neutral">Hidden</Badge>}
                        {item.featured && <Badge tone="gold">Featured</Badge>}
                        {item.bestseller && (
                          <Badge tone="gold" dot={false}>
                            Bestseller
                          </Badge>
                        )}
                        {item.special && (
                          <Badge tone="gold" dot={false}>
                            Special
                          </Badge>
                        )}
                        {item.vegan ? (
                          <Badge tone="ok" dot={false}>
                            Vegan
                          </Badge>
                        ) : (
                          item.vegetarian && (
                            <Badge tone="ok" dot={false}>
                              Vegetarian
                            </Badge>
                          )
                        )}
                        {item.spicy > 0 && (
                          <Badge tone="danger" dot={false}>
                            {'Spicy '.concat('●'.repeat(item.spicy))}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="row-controls">
                      {can('menu:availability') && (
                        <Segmented
                          legend={`Availability of ${item.name}`}
                          size="s"
                          options={AVAILABILITY}
                          value={item.availability}
                          onChange={(availability) =>
                            quickUpdate(
                              item,
                              { availability },
                              (saved) =>
                                `${saved.name}: ${AVAILABILITY.find((a) => a.value === saved.availability).label.toLowerCase()}.`
                            )
                          }
                        />
                      )}
                      <div className="row-actions">
                        {can('menu:availability') && (
                          <IconButton
                            icon={item.hidden ? 'eyeOff' : 'eye'}
                            label={
                              item.hidden
                                ? `Show ${item.name} on the website`
                                : `Hide ${item.name} from the website`
                            }
                            aria-pressed={item.hidden}
                            onClick={() =>
                              quickUpdate(
                                item,
                                { hidden: !item.hidden },
                                (saved) =>
                                  `${saved.name} is ${saved.hidden ? 'hidden' : 'visible'}.`
                              )
                            }
                          />
                        )}
                        {canEdit && (
                          <>
                            {!filtering && (
                              <MoveButtons
                                name={item.name}
                                onUp={() => move(group, item, -1)}
                                onDown={() => move(group, item, 1)}
                                disabledUp={index === 0}
                                disabledDown={index === group.items.length - 1}
                              />
                            )}
                            <IconButton
                              icon="edit"
                              label={`Edit ${item.name}`}
                              onClick={() => setEditing(item)}
                            />
                            <IconButton
                              icon="copy"
                              label={`Duplicate ${item.name}`}
                              onClick={() => duplicate(item)}
                            />
                            <IconButton
                              icon="trash"
                              label={`Delete ${item.name}`}
                              className="danger"
                              onClick={() => setDeleting(item)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

      {editing && (
        <MenuItemForm
          item={editing === 'new' ? null : editing}
          categories={categories.items}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            if (created) items.setItems((list) => [...list, saved]);
            else replaceItem(saved);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.name}”?`}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        <p>
          It disappears from the website and cannot be brought back. To take it off the menu for
          now, mark it unavailable or hide it instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
