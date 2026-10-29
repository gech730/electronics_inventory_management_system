import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('volttrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('volttrack_token') || '');
  const [loading, setLoading] = useState(true);

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('volttrack_theme') || 'dark');

  // Toast System
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('volttrack_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial user fetch
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const freshUser = await api.getUser();
          setUser(freshUser);
          localStorage.setItem('volttrack_user', JSON.stringify(freshUser));
        } catch {
          setUser(null);
          setToken('');
          api.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    addToast(`Welcome back, ${data.user.name}!`, 'success');
    return data;
  };

  const register = async (registerData) => {
    const data = await api.register(registerData);
    setToken(data.token);
    setUser(data.user);
    addToast(data.message || `Welcome to Ngus Electronics, ${data.user.name}!`, 'success');
    return data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setToken('');
      addToast('Logged out successfully', 'info');
    }
  };

  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        hasRole,
        theme,
        toggleTheme,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
