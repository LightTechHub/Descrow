// src/contexts/AuthContext.jsx - FIXED
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        const savedUser = authService.getCurrentUser();

        if (token && savedUser) {
          // Set cached user immediately so UI is not blocked while we verify
          setUser(savedUser);

          try {
            const response = await fetch(
              `${process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api'}/users/me`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.user) {
                // Merge fresh server data with cache so nothing is lost
                const merged = { ...savedUser, ...data.user };
                setUser(merged);
                authService.updateUser(merged);
              }
            }
            // Non-ok (401 etc) — cached user stays, will be redirected on next
            // protected API call
          } catch {
            // Network error — keep cached user, app still works offline
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        // Always release loading — never leave the app stuck on spinner
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      if (response?.success && response.user) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const googleLogin = async (googleData) => {
    try {
      const response = await authService.googleAuth(googleData);
      if (response.success && response.user && !response.requiresProfileCompletion) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const completeGoogleProfile = async (profileData) => {
    try {
      const response = await authService.completeGoogleProfile(profileData);
      if (response.success && response.user) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  // Deep merge so nested fields like businessInfo.companyName are never wiped
  // when a partial update comes back from the server or profile save
  const updateUser = (userData) => {
    setUser(prev => {
      const merged = {
        ...prev,
        ...userData,
        businessInfo: {
          ...(prev?.businessInfo || {}),
          ...(userData?.businessInfo || {}),
        },
        address: {
          ...(prev?.address || {}),
          ...(userData?.address || {}),
        },
      };
      authService.updateUser(merged);
      return merged;
    });
  };

  // Fetches fresh user data from the API and syncs context + localStorage
  const refreshUser = async () => {
    try {
      const token = authService.getToken();
      if (!token) return null;

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api'}/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          authService.updateUser(data.user);
          return data.user;
        }
      }
    } catch (error) {
      console.error('refreshUser error:', error);
    }

    const cached = authService.getCurrentUser();
    if (cached) setUser(cached);
    return cached;
  };

  const value = {
    user,
    login,
    googleLogin,
    completeGoogleProfile,
    register,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
    loading,
  };

  // Always render children. ProtectedRoute handles the loading UI.
  // The previous {!loading && children} was causing the spinner in ProtectedRoute
  // to never mount, so nothing was visible during the auth check.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
