import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ base_id: user?.role !== 'admin' ? (user?.base_id || '') : '', equipment_type_id: '', assignment_type: '', date_from: '', date_to: '' });
  const [form, setForm] = useState({ base_id: user?.base_id || '', equipment_type_id: '', assigned_to: '', quantity: '', assignment_type: 'assigned', mission: '', notes: '' });

  const fetchAssignments = useCallback(() => {
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)), page, limit: 15 };
    api.get('/assignments', { params }).then(r => { setAssignments(r.data.data); setTotal(r.data.total); }).catch(console.error);
  }, [filters, page]);

  useEffect(() => {
    api.get('/dashboard/bases').then(r => setBases(r.data));
    api.get('/dashboard/equipment-types').then(r => setEquipTypes(r.data));
  }, []);
  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormError('');
    if (!form.base_id || !form.equipment_type_id || !form.assigned_to || !form.quantity) { setFormError('Base, equipment type, assigned to, and quantity are required.'); return; }
    setSubmitting(true);
    try {
      await api.post('/assignments', { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      setForm({ base_id: user?.base_id || '', equipment_type_id: '', assigned_to: '', quantity: '', assignment_type: 'assigned', mission: '', notes: '' });
      fetchAssignments();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Assignment failed');
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: 17, letterSpacing: 3, margin: '0 0 4px' }}>ASSIGNMENTS & EXPENDITURES</h1>
          <p style={{ color: '#374151', fontSize: 11, margin: 0, letterSpacing: 1 }}>Track asset assignments to personnel and expenditures</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? '#1a2338' : '#1d3a7a', border: '1px solid #1e3a6e', borderRadius: 8, padding: '10px 18px', color: '#60a5fa', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
          {showForm ? 'CANCEL' : '◆ NEW ENTRY'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#0d1225', border: '1px solid #1e3a6e', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ color: '#4a7bb5', fontSize: 11, letterSpacing: 2, marginBottom: 18 }}>RECORD ASSIGNMENT / EXPENDITURE</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>TYPE *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['assigned', 'expended'].map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, assignment_type: t })}
                      style={{ flex: 1, background: form.assignment_type === t ? (t === 'assigned' ? '#1d3a7a' : '#2d1515') : '#060a14', border: `1px solid ${form.assignment_type === t ? (t === 'assigned' ? '#1e3a6e' : '#7f1d1d') : '#1a2338'}`, borderRadius: 6, padding: '9px 12px', color: form.assignment_type === t ? (t === 'assigned' ? '#60a5fa' : '#f87171') : '#4a5568', fontSize: 11, cursor: 'pointer', letterSpacing: 1 }}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
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
                { label: 'ASSIGNED TO / PERSONNEL *', key: 'assigned_to', inputType: 'text', placeholder: 'e.g. Sgt. Johnson' },
                { label: 'QUANTITY *', key: 'quantity', inputType: 'number', min: 1 },
                { label: 'MISSION / OPERATION', key: 'mission', inputType: 'text', placeholder: 'e.g. Patrol Alpha' },
                { label: 'NOTES', key: 'notes', inputType: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{f.label}</label>
                  <input type={f.inputType} min={f.min} placeholder={f.placeholder || ''} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            {formError && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginTop: 14 }}>{formError}</div>}
            <button type="submit" disabled={submitting} style={{ marginTop: 16, background: '#1d3a7a', border: 'none', borderRadius: 6, padding: '11px 24px', color: '#93c5fd', fontSize: 12, cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
              {submitting ? 'SAVING...' : 'RECORD ENTRY'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { key: 'base_id', label: 'BASE', opts: bases, disabled: user?.role !== 'admin', allLabel: 'All Bases' },
          { key: 'equipment_type_id', label: 'EQUIPMENT', opts: equipTypes, allLabel: 'All Types' },
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
        <div>
          <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>TYPE</label>
          <select value={filters.assignment_type} onChange={e => { setFilters({ ...filters, assignment_type: e.target.value }); setPage(1); }}
            style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
            <option value="">All Types</option>
            <option value="assigned">Assigned</option>
            <option value="expended">Expended</option>
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
          <span style={{ color: '#374151', fontSize: 11, letterSpacing: 1 }}>TOTAL: {total} entries</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#060a14' }}>
                {['Date', 'Type', 'Equipment', 'Base', 'Assigned To', 'Qty', 'Mission', 'Recorded By'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#374151', letterSpacing: 1, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#374151' }}>No entries found</td></tr>
              ) : assignments.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid #1a2338' }}>
                  <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: a.assignment_type === 'assigned' ? '#0d1f40' : '#2d1515', color: a.assignment_type === 'assigned' ? '#60a5fa' : '#f87171', letterSpacing: 1 }}>
                      {a.assignment_type?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#e2e8f0' }}>{a.equipment_name}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{a.base_name}</td>
                  <td style={{ padding: '11px 16px', color: '#a78bfa' }}>{a.assigned_to}</td>
                  <td style={{ padding: '11px 16px', color: '#e2e8f0', fontWeight: 700 }}>{a.quantity}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{a.mission || '—'}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{a.created_by_name}</td>
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
