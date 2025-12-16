// File: src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const UserContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch fresh user data from backend
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        // ✅ Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // If token is invalid, clear everything
      if (error.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Refresh user data (can be called from anywhere)
  const refreshUser = async () => {
    await fetchUserProfile();
  };

  // ✅ Check auth on mount - fetch from backend, not localStorage
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

  // Sign in function
  const signIn = async (userData, token) => {
    try {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('token', token);
      }
      // ✅ Fetch fresh data after sign in
      await fetchUserProfile();
      return { success: true };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { success: false, error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return { success: true };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { success: false, error };
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
    refreshUser
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;