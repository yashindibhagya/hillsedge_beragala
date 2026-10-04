import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Field, Notice, TextInput } from '../components/ui';
import { AuthFrame } from './Login';

export function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post('/auth/forgot', { email: email.trim() });
      setSent(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Reset your password" intro="We will email a link that works for one hour.">
      {sent ? (
        <div className="stack">
          <Notice tone="ok">{sent}</Notice>
          <p className="muted">
            No email? A super admin can also set a new password for you from Users &amp; roles.
          </p>
          <Link to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="Email">
            <TextInput
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" busy={busy} className="btn-block">
            Send reset link
          </Button>
          <p className="auth-link">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthFrame>
  );
}

export function Reset() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.post('/auth/reset', { token, password });
      setDone(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthFrame title="Reset link missing">
        <p>Open the link from the email again, or ask for a new one.</p>
        <Link to="/forgot">Ask for a new link</Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Choose a new password"
      intro="At least 10 characters. A short sentence is easier to remember than symbols."
    >
      {done ? (
        <div className="stack">
          <Notice tone="ok">{done}</Notice>
          <Link to="/login" className="btn btn-primary btn-block">
            Sign in
          </Link>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="New password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Type it again">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" busy={busy} className="btn-block">
            Save password
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
