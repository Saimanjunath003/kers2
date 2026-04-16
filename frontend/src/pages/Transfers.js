import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ base_id: user?.role !== 'admin' ? (user?.base_id || '') : '', equipment_type_id: '', date_from: '', date_to: '' });
  const [form, setForm] = useState({ from_base_id: user?.base_id || '', to_base_id: '', equipment_type_id: '', quantity: '', notes: '' });

  const fetchTransfers = useCallback(() => {
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)), page, limit: 15 };
    api.get('/transfers', { params }).then(r => { setTransfers(r.data.data); setTotal(r.data.total); }).catch(console.error);
  }, [filters, page]);

  useEffect(() => {
    api.get('/dashboard/bases').then(r => setBases(r.data));
    api.get('/dashboard/equipment-types').then(r => setEquipTypes(r.data));
  }, []);
  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.from_base_id || !form.to_base_id || !form.equipment_type_id || !form.quantity) { setFormError('All fields are required.'); return; }
    if (form.from_base_id === form.to_base_id) { setFormError('Source and destination bases must differ.'); return; }
    setSubmitting(true);
    try {
      await api.post('/transfers', { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      setForm({ from_base_id: user?.base_id || '', to_base_id: '', equipment_type_id: '', quantity: '', notes: '' });
      fetchTransfers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Transfer failed');
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: 17, letterSpacing: 3, margin: '0 0 4px' }}>TRANSFERS</h1>
          <p style={{ color: '#374151', fontSize: 11, margin: 0, letterSpacing: 1 }}>Move assets between operational bases</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? '#1a2338' : '#1d3a7a', border: '1px solid #1e3a6e', borderRadius: 8, padding: '10px 18px', color: '#60a5fa', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
          {showForm ? 'CANCEL' : '⇄ NEW TRANSFER'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#0d1225', border: '1px solid #1e3a6e', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ color: '#4a7bb5', fontSize: 11, letterSpacing: 2, marginBottom: 18 }}>INITIATE TRANSFER</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { label: 'FROM BASE *', key: 'from_base_id', opts: bases, disabled: user?.role !== 'admin' },
                { label: 'TO BASE *', key: 'to_base_id', opts: bases },
                { label: 'EQUIPMENT TYPE *', key: 'equipment_type_id', opts: equipTypes },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{f.label}</label>
                  <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} disabled={f.disabled}
                    style={{ width: '100%', background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
                    <option value="">Select...</option>
                    {f.opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>QUANTITY *</label>
                <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  style={{ width: '100%', background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>NOTES</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={{ width: '100%', background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
            {formError && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginTop: 14 }}>{formError}</div>}
            <button type="submit" disabled={submitting} style={{ marginTop: 16, background: '#1d3a7a', border: 'none', borderRadius: 6, padding: '11px 24px', color: '#93c5fd', fontSize: 12, cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
              {submitting ? 'PROCESSING...' : 'EXECUTE TRANSFER'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>BASE (ANY DIRECTION)</label>
          <select value={filters.base_id} onChange={e => { setFilters({ ...filters, base_id: e.target.value }); setPage(1); }} disabled={user?.role !== 'admin'}
            style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
            <option value="">All Bases</option>
            {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>EQUIPMENT</label>
          <select value={filters.equipment_type_id} onChange={e => { setFilters({ ...filters, equipment_type_id: e.target.value }); setPage(1); }}
            style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
            <option value="">All Types</option>
            {equipTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {['date_from', 'date_to'].map((k, i) => (
          <div key={k}>
            <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>{i === 0 ? 'FROM' : 'TO'}</label>
            <input type="date" value={filters[k]} onChange={e => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); }}
              style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }} />
          </div>
        ))}
      </div>

      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2338' }}>
          <span style={{ color: '#374151', fontSize: 11, letterSpacing: 1 }}>TOTAL: {total} transfers</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#060a14' }}>
                {['Date', 'Equipment', 'From', 'To', 'Quantity', 'Status', 'Requested By'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#374151', letterSpacing: 1, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#374151' }}>No transfers found</td></tr>
              ) : transfers.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid #1a2338' }}>
                  <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(t.transferred_at).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 16px', color: '#e2e8f0' }}>{t.equipment_name}</td>
                  <td style={{ padding: '11px 16px', color: '#f59e0b' }}>{t.from_base_name}</td>
                  <td style={{ padding: '11px 16px', color: '#22c55e' }}>{t.to_base_name}</td>
                  <td style={{ padding: '11px 16px', color: '#06b6d4', fontWeight: 700 }}>{t.quantity}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: t.status === 'completed' ? '#052e16' : '#2d1515', color: t.status === 'completed' ? '#22c55e' : '#f87171', letterSpacing: 1 }}>{t.status?.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{t.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #1a2338', display: 'flex', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? '#1d3a7a' : 'transparent', border: '1px solid #1a2338', borderRadius: 4, padding: '4px 10px', color: page === p ? '#60a5fa' : '#4a5568', fontSize: 12, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
