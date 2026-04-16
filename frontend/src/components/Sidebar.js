import React from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS = { admin: '#dc2626', base_commander: '#2563eb', logistics_officer: '#059669' };
const ROLE_LABELS = { admin: 'ADMIN', base_commander: 'BASE CMD', logistics_officer: 'LOGISTICS' };

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈' },
  { key: 'purchases', label: 'Purchases', icon: '◎' },
  { key: 'transfers', label: 'Transfers', icon: '⇄' },
  { key: 'assignments', label: 'Assignments', icon: '◆' },
  { key: 'audit', label: 'Audit Logs', icon: '≡', adminOnly: true },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout, canAccess } = useAuth();
  const roleColor = ROLE_COLORS[user?.role] || '#94a3b8';

  return (
    <div style={{ width: 220, minHeight: '100vh', background: '#080c18', borderRight: '1px solid #1a2338', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1a2338' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, color: '#3b82f6' }}>⬡</span>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>KRISTALBALL</div>
            <div style={{ color: '#374151', fontSize: 9, letterSpacing: 2 }}>ASSET MGMT</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAV_ITEMS.map(item => {
          if (item.adminOnly && !canAccess('audit')) return null;
          if (!canAccess(item.key)) return null;
          const isActive = activePage === item.key;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 2, background: isActive ? '#0d1a35' : 'transparent', border: isActive ? '1px solid #1e3a6e' : '1px solid transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ color: isActive ? '#60a5fa' : '#374151', fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ color: isActive ? '#93c5fd' : '#475569', fontSize: 13, letterSpacing: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '16px 16px 20px', borderTop: '1px solid #1a2338' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 2 }}>{user?.full_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: roleColor + '20', color: roleColor, letterSpacing: 1 }}>{ROLE_LABELS[user?.role]}</span>
            {user?.base_name && <span style={{ color: '#374151', fontSize: 11 }}>{user.base_name}</span>}
          </div>
        </div>
        <button onClick={logout}
          style={{ width: '100%', background: 'transparent', border: '1px solid #1a2338', borderRadius: 6, padding: '8px', color: '#4a5568', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
