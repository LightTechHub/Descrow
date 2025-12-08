// src/pages/admin/AdminLogin.jsx - COMPLETE FIXED VERSION

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const AdminLogin = ({ setAdmin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('🔐 Admin login attempt:', formData.email);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      console.log('📡 Calling admin login API...');
      const response = await adminService.login(formData);

      console.log('📦 Login response:', response);

      if (!response || !response.success) {
        const errorMsg = response?.message || 'Login failed';
        console.error('❌ Login failed:', errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (!response.token) {
        console.error('❌ No token in response');
        setError('Authentication failed - no token received');
        toast.error('Authentication failed');
        return;
      }

      if (!response.admin) {
        console.error('❌ No admin data in response');
        setError('Authentication failed - no admin data');
        toast.error('Authentication failed');
        return;
      }

      console.log('✅ Login successful');
      console.log('👤 Admin:', response.admin);
      console.log('🎫 Token:', response.token.substring(0, 20) + '...');

      // Store in localStorage
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('admin', JSON.stringify(response.admin));

      console.log('💾 Stored in localStorage');

      // Update parent state
      setAdmin(response.admin);

      console.log('🔄 Updated parent state');

      // Show success
      toast.success(`Welcome back, ${response.admin.name}!`);

      // Navigate
      console.log('🚀 Navigating to dashboard...');
      navigate('/admin/dashboard', { replace: true });

    } catch (err) {
      console.error('❌ Admin login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-12 h-12 text-red-500" />
            <span className="text-3xl font-bold text-white">Admin Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Dealcross Admin</h1>
          <p className="text-red-200">Secure administrative access</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-red-900">
          
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="admin@dealcross.net"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Enter admin password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Admin Login
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-200 text-center">
              🔒 Authorized access only. All actions are logged.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-red-300 hover:text-white transition">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;