// File: src/App.jsx

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';

// ==================== CORE COMPONENTS ====================
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// ==================== AUTH ====================
import { authService } from './services/authService';
import { isTokenExpired, forceLogout } from './utils/auth.utils';

// ==================== PUBLIC PAGES ====================
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUpPage from './pages/SignUpPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ResendVerification from './pages/ResendVerification';
import CompleteProfilePage from './pages/Auth/CompleteProfilePage';

// ==================== FOOTER PAGES ====================
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import DocsPage from './pages/DocsPage';
import FAQPage from './pages/FAQPage';
import BlogPage from './pages/BlogPage';
import ReferralPage from './pages/ReferralPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import CareersPage from './pages/CareersPage';
import APIPage from './pages/APIPage';
import CookiesPage from './pages/CookiesPage';

// ==================== USER PAGES ====================
import UnifiedDashboard from './pages/UnifiedDashboard';
import EscrowDetails from './pages/EscrowDetails';
import ProfilePage from './pages/Profile/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PaymentPage from './pages/PaymentPage';
import PaymentVerificationPage from './pages/PaymentVerificationPage';

// ==================== ADMIN PAGES ====================
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import TransactionsPage from './pages/admin/TransactionsPage';
import DisputesPage from './pages/admin/DisputesPage';
import UsersPage from './pages/admin/UsersPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import PaymentGatewaysPage from './pages/admin/PaymentGatewaysPage';
import APIManagementPage from './pages/admin/APIManagementPage';
import AdminManagementPage from './pages/admin/AdminManagementPage';
import FeeManagementPage from './pages/admin/FeeManagementPage';

// ==================== SAFE AXIOS INTERCEPTOR ====================
axios.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';

    // ONLY logout on auth-related failures
    if (status === 401 && url.includes('/auth')) {
      forceLogout();
    }

    return Promise.reject(err);
  }
);

// ==================== LOADER ====================
const FullscreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600" />
  </div>
);

// ==================== 404 ====================
const NotFound = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-xl font-mono">404 — {location.pathname}</h1>
    </div>
  );
};

// ==================== APP ====================
export default function App() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==================== INIT AUTH ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUser = authService.getCurrentUser();

    if (token && currentUser?.verified) {
      setUser(currentUser);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('admin');
    if (adminToken && adminData) {
      try { setAdmin(JSON.parse(adminData)); }
      catch { localStorage.clear(); }
    }

    setLoading(false);
  }, []);

  // ==================== TOKEN EXPIRY CHECK ====================
  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) forceLogout();
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // ==================== ROUTE GUARDS ====================
  const ProtectedRoute = ({ children }) => {
    if (loading) return <FullscreenLoader />;
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  const AdminProtectedRoute = ({ children }) => {
    if (loading) return <FullscreenLoader />;
    if (!admin) return <Navigate to="/admin/login" replace />;
    return children;
  };

  if (loading) return <FullscreenLoader />;

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar user={user} />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<SignUpPage setUser={setUser} />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route path="/complete-profile" element={<CompleteProfilePage setUser={setUser} />} />

        <Route path="/dashboard" element={<ProtectedRoute><UnifiedDashboard /></ProtectedRoute>} />
        <Route path="/escrow/:id" element={<ProtectedRoute><EscrowDetails /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/payment/:escrowId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/payment/verify" element={<ProtectedRoute><PaymentVerificationPage /></ProtectedRoute>} />

        <Route path="/admin/login" element={<AdminLogin setAdmin={setAdmin} />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}