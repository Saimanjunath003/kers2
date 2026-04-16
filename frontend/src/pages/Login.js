import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'Admin', color: '#dc2626' },
  { username: 'cmd_alpha', password: 'commander123', role: 'Base Commander', color: '#1d4ed8' },
  { username: 'log_officer1', password: 'logistics123', role: 'Logistics Officer', color: '#059669' },
];

export default function Login({ onLogin }) {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.username, form.password);
    if (result.success) onLogin();
    else setError(result.error);
  };

  const fillDemo = (acc) => setForm({ username: acc.username, password: acc.password });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Courier New', monospace" }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⬡</div>
          <h1 style={{ color: '#f0f4ff', fontSize: 22, fontWeight: 700, letterSpacing: 4, margin: 0 }}>KRISTALBALL</h1>
          <p style={{ color: '#4a5568', fontSize: 11, letterSpacing: 3, marginTop: 6 }}>MILITARY ASSET MANAGEMENT</p>
        </div>

        <div style={{ background: '#0d1225', border: '1px solid #1e2a4a', borderRadius: 12, padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>USERNAME</label>
              <input
                type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
                style={{ width: '100%', background: '#060a14', border: '1px solid #1e2a4a', borderRadius: 6, padding: '12px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>PASSWORD</label>
              <input
                type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                style={{ width: '100%', background: '#060a14', border: '1px solid #1e2a4a', borderRadius: 6, padding: '12px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? '#1e2a4a' : '#1d3a7a', border: 'none', borderRadius: 6, padding: '13px', color: '#93c5fd', fontSize: 13, letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
            </button>
          </form>

          <div style={{ marginTop: 28, borderTop: '1px solid #1e2a4a', paddingTop: 24 }}>
            <p style={{ color: '#374151', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>DEMO ACCOUNTS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.username} onClick={() => fillDemo(acc)}
                  style={{ background: 'transparent', border: '1px solid #1e2a4a', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e2e8f0', fontSize: 13 }}>{acc.username}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: acc.color + '22', color: acc.color }}>{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
