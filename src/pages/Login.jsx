// File: src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-white space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <span className="text-4xl font-bold">Dealcross</span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight">
            Secure Escrow Payments for Your Transactions
          </h1>
          
          <p className="text-lg text-blue-200">
            Trustworthy and easy-to-use escrow platform designed to protect buyers and sellers.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Escrow Protection</h3>
                <p className="text-sm text-blue-200">Your funds are held safely until transaction completes</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Tracking</h3>
                <p className="text-sm text-blue-200">Monitor your transactions with GPS and delivery proof</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">24/7 Support</h3>
                <p className="text-sm text-blue-200">Dispute resolution and customer support anytime</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <span className="text-sm text-blue-300">Trusted by thousands of users</span>
            <div className="flex">
              {[1,2,3,4,5].map((star) => (
                <span key={star} className="text-yellow-400">★</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">Dealcross</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-1">Login to access your secure dashboard</p>
            </div>
            
            {successMessage && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800">{successMessage}</p>
                    <p className="text-xs text-green-700 mt-1">
                      📧 Check your email inbox (and spam folder) for the verification link.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">{error}</p>
                    {error.toLowerCase().includes('verify') && (
                      <div className="mt-3">
                        <Link
                          to="/resend-verification"
                          state={{ email: formData.email }}
                          className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 underline font-medium"
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
                theme="outline"
                shape="rectangular"
              />
            </div>

            {/* Divider */}
            <div className="mb-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm font-medium text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
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
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
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
            <p className="text-center text-sm text-gray-600 mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-500 transition">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-white hover:text-blue-200 transition flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;