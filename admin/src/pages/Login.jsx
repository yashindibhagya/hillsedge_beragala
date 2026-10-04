import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Field, Notice, TextInput } from '../components/ui';

/** The sign-in screen, and the frame the password pages share. */
export function AuthFrame({ title, intro, children }) {
  return (
    <div className="auth">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-inner">
          <span className="auth-mark">H</span>
          <p className="auth-art-line">Hillsedge Beragala</p>
          <p className="auth-art-sub">Mountain smokehouse · Sri Lanka hill country</p>
        </div>
      </div>
      <main className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Hillsedge Admin</p>
          <h1 className="auth-title">{title}</h1>
          {intro && <p className="auth-intro">{intro}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  const { user, login, expired, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname ?? '/';
  if (status === 'ready' && user) return <Navigate to={from} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Sign in" intro="Manage the menu, bookings, rooms and website.">
      {expired && <Notice tone="warn">Your session ended. Please sign in again.</Notice>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="btn-block">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="auth-link">
          <Link to="/forgot">Forgotten your password?</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
