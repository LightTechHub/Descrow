// File: src/App.jsx

import React, { useEffect, useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import authService from './services/authService';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Loader from './components/Loader';

// --------------------
// Auth Context
// --------------------
export const AuthContext = createContext(null);

// --------------------
// Axios Interceptor (SAFE)
// --------------------
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Only logout on AUTH endpoints
    if (status === 401 && url.includes('/auth')) {
      authService.logout();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// --------------------
// Protected Route
// --------------------
const ProtectedRoute = ({ children, user, loading }) => {
  if (loading) return <Loader fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// --------------------
// App Component
// --------------------
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --------------------
  // INIT AUTH (SAFE)
  // --------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setUser(null);
          return;
        }

        const currentUser = authService.getCurrentUser();

        // Do NOT delete storage here
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // --------------------
  // TOKEN EXPIRY CHECK (INTERVAL ONLY)
  // --------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && authService.isTokenExpired(token)) {
        authService.logout();
        window.location.href = '/login';
      }
    }, 60 * 1000); // every 1 min

    return () => clearInterval(interval);
  }, []);

  // --------------------
  // AUTH CONTEXT VALUE
  // --------------------
  const authContextValue = {
    user,
    setUser,
    loading,
    login: (userData, token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    },
    logout: () => {
      authService.logout();
      setUser(null);
    }
  };

  // --------------------
  // GLOBAL LOADING SCREEN
  // --------------------
  if (loading) {
    return <Loader fullscreen />;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;