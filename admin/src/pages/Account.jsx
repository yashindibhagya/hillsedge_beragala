import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui';
import { ROLES, labelOf } from '../lib/format';

export default function Account() {
  const { user, permissions, logout } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ current: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    if (values.password !== values.confirm) {
      setErrors({ confirm: 'The two new passwords do not match.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api.post('/auth/password', { current: values.current, password: values.password });
      toast.success('Password changed. Other devices have been signed out.');
      setValues({ current: '', password: '', confirm: '' });
    } catch (error) {
      setErrors(error.errors ?? { password: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        eyebrow="Account"
        title={user?.name}
        description={`${user?.email} · ${labelOf(ROLES, user?.role)}`}
        actions={
          <Button variant="secondary" icon="logout" onClick={logout}>
            Sign out
          </Button>
        }
      />
      <Card title="Change your password">
        <form className="stack card-pad" onSubmit={save} noValidate>
          <Field label="Current password" error={errors.current}>
            <TextInput
              type="password"
              autoComplete="current-password"
              value={values.current}
              onChange={set('current')}
            />
          </Field>
          <Field label="New password" error={errors.password} hint="At least 10 characters.">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={set('password')}
            />
          </Field>
          <Field label="New password again" error={errors.confirm}>
            <TextInput
              type="password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={set('confirm')}
            />
          </Field>
          <div className="form-actions">
            <Button type="submit" busy={busy}>
              Change password
            </Button>
          </div>
        </form>
      </Card>
      <Card title="What your role can do">
        <ul className="permission-list card-pad">
          {permissions.map((p) => (
            <li key={p}>
              <code>{p}</code>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
