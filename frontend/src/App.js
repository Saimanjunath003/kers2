import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Transfers from './pages/Transfers';
import Assignments from './pages/Assignments';
import AuditLogs from './pages/AuditLogs';

const PAGE_MAP = {
  dashboard: Dashboard,
  purchases: Purchases,
  transfers: Transfers,
  assignments: Assignments,
  audit: AuditLogs,
};

function AppInner() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (!user) return <Login onLogin={() => setPage('dashboard')} />;

  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080c18' }}>
      <Sidebar activePage={page} onNavigate={setPage} />
      <main style={{ flex: 1, padding: '28px 30px', overflowY: 'auto', minWidth: 0 }}>
        <PageComponent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
