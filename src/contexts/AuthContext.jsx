// src/contexts/AuthContext.jsx
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

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    console.log('🔄 Initializing auth state...');
    
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        const savedUser = authService.getCurrentUser();
        
        console.log('📦 Token exists:', !!token);
        console.log('👤 User exists:', !!savedUser);
        
        if (token && savedUser) {
          // Optionally verify token is still valid by fetching fresh user data
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api'}/users/me`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.user) {
                setUser(data.user);
                console.log('✅ Auth state restored with fresh data:', data.user.email);
              } else {
                setUser(savedUser);
                console.log('✅ Auth state restored from localStorage:', savedUser.email);
              }
            } else {
              // Token might be invalid, use cached user but it will be revalidated on next API call
              setUser(savedUser);
              console.log('⚠️ Could not verify token, using cached user');
            }
          } catch (error) {
            // Network error, use cached data
            setUser(savedUser);
            console.log('⚠️ Network error during init, using cached user');
          }
        } else {
          console.log('❌ No saved auth state');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      console.log('🔐 Logging in...');
      const response = await authService.login(credentials);
      
      if (response && response.success && response.user) {
        setUser(response.user);
        console.log('✅ User logged in:', response.user.email);
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login error in context:', error);
      throw error;
    }
  };

  const googleLogin = async (googleData) => {
    try {
      console.log('🔵 Google login...');
      const response = await authService.googleAuth(googleData);
      
      if (response.success && response.user && !response.requiresProfileCompletion) {
        setUser(response.user);
        console.log('✅ Google user logged in:', response.user.email);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Google login error in context:', error);
      throw error;
    }
  };

  const completeGoogleProfile = async (profileData) => {
    try {
      console.log('📝 Completing Google profile...');
      const response = await authService.completeGoogleProfile(profileData);
      
      if (response.success && response.user) {
        setUser(response.user);
        console.log('✅ Google profile completed:', response.user.email);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Complete profile error in context:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Registering user...');
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      console.error('❌ Register error in context:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    setUser(null);
    authService.logout();
  };

  const updateUser = (userData) => {
    const updatedUser = authService.updateUser(userData);
    if (updatedUser) {
      setUser(updatedUser);
      console.log('✅ User updated in context');
    }
    return updatedUser;
  };

  const refreshUser = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    console.log('🔄 User refreshed in context');
    return currentUser;
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;