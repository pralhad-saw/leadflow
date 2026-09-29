import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * Day 2 placeholder. Its real job right now is to PROVE tenant isolation:
 * log in as Berlin vs Munich and the user list changes, even though both call
 * the exact same endpoint with no brokerageId anywhere in the request.
 */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [brokerage, setBrokerage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data.users)).catch((e) => setError(errMsg(e)));
    if (user.role !== 'platform_admin') {
      api.get('/brokerages/me').then(({ data }) => setBrokerage(data.brokerage)).catch(() => {});
    }
  }, [user.role]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong className="brand small-brand">LeadFlow</strong>
          <span className="muted" style={{ marginLeft: 10 }}>
            {brokerage ? brokerage.name : 'Platform'}
          </span>
        </div>
        <div className="row">
          <span className="badge">{user.role}</span>
          <span className="muted small">{user.email}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="content">
        <h2>Welcome, {user.name}</h2>
        <p className="muted">
          Tenant id: <code>{user.brokerageId || 'none (platform admin)'}</code>
        </p>

        {error && <div className="alert">{error}</div>}

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Users visible to you ({users.length})</h3>
          <p className="muted small">
            Scoped server-side from the session -- the request sends no brokerage id.
          </p>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>{u.isActive ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
