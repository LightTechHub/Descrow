// src/pages/Auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader, AlertCircle, Smartphone } from 'lucide-react';
import { authService } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const credential = credentialResponse.credential;
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const googleUser = JSON.parse(jsonPayload);
      const response = await authService.googleAuth({
        googleId: googleUser.sub, email: googleUser.email,
        name: googleUser.name, picture: googleUser.picture
      });
      if (response.success) {
        if (response.requiresProfileCompletion) {
          navigate('/complete-profile', { state: { googleData: response.googleData } });
          return;
        }
        toast.success('Welcome back!');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      setLoading(true);
      const response = await authService.login({
        email: formData.email,
        password: formData.password
      });

      if (response.success && response.requires2FA) {
        // Password correct, 2FA required — store temp token and show code input
        setTempToken(response.tempToken);
        setRequires2FA(true);
        toast('Enter your 2FA code to continue', { icon: '🔐' });
        return;
      }

      if (response.success) {
        toast.success('Welcome back!');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      }
    } catch (error) {
      console.error('Login error:', error);
      const code = error.response?.data?.code || error.code;
      const msg  = error.response?.data?.message || error.message || 'Login failed';
      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first');
        setTimeout(() => { window.location.href = '/verify-email'; }, 500);
        return;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    const code = twoFACode.replace(/\s/g, '');
    if (!code || code.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      setRequires2FA(false);
      setTwoFACode('');
      return;
    }
    try {
      setLoading(true);
      const response = await API.post('/auth/2fa/verify-login', { tempToken, code });
      const data = response.data;

      if (data.success) {
        // FIX: Save BOTH token AND user to localStorage so the app
        // knows who is logged in after redirect to /dashboard.
        // Without saving user, getCurrentUser() returns null and
        // every protected page crashes / redirects back to login.
        localStorage.setItem('token', data.token);

        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        toast.success('Welcome back!');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      const resData = error.response?.data;
      const msg     = resData?.message || 'Invalid 2FA code';
      const code    = resData?.code;

      if (code === 'TOKEN_EXPIRED' || error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        setRequires2FA(false);
        setTempToken('');
        setTwoFACode('');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700">
            <Shield className="w-8 h-8" />
            <span className="text-2xl font-bold">Dealcross</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {requires2FA ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to your account'}
          </p>
        </div>

        {/* Success Message Banner */}
        {location.state?.message && !requires2FA && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">{location.state.message}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">

          {/* ── 2FA CODE INPUT ─────────────────────────────── */}
          {requires2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authentication Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Open Google Authenticator (or any TOTP app) and enter the current 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || twoFACode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader className="w-5 h-5 animate-spin" /> Verifying...</>
                  : 'Verify and Sign In'
                }
              </button>

              <button
                type="button"
                onClick={() => { setRequires2FA(false); setTempToken(''); setTwoFACode(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                ← Back to login
              </button>
            </form>

          ) : (
            /* ── NORMAL LOGIN FORM ───────────────────────────── */
            <>
              <div className="mb-6">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed')}
                  text="signin_with"
                  size="large"
                  width="100%"
                />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleChange} placeholder="you@example.com" required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} name="password"
                      value={formData.password} onChange={handleChange}
                      placeholder="Enter your password" required
                      className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader className="w-5 h-5 animate-spin" /> Signing in...</>
                    : 'Sign In'
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline font-semibold">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
