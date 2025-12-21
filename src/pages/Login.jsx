// File: src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state.email) {
        setFormData(prev => ({ ...prev, email: location.state.email }));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authService.googleAuth({
        credential: credentialResponse.credential
      });
      
      if (response.success) {
        if (response.requiresProfileCompletion) {
          navigate('/complete-profile', {
            state: { googleData: response.googleData }
          });
          return;
        }

        try {
          const freshUserResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users/me`, {
            headers: {
              'Authorization': `Bearer ${response.token}`
            }
          });
          
          if (freshUserResponse.ok) {
            const freshData = await freshUserResponse.json();
            if (freshData.success && freshData.user) {
              setUser(freshData.user);
            } else {
              setUser(response.user);
            }
          } else {
            setUser(response.user);
          }
        } catch (fetchError) {
          console.error('Failed to fetch fresh user data:', fetchError);
          setUser(response.user);
        }

        navigate('/dashboard', { replace: true });
      } else {
        setError(response.message || 'Google login failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setSuccessMessage('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      const response = await authService.login({
        email: formData.email.trim(),
        password: formData.password
      });

      if (!response || !response.success) {
        setError(response?.message || 'Login failed');
        return;
      }

      if (!response.user || !response.token) {
        setError('Login failed - invalid response');
        return;
      }

      if (!response.user.verified) {
        setError('Your email is not verified. Please check your inbox or spam folder.');
        return;
      }

      try {
        const freshUserResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users/me`, {
          headers: {
            'Authorization': `Bearer ${response.token}`
          }
        });
        
        if (freshUserResponse.ok) {
          const freshData = await freshUserResponse.json();
          if (freshData.success && freshData.user) {
            setUser(freshData.user);
          } else {
            setUser(response.user);
          }
        } else {
          setUser(response.user);
        }
      } catch (fetchError) {
        console.error('Failed to fetch fresh user data:', fetchError);
        setUser(response.user);
      }

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);

    } catch (err) {
      console.error('❌ Login error:', err);
      const message = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <span className="text-4xl font-bold text-white drop-shadow-lg">Dealcross</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-blue-200">Login to access your secure dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          
          {successMessage && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">{successMessage}</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    📧 Check your email inbox (and spam folder) for the verification link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
                  {error.toLowerCase().includes('verify') && (
                    <div className="mt-3">
                      <Link
                        to="/resend-verification"
                        state={{ email: formData.email }}
                        className="inline-flex items-center gap-1 text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline font-medium"
                      >
                        <Mail className="w-4 h-4" />
                        Resend verification email
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <div className="mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError('Google login failed');
                toast.error('Google login failed');
              }}
              useOneTap
              text="signin_with"
              size="large"
              width="100%"
            />
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
            <span className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Login to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-500 transition">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white border border-white/20">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Why choose Dealcross?
          </h3>
          <ul className="space-y-3 text-sm text-blue-100">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>Secure escrow protection for all transactions</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>Real-time chat with buyers and sellers</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>GPS tracking and delivery proof</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>24/7 dispute resolution support</span>
            </li>
          </ul>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-blue-200 hover:text-white transition flex items-center justify-center gap-2">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;