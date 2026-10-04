import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Badge,
  Button,
  ErrorState,
  Field,
  IconButton,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  TextInput,
} from '../components/ui';
import { useForm } from '../hooks/useForm';
import { useResource } from '../hooks/useResource';
import { ROLES, labelOf, timeAgo } from '../lib/format';

function UserForm({ user, onClose, onSaved }) {
  const toast = useToast();
  const { values, set, errors, saving, formError, submit } = useForm({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'staff',
    active: user?.active ?? true,
    password: '',
  });

  const save = async (event) => {
    event?.preventDefault();
    const body = {
      name: values.name,
      email: values.email,
      role: values.role,
      active: values.active,
    };
    if (values.password) body.password = values.password;
    try {
      const { item } = await submit(() =>
        user ? api.patch(`/admin/users/${user.id}`, body) : api.post('/admin/users', body)
      );
      toast.success(user ? 'User saved.' : `${item.name} can now sign in.`);
      onSaved(item, !user);
    } catch {
      // shown in place
    }
  };

  const role = ROLES.find((r) => r.value === values.role);

  return (
    <Modal
      open
      onClose={onClose}
      busy={saving}
      title={user ? `Edit ${user.name}` : 'Add a user'}
      description={
        user
          ? null
          : 'Give them the email and password in person or by message — the panel does not send invitations.'
      }
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
            {user ? 'Save' : 'Add user'}
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={save} noValidate>
        <Field label="Name" error={errors.name}>
          <TextInput value={values.name} onChange={set('name')} data-autofocus autoComplete="off" />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput type="email" value={values.email} onChange={set('email')} autoComplete="off" />
        </Field>
        <Field label="Role" error={errors.role} hint={role?.hint}>
          <Select value={values.role} onChange={set('role')} options={ROLES} />
        </Field>
        <Field
          label={user ? 'Set a new password' : 'Password'}
          error={errors.password}
          optional={Boolean(user)}
          hint={
            user
              ? 'Leave blank to keep theirs. Setting one signs them out everywhere.'
              : 'At least 10 characters.'
          }
        >
          <TextInput
            type="password"
            value={values.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
        </Field>
        <Switch
          label="Active"
          checked={values.active}
          onChange={set('active')}
          description="Inactive users cannot sign in, and are signed out at once."
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { items, setItems, status, error, reload } = useResource('/admin/users');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/users/${deleting.id}`);
      setItems((list) => list.filter((u) => u.id !== deleting.id));
      toast.success(`${deleting.name} removed.`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title="Users & roles"
        description="Super admins manage everything. Managers run the menu, rooms, bookings and content. Staff handle bookings and availability."
        actions={
          <Button icon="plus" onClick={() => setEditing('new')}>
            Add user
          </Button>
        }
      />
      {status === 'loading' && <Skeleton rows={3} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {items.length > 0 && (
        <div className="table-scroll">
          <table className="table table-cards">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <th scope="row" data-label="Name">
                    <span className="cell-title">
                      {u.name}
                      {u.id === me?.id && <span className="muted"> (you)</span>}
                    </span>
                    <span className="cell-sub">{u.email}</span>
                  </th>
                  <td data-label="Role">{labelOf(ROLES, u.role)}</td>
                  <td data-label="Status">
                    {u.active ? (
                      <Badge tone="ok">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </td>
                  <td data-label="Last sign-in">
                    {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}
                  </td>
                  <td className="cell-actions">
                    <IconButton
                      icon="edit"
                      label={`Edit ${u.name}`}
                      onClick={() => setEditing(u)}
                    />
                    {u.id !== me?.id && (
                      <IconButton
                        icon="trash"
                        label={`Remove ${u.name}`}
                        className="danger"
                        onClick={() => setDeleting(u)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(item, created) => {
            setItems((list) =>
              created ? [...list, item] : list.map((u) => (u.id === item.id ? item : u))
            );
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Remove ${deleting?.name}?`}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        confirmLabel="Remove"
      >
        <p>
          They are signed out and can no longer sign in. Their past changes stay in the activity
          log. To pause access instead, make them inactive.
        </p>
      </ConfirmDialog>
    </div>
  );
}
