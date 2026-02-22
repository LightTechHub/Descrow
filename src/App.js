// File: src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from './contexts/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';

// ==================== PUBLIC PAGES ====================
import LandingPage from './pages/LandingPage';
import Login from './pages/Auth/Login';  // ✅ FIXED: Updated import path
import UnifiedSignup from './pages/Auth/UnifiedSignup';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResendVerification from './pages/ResendVerification';
import ResetPassword from './pages/ResetPassword';
import CompleteProfilePage from './pages/Auth/CompleteProfilePage';
import KYCVerificationPage from './pages/KYC/KYCVerificationPage';

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
import ApiDashboardPage from './pages/ApiDashboardPage';
import EscrowDetails from './pages/EscrowDetails';
import ProfilePage from './pages/Profile/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PaymentPage from './pages/PaymentPage';
import PaymentVerificationPage from './pages/PaymentVerificationPage';

// ==================== SUBSCRIPTION PAGES ====================
import UpgradePage from './pages/Subscription/UpgradePage';
import PaymentCallbackPage from './pages/Subscription/PaymentCallbackPage';

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
  const { user, isAuthenticated, loading } = useAuth();
  const [admin, setAdmin] = React.useState(null);
  const [adminLoading, setAdminLoading] = React.useState(true);

  // ==================== INIT ADMIN AUTH ====================
  useEffect(() => {
    const initAdminAuth = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('admin');
      if (adminToken && adminData) {
        try { 
          setAdmin(JSON.parse(adminData)); 
        } catch { 
          localStorage.removeItem('adminToken'); 
          localStorage.removeItem('admin'); 
        }
      }
      setAdminLoading(false);
    };

    initAdminAuth();
  }, []);

  // ==================== PROTECTED ROUTES ====================
const ProtectedRoute = ({ children }) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        {/* ✅ FIXED: Added !important style to force animation */}
        <div 
          className="rounded-full h-12 w-12 border-b-2 border-blue-600"
          style={{ 
            animation: 'spin 1s linear infinite',
            borderBottomColor: '#3b82f6',
            borderRightColor: 'transparent',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent'
          }}
        ></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminProtectedRoute = ({ children, requiredPermission }) => {
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        {/* ✅ FIXED: Added !important style to force animation */}
        <div 
          className="rounded-full h-12 w-12 border-b-2 border-red-600"
          style={{ 
            animation: 'spin 1s linear infinite',
            borderBottomColor: '#dc2626',
            borderRightColor: 'transparent',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent'
          }}
        ></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredPermission && admin.role !== 'master' && !admin.permissions?.[requiredPermission]) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Also update the main loading spinner (around line 185)
if (loading || adminLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      {/* ✅ FIXED: Added !important style to force animation */}
      <div 
        className="rounded-full h-16 w-16 border-b-2 border-blue-600"
        style={{ 
          animation: 'spin 1s linear infinite',
          borderBottomColor: '#3b82f6',
          borderRightColor: 'transparent',
          borderTopColor: 'transparent',
          borderLeftColor: 'transparent'
        }}
      ></div>
    </div>
  );
}

  // ==================== NAVBAR & FOOTER LOGIC ====================
  const showNavbar = () => {
    const path = window.location.pathname;
    const noNavbarRoutes = [
      '/login',
      '/signup',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/resend-verification',
      '/complete-profile',
      '/admin'
    ];
    return !noNavbarRoutes.some(route => path.startsWith(route));
  };

  const showFooter = () => {
    const path = window.location.pathname;
    const noFooterRoutes = [
      '/login',
      '/signup',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/resend-verification',
      '/complete-profile',
      '/admin',
      '/dashboard',
      '/escrow',
      '/profile',
      '/notifications',
      '/payment',
      '/upgrade'
    ];
    return !noFooterRoutes.some(route => path.startsWith(route));
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
        {showNavbar() && <Navbar user={user} />}

        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/signup" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <UnifiedSignup />} 
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          
          {/* OAuth Complete Profile Route */}
          <Route 
            path="/complete-profile" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <CompleteProfilePage />} 
          />

          {/* KYC Verification Route */}
          <Route 
            path="/kyc-verification" 
            element={
              <ProtectedRoute>
                <KYCVerificationPage />
              </ProtectedRoute>
            } 
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
          <Route 
            path="/dashboard" 
            element={
             <ProtectedRoute>
               <UnifiedDashboard />
              </ProtectedRoute>
            } 
           />
          <Route 
            path="/api-dashboard" 
            element={
              <ProtectedRoute>
                <ApiDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/escrow/:id" 
            element={
              <ProtectedRoute>
                <EscrowDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment/:escrowId" 
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment/verify" 
            element={
              <ProtectedRoute>
                <PaymentVerificationPage />
              </ProtectedRoute>
            } 
          />

          {/* ==================== SUBSCRIPTION ROUTES ==================== */}
          <Route 
            path="/upgrade" 
            element={
              <ProtectedRoute>
                <UpgradePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upgrade/callback" 
            element={
              <ProtectedRoute>
                <PaymentCallbackPage />
              </ProtectedRoute>
            } 
          />

          {/* Legacy redirects */}
          <Route path="/buyer-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/seller-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/unified-dashboard" element={<Navigate to="/dashboard" replace />} />

          {/* ==================== ADMIN ROUTES ==================== */}
          <Route 
            path="/admin/login" 
            element={admin ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin setAdmin={setAdmin} />} 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminProtectedRoute>
                <AdminDashboard admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/transactions" 
            element={
              <AdminProtectedRoute requiredPermission="viewTransactions">
                <TransactionsPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/disputes" 
            element={
              <AdminProtectedRoute requiredPermission="manageDisputes">
                <DisputesPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminProtectedRoute requiredPermission="verifyUsers">
                <UsersPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <AdminProtectedRoute requiredPermission="viewAnalytics">
                <AnalyticsPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/payments" 
            element={
              <AdminProtectedRoute requiredPermission="managePayments">
                <PaymentGatewaysPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/api" 
            element={
              <AdminProtectedRoute requiredPermission="manageAPI">
                <APIManagementPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/admins" 
            element={
              <AdminProtectedRoute requiredPermission="manageAdmins">
                <AdminManagementPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/fees" 
            element={
              <AdminProtectedRoute requiredPermission="manageFees">
                <FeeManagementPage admin={admin} />
              </AdminProtectedRoute>
            } 
          />

          {/* ==================== 404 ==================== */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {showFooter() && <Footer />}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;