// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

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

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    console.log('🔄 Initializing auth state...');
    
    const initAuth = () => {
      try {
        const token = authService.getToken();
        const savedUser = authService.getCurrentUser();
        
        console.log('📦 Token exists:', !!token);
        console.log('👤 User exists:', !!savedUser);
        
        if (token && savedUser) {
          setUser(savedUser);
          console.log('✅ Auth state restored:', savedUser.email);
        } else {
          console.log('❌ No saved auth state');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
        return response;
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

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  const updateUser = (userData) => {
    const updatedUser = authService.updateUser(userData);
    if (updatedUser) {
      setUser(updatedUser);
    }
    return updatedUser;
  };

  const refreshUser = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    return currentUser;
  };

  const value = {
    user,
    login,
    googleLogin,
    completeGoogleProfile,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
