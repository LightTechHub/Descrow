// src/pages/Auth/CompleteProfilePage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, Mail, Phone, Globe, Building2, CheckCircle, Loader, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import { COUNTRIES, INDUSTRIES, COMPANY_TYPES, prepareUserPayload } from '../../constants';

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleData = location.state?.googleData;

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: googleData?.name || '',
    email: googleData?.email || '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    accountType: 'individual',
    companyName: '',
    companyType: '',
    industry: '',
    registrationNumber: '',
    agreedToTerms: false
  });

  useEffect(() => {
    if (!googleData) {
      navigate('/login');
    }
  }, [googleData, navigate]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(value)) {
          newErrors.password = 'Must contain uppercase letter';
        } else if (!/[a-z]/.test(value)) {
          newErrors.password = 'Must contain lowercase letter';
        } else if (!/[0-9]/.test(value)) {
          newErrors.password = 'Must contain number';
        } else {
          delete newErrors.password;
        }

        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{7,14}$/;
        if (!value) {
          newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(value.replace(/[\s()-]/g, ''))) {
          newErrors.phone = 'Invalid phone number';
        } else {
          delete newErrors.phone;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (type !== 'checkbox' && (name === 'password' || name === 'confirmPassword' || name === 'phone')) {
      validateField(name, newValue);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate password
    if (!formData.password || formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.phone) {
      toast.error('Phone number is required');
      return;
    }

    if (!formData.country) {
      toast.error('Country is required');
      return;
    }

    if (!formData.agreedToTerms) {
      toast.error('Please accept the Terms and Conditions');
      return;
    }

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix all errors');
      return;
    }

    try {
      setLoading(true);

      const payload = prepareUserPayload(formData, formData.accountType, {
        googleId: googleData.googleId,
        picture: googleData.picture,
        verified: true,
        authProvider: 'google'
      });

      console.log('📤 Submitting profile data:', payload);

      const response = await authService.completeGoogleProfile(payload);

      if (response.success) {
        toast.success('Welcome to Dealcross! 🎉');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (error) {
      console.error('❌ Complete profile error:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!googleData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set your password and complete your profile details
          </p>
        </div>

        {/* Profile Picture Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src={googleData.picture}
              alt={googleData.name}
              className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 space-y-6">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* Email (Locked) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email * (Verified)
            </label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Email verified by Google
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Create Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                required
                className={`w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.password}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              You'll use this password for login and security operations
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
                className={`w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
              required
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Country *
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Select country</option>
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Account Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, accountType: 'individual' }))}
                className={`p-4 border-2 rounded-lg transition ${
                  formData.accountType === 'individual'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <User className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-gray-900 dark:text-white">Individual</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Personal use</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, accountType: 'business' }))}
                className={`p-4 border-2 rounded-lg transition ${
                  formData.accountType === 'business'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <Building2 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-gray-900 dark:text-white">Business</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Company account</p>
              </button>
            </div>
          </div>

          {/* Business Fields */}
          {formData.accountType === 'business' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required={formData.accountType === 'business'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Type
                  </label>
                  <select
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select type</option>
                    {COMPANY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Industry
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registration Number (Optional)
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="Business registration number"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Terms */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              'Complete Profile'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;