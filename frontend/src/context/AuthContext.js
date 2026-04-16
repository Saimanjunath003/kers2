import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const canAccess = (feature) => {
    if (!user) return false;
    const perms = {
      admin: ['dashboard', 'purchases', 'transfers', 'assignments', 'audit'],
      base_commander: ['dashboard', 'purchases', 'transfers', 'assignments'],
      logistics_officer: ['dashboard', 'purchases', 'transfers', 'assignments'],
    };
    return (perms[user.role] || []).includes(feature);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
