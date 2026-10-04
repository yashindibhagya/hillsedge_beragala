import { useState } from 'react';
import { api } from '../api';
import { MediaField, MediaThumb } from '../components/MediaPicker';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  IconButton,
  MoveButtons,
  PageHeader,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { useResource } from '../hooks/useResource';
import { moveAndSave } from '../lib/reorder';

function CategoryForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm({
    name: category?.name ?? '',
    description: category?.description ?? '',
    imageId: category?.imageId ?? null,
    active: category?.active ?? true,
  });

  const save = async (event) => {
    event?.preventDefault();
    try {
      const { item } = await submit(() =>
        category
          ? api.patch(`/admin/categories/${category.id}`, values)
          : api.post('/admin/categories', values)
      );
      toast.success(category ? 'Category saved.' : `Added “${item.name}”.`);
      onSaved(item, !category);
    } catch {
      // shown in place
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={saving}
      title={category ? `Edit ${category.name}` : 'New category'}
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
            {category ? 'Save' : 'Create category'}
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={save} noValidate>
        <Field label="Name" error={errors.name}>
          <TextInput value={values.name} onChange={set('name')} maxLength={80} data-autofocus />
        </Field>
        <Field
          label="Description"
          error={errors.description}
          optional
          hint="Shown under the category heading on the menu page."
        >
          <TextArea
            value={values.description}
            onChange={set('description')}
            rows={3}
            maxLength={600}
          />
        </Field>
        <Field label="Image" error={errors.imageId} optional>
          <MediaField value={values.imageId} onChange={set('imageId')} />
        </Field>
        <Switch
          label="Shown on the website"
          checked={values.active}
          onChange={set('active')}
          description="Inactive categories hide all of their dishes from the site."
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Categories() {
  const toast = useToast();
  const { byId } = useMediaLibrary();
  const { items, setItems, status, error, reload } = useResource('/admin/categories');
  const dishes = useResource('/admin/menu-items');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...items].sort((a, b) => a.order - b.order);
  const countFor = (id) => dishes.items.filter((d) => d.categoryId === id).length;

  const move = async (id, direction) => {
    try {
      const next = await moveAndSave('/admin/categories', sorted, id, direction);
      if (next) setItems(next);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggle = async (category) => {
    setItems((list) => list.map((c) => (c.id === category.id ? { ...c, active: !c.active } : c)));
    try {
      await api.patch(`/admin/categories/${category.id}`, { active: !category.active });
      toast.success(`${category.name} is ${category.active ? 'hidden' : 'shown'}.`);
    } catch (err) {
      setItems((list) => list.map((c) => (c.id === category.id ? category : c)));
      toast.error(err.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/categories/${deleting.id}`);
      setItems((list) => list.filter((c) => c.id !== deleting.id));
      toast.success(`Deleted “${deleting.name}”.`);
      setDeleting(null);
    } catch (err) {
      // 409 when dishes remain: the server's message says what to do.
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Menu"
        title="Categories"
        description="The sections of the menu, in the order guests see them."
        actions={
          <Button icon="plus" onClick={() => setEditing('new')}>
            New category
          </Button>
        }
      />
      {status === 'loading' && <Skeleton rows={5} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'ready' && sorted.length === 0 && (
        <Empty
          title="No categories yet"
          icon="categories"
          action={<Button onClick={() => setEditing('new')}>Create the first</Button>}
        >
          Starters, mains, desserts, drinks — however the menu is divided.
        </Empty>
      )}
      {sorted.length > 0 && (
        <ul className="rows">
          {sorted.map((category, index) => {
            const count = countFor(category.id);
            return (
              <li key={category.id} className={`row ${category.active ? '' : 'is-muted'}`}>
                <MediaThumb media={byId(category.imageId)} className="row-thumb" size={240} />
                <div className="row-main">
                  <p className="row-title">
                    <button
                      type="button"
                      className="row-title-btn"
                      onClick={() => setEditing(category)}
                    >
                      {category.name}
                    </button>
                  </p>
                  <p className="row-meta muted">
                    {count} {count === 1 ? 'dish' : 'dishes'} · position {index + 1}
                  </p>
                  {!category.active && (
                    <p className="row-badges">
                      <Badge tone="neutral">Hidden</Badge>
                    </p>
                  )}
                </div>
                <div className="row-controls">
                  <Switch
                    compact
                    label={category.active ? 'Shown' : 'Hidden'}
                    checked={category.active}
                    onChange={() => toggle(category)}
                  />
                  <div className="row-actions">
                    <MoveButtons
                      name={category.name}
                      onUp={() => move(category.id, -1)}
                      onDown={() => move(category.id, 1)}
                      disabledUp={index === 0}
                      disabledDown={index === sorted.length - 1}
                    />
                    <IconButton
                      icon="edit"
                      label={`Edit ${category.name}`}
                      onClick={() => setEditing(category)}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${category.name}`}
                      className="danger"
                      onClick={() => setDeleting({ ...category, count })}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <CategoryForm
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(item, created) => {
            setItems((list) =>
              created ? [...list, item] : list.map((c) => (c.id === item.id ? item : c))
            );
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
        confirmLabel={deleting?.count ? 'Try anyway' : 'Delete'}
      >
        {deleting?.count ? (
          <p>
            It still has {deleting.count} {deleting.count === 1 ? 'dish' : 'dishes'}. Move or delete
            them first — a category with dishes in it cannot be deleted. To take it off the website
            for now, switch it to hidden.
          </p>
        ) : (
          <p>This cannot be undone.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
