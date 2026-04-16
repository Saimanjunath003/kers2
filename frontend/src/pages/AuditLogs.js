import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const ACTION_COLORS = { CREATE: '#22c55e', DELETE: '#ef4444', LOGIN: '#3b82f6', UPDATE: '#f59e0b' };
const ENTITY_COLORS = { purchase: '#22c55e', transfer: '#06b6d4', assignment: '#a78bfa', user: '#3b82f6' };

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ entity_type: '', action: '', date_from: '', date_to: '' });
  const [expanded, setExpanded] = useState(null);

  const fetchLogs = useCallback(() => {
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)), page, limit: 20 };
    api.get('/audit', { params }).then(r => { setLogs(r.data.data); setTotal(r.data.total); }).catch(console.error);
  }, [filters, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 17, letterSpacing: 3, margin: '0 0 4px' }}>AUDIT LOGS</h1>
        <p style={{ color: '#374151', fontSize: 11, margin: 0, letterSpacing: 1 }}>Complete transaction history for compliance and accountability</p>
      </div>

      <div style={{ background: '#0d1225', border: '1px solid #1a2338', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>ENTITY TYPE</label>
          <select value={filters.entity_type} onChange={e => { setFilters({ ...filters, entity_type: e.target.value }); setPage(1); }}
            style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
            <option value="">All Entities</option>
            {['purchase', 'transfer', 'assignment', 'user'].map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#374151', fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>ACTION</label>
          <select value={filters.action} onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
            style={{ background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
            <option value="">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map(a => <option key={a} value={a}>{a}</option>)}
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
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2338', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#374151', fontSize: 11, letterSpacing: 1 }}>TOTAL: {total} log entries</span>
          <span style={{ color: '#1e3a6e', fontSize: 10, letterSpacing: 1 }}>ADMIN ONLY</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#060a14' }}>
                {['Timestamp', 'User', 'Action', 'Entity', 'Details', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#374151', letterSpacing: 1, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#374151' }}>No logs found</td></tr>
              ) : logs.map(log => {
                let details = {};
                try { details = JSON.parse(log.details || '{}'); } catch {}
                const isExpanded = expanded === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr style={{ borderTop: '1px solid #1a2338' }}>
                      <td style={{ padding: '10px 16px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{log.full_name || log.username || 'System'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: (ACTION_COLORS[log.action] || '#94a3b8') + '22', color: ACTION_COLORS[log.action] || '#94a3b8', letterSpacing: 1 }}>{log.action}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: (ENTITY_COLORS[log.entity_type] || '#94a3b8') + '22', color: ENTITY_COLORS[log.entity_type] || '#94a3b8', letterSpacing: 1 }}>{log.entity_type}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.entries(details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => setExpanded(isExpanded ? null : log.id)} style={{ background: 'none', border: '1px solid #1a2338', borderRadius: 4, padding: '2px 8px', color: '#4a5568', fontSize: 11, cursor: 'pointer' }}>{isExpanded ? '▲' : '▼'}</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#060a14' }}>
                        <td colSpan={6} style={{ padding: '12px 16px' }}>
                          <pre style={{ color: '#60a5fa', fontSize: 11, margin: 0, fontFamily: 'inherit' }}>{JSON.stringify(details, null, 2)}</pre>
                          <div style={{ color: '#374151', fontSize: 10, marginTop: 8 }}>Entity ID: {log.entity_id} | IP: {log.ip_address}</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #1a2338', display: 'flex', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? '#1d3a7a' : 'transparent', border: '1px solid #1a2338', borderRadius: 4, padding: '4px 10px', color: page === p ? '#60a5fa' : '#4a5568', fontSize: 12, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
