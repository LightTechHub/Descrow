// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const u = await authService.getCurrentUser();
      const authenticated = await authService.isAuthenticated();
      if (u && authenticated) {
        setUser(u);
        setIsAuthenticated(true);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && !res.requires2FA) {
      setUser(res.user);
      setIsAuthenticated(true);
    }
    return res;
  };

  const complete2FA = async (tempToken, code) => {
    const res = await authService.verify2FALogin(tempToken, code);
    if (res.success) {
      setUser(res.user);
      setIsAuthenticated(true);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updated) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated,
      login, logout, complete2FA, updateUser, checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
