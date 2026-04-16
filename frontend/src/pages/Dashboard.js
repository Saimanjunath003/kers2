import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import AIAnalyst from '../components/AIAnalyst';

function MetricCard({ label, value, color, sub, onClick }) {
  const c = color || '#60a5fa';
  return (
    <div onClick={onClick} style={{ background: '#0d1225', border: `1px solid ${onClick ? c + '55' : '#1a2338'}`, borderRadius: 10, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
      {onClick && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c }}></div>}
      <div style={{ color: '#4a5568', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>{label}</div>
      <div style={{ color: c, fontSize: 26, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>{value?.toLocaleString() ?? '—'}</div>
      {sub && <div style={{ color: '#374151', fontSize: 10, marginTop: 6, letterSpacing: 1 }}>{sub}</div>}
      {onClick && <div style={{ color: c + 'aa', fontSize: 10, marginTop: 8, letterSpacing: 1 }}>VIEW BREAKDOWN →</div>}
    </div>
  );
}

function NetMovementModal({ onClose, filters }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('purchases');
  useEffect(() => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).toString();
    api.get(`/dashboard/net-movement-detail?${params}`).then(r => setData(r.data)).catch(console.error);
  }, [filters]);
  const tabs = [{ key: 'purchases', label: 'Purchases', color: '#22c55e' }, { key: 'transfer_in', label: 'Transfer In', color: '#3b82f6' }, { key: 'transfer_out', label: 'Transfer Out', color: '#f59e0b' }];
  const rows = data?.[tab] || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0e1a', border: '1px solid #1e2a4a', borderRadius: 14, width: '92%', maxWidth: 740, maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Courier New', monospace" }}>
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #1a2338', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#060a14' }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 15, letterSpacing: 3, margin: 0 }}>NET MOVEMENT DETAIL</h2>
          <button onClick={onClose} style={{ background: '#1a2338', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', borderRadius: 6, width: 32, height: 32 }}>✕</button>
        </div>
        <div style={{ display: 'flex', padding: '0 26px', borderBottom: '1px solid #1a2338', background: '#060a14' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent', padding: '12px 16px', color: tab === t.key ? t.color : '#4a5568', fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>
              {t.label} ({data?.[t.key]?.length ?? '…'})
            </button>
          ))}
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '16px 26px' }}>
          {!data ? <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>LOADING...</div>
            : rows.length === 0 ? <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>No records in this period</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Equipment', tab === 'purchases' ? 'Base' : 'Route', 'Qty', 'Date'].map(h => <th key={h} style={{ textAlign: h === 'Qty' || h === 'Date' ? 'right' : 'left', padding: '8px 0', borderBottom: '1px solid #1a2338', color: '#374151', letterSpacing: 1 }}>{h}</th>)}</tr></thead>
                <tbody>{rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #0d1225' }}>
                    <td style={{ padding: '10px 0', color: '#e2e8f0' }}>{row.equipment_name}</td>
                    <td style={{ color: '#64748b' }}>{tab === 'purchases' ? row.base_name : `${row.from_base} → ${row.to_base}`}</td>
                    <td style={{ textAlign: 'right', color: '#22c55e', fontWeight: 700 }}>+{row.quantity}</td>
                    <td style={{ textAlign: 'right', color: '#374151' }}>{new Date(row.purchased_at || row.transferred_at).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

const BAR_COLORS = ['#3b82f6', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [bases, setBases] = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    base_id: user?.role !== 'admin' ? (user?.base_id || '') : '',
    equipment_type_id: '',
    date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });

  const fetchMetrics = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.get('/dashboard/metrics', { params }).then(r => setMetrics(r.data)).catch(console.error);
  }, [filters]);

  useEffect(() => {
    api.get('/dashboard/bases').then(r => setBases(r.data));
    api.get('/dashboard/equipment-types').then(r => setEquipTypes(r.data));
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const chartData = metrics ? [
    { name: 'Opening', value: metrics.opening_balance }, { name: 'Purchases', value: metrics.purchases },
    { name: 'Trans In', value: metrics.transfer_in }, { name: 'Trans Out', value: metrics.transfer_out },
    { name: 'Expended', value: metrics.expended }, { name: 'Closing', value: metrics.closing_balance },
  ] : [];

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 17, letterSpacing: 3, margin: '0 0 4px' }}>COMMAND DASHBOARD</h1>
        <p style={{ color: '#374151', fontSize: 11, margin: 0, letterSpacing: 1 }}>Real-time asset tracking and movement overview</p>
      </div>
      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {[
          { key: 'base_id', label: 'BASE', type: 'select', opts: bases, disabled: user?.role !== 'admin', allLabel: 'All Bases' },
          { key: 'equipment_type_id', label: 'EQUIPMENT TYPE', type: 'select', opts: equipTypes, allLabel: 'All Types' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>{f.label}</label>
            <select value={filters[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })} disabled={f.disabled}
              style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
              <option value="">{f.allLabel}</option>
              {f.opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        ))}
        {['date_from', 'date_to'].map((k, i) => (
          <div key={k}>
            <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>{i === 0 ? 'FROM' : 'TO'}</label>
            <input type="date" value={filters[k]} onChange={e => setFilters({ ...filters, [k]: e.target.value })}
              style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 20 }}>
        <MetricCard label="OPENING BALANCE" value={metrics?.opening_balance} color="#3b82f6" />
        <MetricCard label="CLOSING BALANCE" value={metrics?.closing_balance} color="#8b5cf6" />
        <MetricCard label="NET MOVEMENT" value={metrics?.net_movement} color={!metrics || metrics.net_movement >= 0 ? '#22c55e' : '#ef4444'} onClick={() => setShowModal(true)} sub={`P+${metrics?.purchases||0}  TI+${metrics?.transfer_in||0}  TO-${metrics?.transfer_out||0}`} />
        <MetricCard label="PURCHASES" value={metrics?.purchases} color="#22c55e" />
        <MetricCard label="TRANSFER IN" value={metrics?.transfer_in} color="#06b6d4" />
        <MetricCard label="TRANSFER OUT" value={metrics?.transfer_out} color="#f59e0b" />
        <MetricCard label="ASSIGNED" value={metrics?.assigned} color="#a78bfa" />
        <MetricCard label="EXPENDED" value={metrics?.expended} color="#f87171" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 18 }}>MOVEMENT BREAKDOWN</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2338" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'Courier New' }} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 6, color: '#e2e8f0', fontSize: 11 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>{chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <AIAnalyst metrics={metrics} bases={bases} equipTypes={equipTypes} currentFilters={filters} />
      </div>
      {showModal && <NetMovementModal onClose={() => setShowModal(false)} filters={filters} />}
    </div>
  );
}
