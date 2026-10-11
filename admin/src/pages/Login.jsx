import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Field, Notice, TextInput } from '../components/ui';

/** The hour in Beragala, whatever the clock on this device says. */
function useBeragalaTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const hour = Number(time.slice(0, 2));
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return { time, greeting };
}

/** Layered ridgelines of the hill country, with smoke rising from the valley. */
function Ridges() {
  return (
    <svg className="auth-ridges" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path className="ridge ridge-4" d="M0 250 C120 200 210 230 300 190 S480 120 590 170 S760 240 860 180 S1040 90 1150 140 S1330 210 1440 160 V560 H0Z" />
      <path className="ridge ridge-3" d="M0 320 C90 290 200 300 290 260 S470 230 560 270 S720 330 840 280 S1010 210 1120 250 S1310 320 1440 270 V560 H0Z" />
      <path className="ridge ridge-2" d="M0 390 C110 360 230 380 330 340 S520 320 620 360 S800 410 920 370 S1120 320 1230 350 S1380 390 1440 370 V560 H0Z" />
      <path className="ridge ridge-1" d="M0 460 C140 430 260 450 380 420 S600 400 720 440 S940 480 1060 450 S1300 420 1440 440 V560 H0Z" />
    </svg>
  );
}

/** The sign-in screen, and the frame the password pages share. */
export function AuthFrame({ title, intro, children }) {
  const { time, greeting } = useBeragalaTime();
  return (
    <div className="auth">
      <div className="auth-scene" aria-hidden="true">
        <div className="auth-glow" />
        <Ridges />
        <span className="auth-smoke auth-smoke-1" />
        <span className="auth-smoke auth-smoke-2" />
        <span className="auth-smoke auth-smoke-3" />
        <div className="auth-mist" />
      </div>

      <header className="auth-brand">
        <span className="auth-mark">H</span>
        <div>
          <p className="auth-art-line">Hillsedge Beragala</p>
          <p className="auth-art-sub">Mountain smokehouse · Sri Lanka hill country</p>
        </div>
      </header>

      <main className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Hillsedge Admin</p>
          <h1 className="auth-title">{title}</h1>
          {intro && <p className="auth-intro">{intro}</p>}
          {children}
        </div>
      </main>

      <footer className="auth-foot">
        <span className="auth-dot" aria-hidden="true" />
        <span>
          {greeting} from Beragala · <time>{time}</time>
        </span>
      </footer>
    </div>
  );
}

/** A password box with a show / hide switch; Field's id lands on the input. */
function PasswordInput({ id, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-reveal">
      <TextInput {...props} id={id} type={shown ? 'text' : 'password'} />
      <button
        type="button"
        className="input-reveal-btn"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        aria-controls={id}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
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
          <PasswordInput
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
