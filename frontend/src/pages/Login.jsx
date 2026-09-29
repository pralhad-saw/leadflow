import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Quick-fill buttons so the reviewer can switch roles/tenants in one click.
const DEMO = [
  { label: 'Platform admin', email: 'platform@leadflow.test' },
  { label: 'Berlin admin', email: 'admin@berlin.test' },
  { label: 'Berlin advisor', email: 'advisor1@berlin.test' },
  { label: 'Berlin client', email: 'client@berlin.test' },
  { label: 'Munich admin', email: 'admin@munich.test' },
  { label: 'Munich advisor', email: 'advisor1@munich.test' },
];
const DEMO_PASSWORD = 'Passw0rd!123';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  return (
    <div className="center">
      <div className="card" style={{ width: 380 }}>
        <h1 className="brand">LeadFlow</h1>
        <p className="muted" style={{ marginTop: -8 }}>Sign in to your brokerage workspace</p>

        <form onSubmit={submit}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="alert">{error}</div>}

          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="divider" />
        <p className="muted small">Demo accounts (password: {DEMO_PASSWORD})</p>
        <div className="chips">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              className="chip"
              onClick={() => {
                setEmail(d.email);
                setPassword(DEMO_PASSWORD);
                setError('');
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
