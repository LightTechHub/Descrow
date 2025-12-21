// File: src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';
import { authService } from './services/authService';
import { isTokenExpired, forceLogout } from './utils/auth.utils';

// ==================== PUBLIC PAGES ====================
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUpPage from './pages/SignUpPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResendVerification from './pages/ResendVerification';
import ResetPassword from './pages/ResetPassword';
import CompleteProfilePage from './pages/Auth/CompleteProfilePage'; // ✅ NEW

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

// ==================== AXIOS INTERCEPTOR ====================
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);

// ==================== 404 COMPONENT ====================
const NotFound = () => {
  const location = useLocation();
  useEffect(() => { document.title = '404 - Page Not Found | Dealcross'; }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-blue-600 dark:text-blue-400 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">The page you're looking for doesn't exist.</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8 font-mono break-all">{location.pathname}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">Go Home</a>
          <a href="/contact" className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition font-semibold">Contact Support</a>
        </div>
      </div>
    </div>
  );
};

// ==================== APP ====================
function App() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==================== INIT AUTH ====================
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const currentUser = authService.getCurrentUser();
      if (token && currentUser && currentUser.verified) setUser(currentUser);
      else { localStorage.removeItem('token'); localStorage.removeItem('user'); }

      const adminToken = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('admin');
      if (adminToken && adminData) {
        try { setAdmin(JSON.parse(adminData)); } 
        catch { localStorage.removeItem('adminToken'); localStorage.removeItem('admin'); }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // ==================== SESSION MANAGEMENT ====================
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) forceLogout();
    };
    checkAuth();
    const interval = setInterval(checkAuth, 60000); // every 1 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleActivity = () => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) forceLogout();
    };
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, []);

  // ==================== PROTECTED ROUTES ====================
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!user || !user.verified) return <Navigate to="/login" replace />;
    return children;
  };

  const AdminProtectedRoute = ({ children, requiredPermission }) => {
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
    if (!admin) return <Navigate to="/admin/login" replace />;
    if (requiredPermission && admin.role !== 'master' && !admin.permissions?.[requiredPermission]) return <Navigate to="/admin/dashboard" replace />;
    return children;
  };

  // ==================== NAVBAR & FOOTER LOGIC ====================
  const showNavbar = () => {
    const path = window.location.pathname;
    const noNavbarRoutes = ['/login','/signup','/verify-email','/forgot-password','/reset-password','/resend-verification','/complete-profile','/admin'];
    return !noNavbarRoutes.some(route => path.startsWith(route));
  };
  const showFooter = () => {
    const path = window.location.pathname;
    const noFooterRoutes = ['/login','/signup','/verify-email','/forgot-password','/reset-password','/resend-verification','/complete-profile','/admin','/dashboard','/escrow','/profile','/notifications','/payment'];
    return !noFooterRoutes.some(route => path.startsWith(route));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ==================== SINGLE GLOBAL TOASTER ==================== */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
          success: { duration: 3000, iconTheme: { primary: '#4ade80', secondary: '#fff' }, style: { background: '#10b981' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' }, style: { background: '#ef4444' } },
          loading: { duration: Infinity, iconTheme: { primary: '#3b82f6', secondary: '#fff' }, style: { background: '#3b82f6' } },
        }}
      />

      {showNavbar() && <Navbar user={user} />}

      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUpPage setUser={setUser} />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        
        {/* ✅ NEW: Complete Profile Route */}
        <Route 
          path="/complete-profile" 
          element={user ? <Navigate to="/dashboard" replace /> : <CompleteProfilePage setUser={setUser} />} 
        />

        {/* ==================== FOOTER PAGES ==================== */}
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/cookies" element={<CookiesPage />} />

        {/* ==================== USER ROUTES ==================== */}
        <Route path="/dashboard" element={<ProtectedRoute><UnifiedDashboard /></ProtectedRoute>} />
        <Route path="/escrow/:id" element={<ProtectedRoute><EscrowDetails /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/payment/:escrowId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/payment/verify" element={<ProtectedRoute><PaymentVerificationPage /></ProtectedRoute>} />

        {/* Legacy redirects */}
        <Route path="/buyer-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/seller-dashboard" element={<Navigate to="/dashboard" replace />} />

        {/* ==================== ADMIN ROUTES ==================== */}
        <Route path="/admin/login" element={admin ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin setAdmin={setAdmin} />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/transactions" element={<AdminProtectedRoute requiredPermission="viewTransactions"><TransactionsPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/disputes" element={<AdminProtectedRoute requiredPermission="manageDisputes"><DisputesPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/users" element={<AdminProtectedRoute requiredPermission="verifyUsers"><UsersPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/analytics" element={<AdminProtectedRoute requiredPermission="viewAnalytics"><AnalyticsPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/payments" element={<AdminProtectedRoute requiredPermission="managePayments"><PaymentGatewaysPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/api" element={<AdminProtectedRoute requiredPermission="manageAPI"><APIManagementPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/admins" element={<AdminProtectedRoute requiredPermission="manageAdmins"><AdminManagementPage admin={admin} /></AdminProtectedRoute>} />
        <Route path="/admin/fees" element={<AdminProtectedRoute requiredPermission="manageFees"><FeeManagementPage admin={admin} /></AdminProtectedRoute>} />

        {/* ==================== 404 ==================== */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {showFooter() && <Footer />}
    </div>
  );
}

export default App;