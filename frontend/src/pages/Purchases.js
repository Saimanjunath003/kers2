import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    base_id: user?.role !== 'admin' ? (user?.base_id || '') : '',
    equipment_type_id: '', date_from: '', date_to: '',
  });
  const [form, setForm] = useState({
    base_id: user?.base_id || '', equipment_type_id: '', quantity: '', supplier: '', notes: '',
  });

  const fetchPurchases = useCallback(() => {
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)), page, limit: 15 };
    api.get('/purchases', { params }).then(r => { setPurchases(r.data.data); setTotal(r.data.total); }).catch(console.error);
  }, [filters, page]);

  useEffect(() => {
    api.get('/dashboard/bases').then(r => setBases(r.data));
    api.get('/dashboard/equipment-types').then(r => setEquipTypes(r.data));
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.base_id || !form.equipment_type_id || !form.quantity) {
      setFormError('Base, equipment type, and quantity are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/purchases', { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      setForm({ base_id: user?.base_id || '', equipment_type_id: '', quantity: '', supplier: '', notes: '' });
      fetchPurchases();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 15);
  const canCreate = ['admin', 'base_commander', 'logistics_officer'].includes(user?.role);

  const categoryColor = { weapon: '#ef4444', vehicle: '#f59e0b', ammunition: '#22c55e', equipment: '#3b82f6' };

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: 17, letterSpacing: 3, margin: '0 0 4px' }}>PURCHASES</h1>
          <p style={{ color: '#374151', fontSize: 11, margin: 0, letterSpacing: 1 }}>Record and track asset procurement</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? '#1a2338' : '#1d3a7a', border: '1px solid #1e3a6e', borderRadius: 8, padding: '10px 18px', color: '#60a5fa', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
            {showForm ? 'CANCEL' : '+ NEW PURCHASE'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#0d1225', border: '1px solid #1e3a6e', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ color: '#4a7bb5', fontSize: 11, letterSpacing: 2, marginBottom: 18 }}>RECORD PURCHASE</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { label: 'BASE *', key: 'base_id', type: 'select', opts: bases, disabled: user?.role !== 'admin' },
                { label: 'EQUIPMENT TYPE *', key: 'equipment_type_id', type: 'select', opts: equipTypes },
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
              {[
                { label: 'QUANTITY *', key: 'quantity', inputType: 'number', min: 1 },
                { label: 'SUPPLIER', key: 'supplier', inputType: 'text' },
                { label: 'NOTES', key: 'notes', inputType: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{f.label}</label>
                  <input type={f.inputType} min={f.min} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            {formError && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginTop: 14 }}>{formError}</div>}
            <button type="submit" disabled={submitting} style={{ marginTop: 16, background: '#1d3a7a', border: 'none', borderRadius: 6, padding: '11px 24px', color: '#93c5fd', fontSize: 12, cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
              {submitting ? 'RECORDING...' : 'RECORD PURCHASE'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { key: 'base_id', label: 'BASE', type: 'select', opts: bases, disabled: user?.role !== 'admin', allLabel: 'All Bases' },
          { key: 'equipment_type_id', label: 'EQUIPMENT', type: 'select', opts: equipTypes, allLabel: 'All Types' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>{f.label}</label>
            <select value={filters[f.key]} onChange={e => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }} disabled={f.disabled}
              style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
              <option value="">{f.allLabel}</option>
              {f.opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        ))}
        {['date_from', 'date_to'].map((k, i) => (
          <div key={k}>
            <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>{i === 0 ? 'FROM' : 'TO'}</label>
            <input type="date" value={filters[k]} onChange={e => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); }}
              style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2338', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#374151', fontSize: 11, letterSpacing: 1 }}>TOTAL: {total} records</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#060a14' }}>
                {['Date', 'Equipment', 'Category', 'Base', 'Quantity', 'Supplier', 'Recorded By'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#374151', letterSpacing: 1, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#374151' }}>No purchases found</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #1a2338' }}>
                  <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(p.purchased_at).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 16px', color: '#e2e8f0' }}>{p.equipment_name}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: (categoryColor[p.category] || '#94a3b8') + '22', color: categoryColor[p.category] || '#94a3b8', letterSpacing: 1 }}>{p.category?.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{p.base_name}</td>
                  <td style={{ padding: '11px 16px', color: '#22c55e', fontWeight: 700 }}>+{p.quantity}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{p.supplier || '—'}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{p.created_by_name}</td>
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
